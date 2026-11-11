import { desc, eq } from "drizzle-orm";

import { anonId } from "@/lib/cookies";
import { getDb, schema } from "@/lib/db";
import type { PlanId } from "@/lib/db/schema";
import type { Arms } from "@/lib/experiments";
import { INTRO_HOLD_MINUTES, offerFor } from "@/lib/pricing";
import type { Answers } from "@/lib/quiz/types";

const { leads, users } = schema;
export type Lead = typeof leads.$inferSelect;

export async function currentLead(): Promise<Lead | null> {
  const id = await anonId();
  if (id === "unknown") return null;
  const db = await getDb();
  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.anonId, id))
    .orderBy(desc(leads.updatedAt))
    .limit(1);
  return lead ?? null;
}

export async function leadById(id: string): Promise<Lead | null> {
  const db = await getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return lead ?? null;
}

/** A referral code only counts when it belongs to a real member. */
export async function validReferrer(
  code: string | null,
): Promise<string | null> {
  if (!code) return null;
  const db = await getDb();
  const [u] = await db
    .select({ code: users.referralCode })
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);
  return u?.code ?? null;
}

/** Holds the intro price for 24 hours from the first paywall view. The clock is the server's. */
export async function ensureIntroHold(lead: Lead): Promise<Lead> {
  if (lead.introExpiresAt) return lead;
  const db = await getDb();
  const [updated] = await db
    .update(leads)
    .set({ introExpiresAt: new Date(Date.now() + INTRO_HOLD_MINUTES * 60_000) })
    .where(eq(leads.id, lead.id))
    .returning();
  return updated;
}

export function leadOffer(lead: Lead, planId: PlanId, now = new Date()) {
  return offerFor(planId, {
    arms: lead.arms as Pick<Arms, "trial">,
    introActive: Boolean(lead.introExpiresAt && lead.introExpiresAt > now),
    laterActive: Boolean(
      lead.laterOfferExpiresAt && lead.laterOfferExpiresAt > now,
    ),
    referred: Boolean(lead.referredBy),
    now,
  });
}

export const answersOf = (lead: Lead | null | undefined): Answers =>
  (lead?.answers ?? {}) as Answers;
