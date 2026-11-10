import type { PlanId } from "@/lib/db/schema";
import type { Arms } from "@/lib/experiments";

export type Plan = {
  id: PlanId;
  label: string;
  pricePence: number;
  per: "week" | "month" | "once";
  badge?: string;
  pitch: string;
};

/** UK prices. Weekly is the default pick, monthly sits between, lifetime is the anchor. */
export const PLANS: Plan[] = [
  {
    id: "weekly",
    label: "Weekly",
    pricePence: 700,
    per: "week",
    badge: "Most popular",
    pitch: "Try it for an active search",
  },
  {
    id: "monthly",
    label: "Monthly",
    pricePence: 1400,
    per: "month",
    pitch: "For a steady search",
  },
  {
    id: "lifetime",
    label: "Lifetime",
    pricePence: 3000,
    per: "once",
    badge: "Best value",
    pitch: "Pay once. Yours for good.",
  },
];

export const LATER_DISCOUNT_PCT = 20;
export const HOLD_HOURS = 24;

export type Offer = {
  plan: Plan;
  /** What we charge every period after any intro. */
  pricePence: number;
  /** What we charge today. */
  firstChargePence: number;
  /** Plain-words line about today's charge and what follows. */
  terms: string;
  introLabel: string | null;
};

export const pounds = (p: number) =>
  p % 100 === 0 ? `£${p / 100}` : `£${(p / 100).toFixed(2)}`;

type OfferContext = {
  arms: Pick<Arms, "trial">;
  introActive: boolean;
  laterActive: boolean;
  referred: boolean;
  now: Date;
};

function renewalDate(now: Date, plan: Plan): string {
  const d = new Date(now);
  if (plan.per === "week") d.setDate(d.getDate() + 7);
  if (plan.per === "month") d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The price for one plan, worked out on the server from the lead's own state. */
export function offerFor(planId: PlanId, ctx: OfferContext): Offer {
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const pricePence = ctx.laterActive
    ? Math.round((plan.pricePence * (100 - LATER_DISCOUNT_PCT)) / 100)
    : plan.pricePence;
  let firstChargePence = pricePence;
  let introLabel: string | null = null;
  if (plan.id === "weekly" && (ctx.referred || ctx.introActive)) {
    const free = ctx.referred || ctx.arms.trial === "free_week";
    firstChargePence = free ? 0 : 100;
    introLabel = ctx.referred
      ? "First week free, from a friend"
      : free
        ? "First week free"
        : "First week £1";
  }
  const then = renewalDate(ctx.now, plan);
  const terms =
    plan.per === "once"
      ? `${pounds(firstChargePence)} once. No renewals.`
      : firstChargePence !== pricePence
        ? `${pounds(firstChargePence)} today, then ${pounds(pricePence)} every ${plan.per} from ${then} until you cancel.`
        : `${pounds(pricePence)} today, then every ${plan.per} from ${then} until you cancel.`;
  return { plan, pricePence, firstChargePence, terms, introLabel };
}
