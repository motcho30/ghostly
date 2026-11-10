import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { magicLinkUrl, type User, upsertUser } from "@/lib/auth";
import { BRAND, flags, siteUrl } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";
import type { PlanId } from "@/lib/db/schema";
import { button, layout, p, sendEmail } from "@/lib/email";
import { track } from "@/lib/events";
import { sign } from "@/lib/ids";
import { type Lead, leadById, leadOffer } from "@/lib/leads";
import { pounds } from "@/lib/pricing";
import { productFields, STRIPE_SAVE_COUPON } from "@/lib/stripe-catalog";

const { subscriptions, users, referrals } = schema;

// ---------- Stripe over plain HTTPS, so there is no SDK to keep in step ----------

async function stripe<T = Record<string, unknown>>(
  path: string,
  form: Record<string, string | number | undefined>,
  method = "POST",
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form))
    if (v !== undefined) body.append(k, String(v));
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body,
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok)
    throw new Error(`Stripe ${path}: ${json.error?.message ?? res.status}`);
  return json;
}

/** Stripe's webhook signature check (v1 scheme, 5 minute tolerance). */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  now = Date.now(),
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const want = createHmac("sha256", secret)
    .update(`${t}.${payload}`)
    .digest("hex");
  return header
    .split(",")
    .filter((kv) => kv.startsWith("v1="))
    .some((kv) => {
      const got = Buffer.from(kv.slice(3));
      const exp = Buffer.from(want);
      return got.length === exp.length && timingSafeEqual(got, exp);
    });
}

/** Where to send the buyer: Stripe Checkout when it is set up, the test checkout when not. */
export async function checkoutUrl(lead: Lead, planId: PlanId): Promise<string> {
  const offer = leadOffer(lead, planId);
  if (!flags.stripe()) {
    return `/checkout/dev?t=${sign({ leadId: lead.id, planId, exp: Date.now() + 30 * 60_000 })}`;
  }
  const { plan } = offer;
  const recurring = plan.per !== "once";
  const form: Record<string, string | number | undefined> = {
    mode: recurring ? "subscription" : "payment",
    success_url: `${siteUrl()}/api/checkout/claim?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/plan`,
    customer_email: lead.email ?? undefined,
    "metadata[leadId]": lead.id,
    "metadata[plan]": plan.id,
    "metadata[pricePence]": offer.pricePence,
    "metadata[firstChargePence]": offer.firstChargePence,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": offer.pricePence,
    ...productFields(0, plan.id, `${BRAND.name} ${plan.label}`),
  };
  if (recurring) {
    form["line_items[0][price_data][recurring][interval]"] = plan.per;
    form["subscription_data[metadata][leadId]"] = lead.id;
    if (offer.firstChargePence < offer.pricePence) {
      // Intro week: the plan starts after a 7 day trial, and the £1 (if any) is a one-off on the first invoice.
      form["subscription_data[trial_period_days]"] = 7;
      if (offer.firstChargePence > 0) {
        form["line_items[1][quantity]"] = 1;
        form["line_items[1][price_data][currency]"] = "gbp";
        form["line_items[1][price_data][unit_amount]"] = offer.firstChargePence;
        Object.assign(form, productFields(1, "first_week", "First week"));
      } else {
        form.payment_method_collection = "always";
      }
    }
  }
  const session = await stripe<{ url: string }>("checkout/sessions", form);
  return session.url;
}

function periodEnd(planId: PlanId, from: Date): Date | null {
  const d = new Date(from);
  if (planId === "weekly") d.setDate(d.getDate() + 7);
  else if (planId === "monthly") d.setMonth(d.getMonth() + 1);
  else return null;
  return d;
}

/**
 * Turns a payment into an account: pay first, account from the payment email.
 * Safe to call twice for the same payment (Stripe retries webhooks).
 */
