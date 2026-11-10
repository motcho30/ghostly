import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BRAND, siteUrl } from "@/lib/brand";
import { SESSION_COOKIE, secureCookie } from "@/lib/cookies";
import { getDb, schema } from "@/lib/db";
import { button, layout, p, sendEmail } from "@/lib/email";
import { sha256, shortId, token } from "@/lib/ids";

const { users, sessions, magicLinks, subscriptions } = schema;

export type User = typeof users.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

const SESSION_DAYS = 30;
const LINK_MINUTES = 30;

/** Paid and not paused. A cancelled plan keeps access until its period ends. */
export function hasAccess(
  sub: Subscription | null | undefined,
  now = new Date(),
): boolean {
  if (!sub) return false;
  if (
    sub.status === "lifetime" ||
    sub.status === "active" ||
    sub.status === "trialing"
  )
    return true;
  if (sub.status === "cancelled")
    return Boolean(sub.currentPeriodEnd && sub.currentPeriodEnd > now);
  return false;
}

export async function latestSubscription(
  userId: string,
): Promise<Subscription | null> {
  const db = await getDb();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return sub ?? null;
}

export async function currentUser(): Promise<{
  user: User;
  sub: Subscription | null;
} | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, sha256(raw)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { user: row.user, sub: await latestSubscription(row.user.id) };
}

/** For member pages: signed in and paid, or sent where they need to go. */
export async function requireMember() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!hasAccess(me.sub)) redirect("/app/account?locked=1");
  return me as { user: User; sub: Subscription };
}

/** Call only from a Server Action or Route Handler, where cookies can be set. */
export async function startSession(userId: string) {
  const db = await getDb();
  const raw = token();
  await db.insert(sessions).values({
    tokenHash: sha256(raw),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });
  (await cookies()).set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(raw)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function magicLinkUrl(email: string): Promise<string> {
  const db = await getDb();
  const raw = token();
  await db.insert(magicLinks).values({
    tokenHash: sha256(raw),
    email: email.toLowerCase(),
    expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000),
  });
  return `${siteUrl()}/auth/verify?token=${raw}`;
}

export async function sendMagicLink(email: string) {
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  if (!user) return;
  const url = await magicLinkUrl(user.email);
  await sendEmail({
    to: user.email,
    kind: "magic_link",
    subject: `Your ${BRAND.name} sign-in link`,
    html: layout(
      "Sign in to your live roles",
      `${p("Tap the button to sign in. The link works once and expires in 30 minutes.")}${button(url, "Sign in")}${p("Didn't ask for this? You can ignore it.")}`,
    ),
  });
}

export async function consumeMagicLink(raw: string): Promise<string | null> {
  const db = await getDb();
  const [link] = await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(magicLinks.tokenHash, sha256(raw)),
        isNull(magicLinks.usedAt),
        gt(magicLinks.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!link) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, link.email))
    .limit(1);
  return user?.id ?? null;
}

export async function upsertUser(
  email: string,
  name: string | null,
  leadId: string | null,
): Promise<User> {
  const db = await getDb();
  const clean = email.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, clean))
    .limit(1);
  if (existing) {
    if (leadId)
      await db
        .update(users)
        .set({ leadId, name: existing.name ?? name })
        .where(eq(users.id, existing.id));
    return { ...existing, leadId: leadId ?? existing.leadId };
  }
  const [created] = await db
    .insert(users)
    .values({ email: clean, name, leadId, referralCode: shortId(7) })
    .returning();
  return created;
}
