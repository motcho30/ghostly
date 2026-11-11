import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ghost";
import { btn, card, cx, input } from "@/components/ui";
import { flags } from "@/lib/brand";
import type { PlanId } from "@/lib/db/schema";
import { unsign } from "@/lib/ids";
import { leadById, leadOffer } from "@/lib/leads";
import { pounds, termsFor } from "@/lib/pricing";
import { completeTestCheckout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Test checkout",
  robots: { index: false },
};

/** Stands in for Stripe until STRIPE_SECRET_KEY is set. No card details, ever. */
export default async function DevCheckout({
  searchParams,
}: PageProps<"/checkout/dev">) {
  if (flags.stripe()) notFound();
  const { t } = await searchParams;
  const data =
    typeof t === "string"
      ? unsign<{
          leadId: string;
          planId: PlanId;
          exp: number;
          pricePence: number;
          firstChargePence: number;
        }>(t)
      : null;
  if (!data || data.exp < Date.now()) notFound();
  const lead = await leadById(data.leadId);
  if (!lead) notFound();
  // Show the price fixed when checkout started, not today's.
  const base = leadOffer(lead, data.planId);
  const offer = {
    plan: base.plan,
    pricePence: data.pricePence,
    firstChargePence: data.firstChargePence,
    terms: termsFor(
      base.plan,
      data.firstChargePence,
      data.pricePence,
      new Date(),
    ),
  };

  return (
    <main className="glow flex min-h-dvh items-center justify-center p-4">
      <form
        action={completeTestCheckout}
        className={cx(card, "w-full max-w-[420px] p-6")}
      >
        <Logo />
        <p className="mt-5 rounded-xl border border-amber/40 bg-amber/10 p-3 text-[13px] text-amber">
          Test checkout. Stripe isn't connected yet, so no money moves and no
          card is needed.
        </p>
        <h1 className="mt-5 text-[22px] font-semibold">
          {offer.plan.label} plan
        </h1>
        <dl className="mt-3 space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Today</dt>
            <dd className="font-mono">{pounds(offer.firstChargePence)}</dd>
          </div>
          {offer.plan.per !== "once" && (
            <div className="flex justify-between">
              <dt className="text-muted">Then</dt>
              <dd className="font-mono">
                {pounds(offer.pricePence)} / {offer.plan.per}
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-[13px] text-muted">{offer.terms}</p>
        <input type="hidden" name="t" value={t as string} />
        <label className="mt-5 block text-[13px] text-muted" htmlFor="email">
          Email for your account
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={lead.email ?? ""}
          className={cx(input, "mt-1.5")}
        />
        <button type="submit" className={cx(btn.primary, "mt-5 w-full")}>
          Complete test payment
        </button>
      </form>
    </main>
  );
}