export async function fulfil(input: {
  leadId: string;
  planId: PlanId;
  email: string;
  provider: "stripe" | "dev";
  providerRef: string;
  pricePence: number;
  firstChargePence: number;
}): Promise<User> {
  const db = await getDb();
  const lead = await leadById(input.leadId);
  const user = await upsertUser(input.email, lead?.name ?? null, input.leadId);
  const [dupe] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerRef, input.providerRef))
    .limit(1);
  if (dupe) return user;

  const now = new Date();
  const status =
    input.planId === "lifetime"
      ? "lifetime"
      : input.firstChargePence < input.pricePence
        ? "trialing"
        : "active";
  await db.insert(subscriptions).values({
    userId: user.id,
    plan: input.planId,
    status,
    pricePence: input.pricePence,
    firstChargePence: input.firstChargePence,
    currentPeriodEnd: periodEnd(input.planId, now),
    provider: input.provider,
    providerRef: input.providerRef,
  });

  if (lead?.referredBy) await rewardReferrer(lead.referredBy, user.id);

  const url = await magicLinkUrl(user.email);
  await sendEmail({
    to: user.email,
    kind: "welcome",
    subject: `You're in. Your live roles are ready`,
    html: layout(
      `Welcome${user.name ? `, ${user.name}` : ""}`,
      `${p("Every role comes straight from a company careers page with the real posting date. We'll email new matches within the hour we find them, so you can be one of the first to apply.")}${button(url, "See my live roles")}${p(status === "lifetime" ? `You paid ${pounds(input.firstChargePence)} once. No renewals.` : `You paid ${pounds(input.firstChargePence)} today. Your plan then renews at ${pounds(input.pricePence)} a ${input.planId === "weekly" ? "week" : "month"}. Cancel any time in two clicks from your account page.`)}`,
    ),
  });
  await track(
    "paid",
    {
      plan: input.planId,
      firstChargePence: input.firstChargePence,
      pricePence: input.pricePence,
      segment: lead?.segment,
      arms: lead?.arms,
    },
    { anonId: lead?.anonId, userId: user.id },
  );
  return user;
}

/** The referrer gets a free week: their current period moves on by 7 days. */
async function rewardReferrer(code: string, referredUserId: string) {
  const db = await getDb();
  const [referrer] = await db
    .select()
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);
  if (!referrer || referrer.id === referredUserId) return;
  await db.insert(referrals).values({
    referrerUserId: referrer.id,
    referredUserId,
    status: "rewarded",
  });
  await db
    .update(users)
    .set({ freeWeeks: sql`${users.freeWeeks} + 1` })
    .where(eq(users.id, referrer.id));
  await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: sql`${subscriptions.currentPeriodEnd} + interval '7 days'`,
    })
    .where(eq(subscriptions.userId, referrer.id));
  // TODO when Stripe is live: also push the referrer's next invoice back with trial_end.
}

// ---------- Plan changes from the cancel flow ----------

export type Sub = typeof subscriptions.$inferSelect;

export async function cancelPlan(sub: Sub, reason: string) {
  if (sub.provider === "stripe" && sub.providerRef?.startsWith("sub_")) {
    await stripe(`subscriptions/${sub.providerRef}`, {
      cancel_at_period_end: "true",
    });
  }
  const db = await getDb();
  await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelReason: reason, cancelledAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
}

export async function pausePlan(sub: Sub) {
  const until = new Date(Date.now() + 30 * 86_400_000);
  if (sub.provider === "stripe" && sub.providerRef?.startsWith("sub_")) {
    await stripe(`subscriptions/${sub.providerRef}`, {
      "pause_collection[behavior]": "void",
      "pause_collection[resumes_at]": Math.floor(until.getTime() / 1000),
    });
  }
  const db = await getDb();
  // The paused month is free, so the next payment moves back by the same 30 days.
  await db
    .update(subscriptions)
    .set({
      status: "paused",
      pausedUntil: until,
      currentPeriodEnd: sql`${subscriptions.currentPeriodEnd} + interval '30 days'`,
    })
    .where(eq(subscriptions.id, sub.id));
}

export async function resumePlan(sub: Sub) {
  if (sub.provider === "stripe" && sub.providerRef?.startsWith("sub_")) {
    await stripe(`subscriptions/${sub.providerRef}`, { pause_collection: "" });
  }
  const db = await getDb();
  // Back early: hand back the unused part of the pause, so the next payment comes forward again.
  await db
    .update(subscriptions)
    .set({
      status: "active",
      pausedUntil: null,
      currentPeriodEnd: sql`${subscriptions.currentPeriodEnd} - greatest(${subscriptions.pausedUntil} - now(), interval '0')`,
    })
    .where(eq(subscriptions.id, sub.id));
}

export async function discountNextPayment(sub: Sub, pct: number) {
  if (sub.provider === "stripe" && sub.providerRef?.startsWith("sub_")) {
    // Reuse the one save-offer coupon; only make a new one if it isn't configured.
    const coupon =
      pct === 50 && STRIPE_SAVE_COUPON
        ? { id: STRIPE_SAVE_COUPON }
        : await stripe<{ id: string }>("coupons", {
            percent_off: pct,
            duration: "once",
            name: `Save offer ${pct}%`,
          });
    await stripe(`subscriptions/${sub.providerRef}`, {
      "discounts[0][coupon]": coupon.id,
    });
  }
  const db = await getDb();
  await db
    .update(subscriptions)
    .set({ nextDiscountPct: pct })
    .where(eq(subscriptions.id, sub.id));
}

/** Stripe events we act on. */
export async function handleStripeEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}) {
  const o = event.data.object;
  if (event.type === "checkout.session.completed") {
    const md = o.metadata as Record<string, string>;
    const details = o.customer_details as { email?: string } | undefined;
    const email = details?.email ?? (o.customer_email as string);
    if (!md?.leadId || !email) return;
    await fulfil({
      leadId: md.leadId,
      planId: md.plan as PlanId,
      email,
      provider: "stripe",
      providerRef: (o.subscription as string) || (o.id as string),
      pricePence: Number(md.pricePence),
      firstChargePence: Number(md.firstChargePence),
    });
  }
  if (event.type === "customer.subscription.deleted") {
    const db = await getDb();
    await db
      .update(subscriptions)
      .set({ status: "cancelled", currentPeriodEnd: new Date() })
      .where(eq(subscriptions.providerRef, o.id as string));
  }
  if (event.type === "invoice.paid") {
    const subId = o.subscription as string | undefined;
    const end = (o.lines as { data?: { period?: { end?: number } }[] })
      ?.data?.[0]?.period?.end;
    if (subId && end) {
      const db = await getDb();
      await db
        .update(subscriptions)
        .set({
          status: sql`case when ${subscriptions.status} = 'cancelled' then ${subscriptions.status} else 'active' end`,
          currentPeriodEnd: new Date(end * 1000),
          nextDiscountPct: 0,
        })
        .where(eq(subscriptions.providerRef, subId));
    }
  }
}

/**
 * The Stripe success page: confirm the session really paid and belongs to this
 * browser's lead, make sure the account exists (the webhook may be slower than
 * the redirect), then sign the buyer in.
 */
export async function claimStripeSession(
  sessionId: string,
  leadId: string,
): Promise<User | null> {
  if (!flags.stripe() || !/^cs_[\w]+$/.test(sessionId)) return null;
  const s = await stripe<{
    id: string;
    status: string;
    payment_status: string;
    subscription?: string | null;
    customer_details?: { email?: string };
    metadata?: Record<string, string>;
  }>(`checkout/sessions/${sessionId}`, {}, "GET");
  const md = s.metadata ?? {};
  if (
    s.status !== "complete" ||
    md.leadId !== leadId ||
    !s.customer_details?.email
  )
    return null;
  return fulfil({
    leadId,
    planId: md.plan as PlanId,
    email: s.customer_details.email,
    provider: "stripe",
    providerRef: s.subscription || s.id,
    pricePence: Number(md.pricePence),
    firstChargePence: Number(md.firstChargePence),
  });
}
