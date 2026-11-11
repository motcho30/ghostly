"use client";

import {
  BellRing,
  Check,
  CreditCard,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { track } from "@/lib/track-client";
import { Countdown } from "./client";
import { GhostIcon } from "./ghost";
import { btn, card, cx, input } from "./ui";

type OfferView = {
  id: "weekly" | "monthly" | "lifetime";
  label: string;
  badge: string | null;
  pitch: string;
  per: "week" | "month" | "once";
  price: string;
  listPrice: string | null;
  today: string;
  intro: string | null;
  terms: string;
};

type Props = {
  name: string | null;
  hasEmail: boolean;
  count: number;
  title: string;
  place: string;
  fresh48: number;
  weeks: number[];
  headline: string;
  segmentLine: string;
  painEcho: string | null;
  profile: string[];
  topCompanies: string[];
  topSalary: string | null;
  offers: OfferView[];
  introUntil: string | null;
  introFree: boolean;
  referred: boolean;
  laterState: "unused" | "active" | "used";
  laterUntil: string | null;
  guarantee: string;
};

const fmt = (n: number) => n.toLocaleString("en-GB");

export function Paywall(p: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<OfferView["id"]>("weekly");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [laterOpen, setLaterOpen] = useState(false);
  const selected = p.offers.find((o) => o.id === plan) ?? p.offers[0];

  // Exit intent on desktop shows the one-time offer, once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the listener only needs to change with the offer state
  useEffect(() => {
    if (p.laterState !== "unused") return;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) openLater("exit_intent");
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [p.laterState]);

  async function openLater(trigger: string) {
    if (p.laterState !== "unused") {
      router.push("/");
      return;
    }
    setLaterOpen(true);
    track("later_offer_view", { trigger });
    await fetch("/api/later", { method: "POST" });
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    track("checkout_start", { plan });
    if (!p.hasEmail) {
      const r = await fetch("/api/lead", {
        method: "PATCH",
        body: JSON.stringify({ email: email.trim() }),
        headers: { "content-type": "application/json" },
      });
      if (!r.ok) {
        setError("Check that email address.");
        setBusy(false);
        return;
      }
    }
    const r = await fetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
      headers: { "content-type": "application/json" },
    });
    const json = (await r.json()) as { url?: string; error?: string };
    if (!r.ok || !json.url) {
      setError(json.error ?? "Checkout didn't start. Try again.");
      setBusy(false);
      return;
    }
    window.location.href = json.url;
  }

  const max = Math.max(1, ...p.weeks);
  const lastWeek = p.weeks[3] || p.weeks[2];

  const Plans = (
    <div
      className="space-y-2.5"
      role="radiogroup"
      aria-label="Choose your plan"
    >
      {p.offers.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: styled radio card
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={plan === o.id}
          onClick={() => {
            setPlan(o.id);
            track("plan_select", { plan: o.id });
          }}
          className={cx(
            "relative flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition",
            plan === o.id
              ? "border-mint bg-mint/[0.07]"
              : "border-line bg-surface hover:border-faint",
          )}
        >
          <span
            className={cx(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
              plan === o.id ? "border-mint" : "border-faint",
            )}
          >
            {plan === o.id && (
              <span className="h-2.5 w-2.5 rounded-full bg-mint" />
            )}
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2 font-semibold">
              {o.label}
              {o.badge && (
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    o.id === "weekly" ? "bg-mint text-bg" : "bg-violet text-bg",
                  )}
                >
                  {o.badge}
                </span>
              )}
            </span>
            <span className="text-[13px] text-muted">{o.intro ?? o.pitch}</span>
          </span>
          <span className="text-right">
            {o.intro ? (
              <>
                <span className="block font-mono text-[20px] font-semibold">
                  {o.today}
                </span>
                <span className="block text-[12px] text-muted">
                  then {o.price}/{o.per}
                </span>
              </>
            ) : (
              <>
                {o.listPrice && (
                  <span className="block text-[12px] text-faint line-through">
                    {o.listPrice}
                  </span>
                )}
                <span className="block font-mono text-[20px] font-semibold">
                  {o.price}
                </span>
                <span className="block text-[12px] text-muted">
                  {o.per === "once" ? "one time" : `per ${o.per}`}
                </span>
              </>
            )}
          </span>
        </button>
      ))}
    </div>
  );

  const Cta = (where: string) => (
    <div>
      {!p.hasEmail && where === "main" && (
        <input
          className={cx(input, "mb-3")}
          type="email"
          placeholder="Your email, for your sign-in link"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
      )}
      <button
        type="button"
        className={cx(btn.primary, "w-full py-4 text-[16px]")}
        onClick={checkout}
        disabled={busy || (!p.hasEmail && !email.includes("@"))}
      >
        <Lock className="h-4 w-4" />
        {p.count > 0
          ? `Unlock my ${fmt(p.count)} live roles`
          : "Start my alerts"}{" "}
        · {selected.today}
      </button>
      <p className="mt-2 text-center text-[12px] leading-relaxed text-muted">
        {selected.terms}
      </p>
      {error && (
        <p className="mt-2 text-center text-[14px] text-coral">{error}</p>
      )}
    </div>
  );

  return (
    <main className="glow min-h-dvh pb-16">
      <TopBar p={p} router={router} />

      <div className="mx-auto max-w-[460px] px-4 pt-6">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-mint">
          {p.name ? `${p.name}, your search is ready` : "Your search is ready"}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">
          We found <span className="text-mint">{fmt(p.count)}</span> live{" "}
          {p.title} roles {p.place}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {p.headline} {p.segmentLine}
        </p>

        <div id="plans" className="scroll-mt-16 pt-5">
          <h2 className="sr-only">Choose your plan</h2>
          {Plans}
          <div className="mt-4">{Cta("main")}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] text-muted">
            <span className="flex flex-col items-center gap-1">
              <CreditCard className="h-4 w-4" /> Secure payment by Stripe
            </span>
            <span className="flex flex-col items-center gap-1">
              <X className="h-4 w-4" /> Cancel in two clicks
            </span>
            <span className="flex flex-col items-center gap-1">
              <BellRing className="h-4 w-4" /> Reminder before renewals
            </span>
          </div>
        </div>

        <div className={cx(card, "mt-8 p-5")}>
          <h2 className="text-[17px] font-semibold leading-snug">
            Your search
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.profile.map((x) => (
              <span
                key={x}
                className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] text-muted"
              >
                {x}
              </span>
            ))}
          </div>
          {p.painEcho && (
            <p className="mt-4 border-t border-line pt-4 text-[14px] leading-relaxed text-muted">
              You said{" "}
              <span className="font-serif text-[16px] italic text-text">
                {p.painEcho}
              </span>{" "}
              is the worst part. Getting in early, straight to the company, is
              how you beat it.
            </p>
          )}
          {p.fresh48 > 0 && (
            <p className="mt-3 text-[14px] text-mint">
              <Sparkles className="mr-1 inline h-4 w-4" />
              {p.fresh48} of these went live in the last 48 hours.
            </p>
          )}
        </div>

        {/* Real weekly flow of matching roles */}
        <div className={cx(card, "mt-4 p-5")}>
          <div className="flex items-baseline justify-between">
            <p className="font-semibold">New matching roles each week</p>
            <p className="text-[12px] text-faint">still open today</p>
          </div>
          <div className="mt-4 flex h-28 items-end gap-3">
            {p.weeks.map((n, i) => (
              <div
                key={["w3", "w2", "w1", "w0"][i]}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span className="font-mono text-[13px] tabular-nums text-muted">
                  {n}
                </span>
                <div
                  className={cx(
                    "w-full rounded-t-lg",
                    i === 3 ? "bg-mint" : "bg-violet/50",
                  )}
                  style={{ height: `${Math.max(6, (n / max) * 80)}px` }}
                />
                <span className="text-[11px] text-faint">
                  {i === 3
                    ? "This week"
                    : `${3 - i} wk${3 - i > 1 ? "s" : ""} ago`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted">
            {lastWeek
              ? `About ${lastWeek} new roles a week for you lately, if hiring holds. A forecast, not a promise.`
              : "Quiet lately. We'll email you when new ones land."}
          </p>
        </div>

        <div className={cx(card, "mt-8 p-5")}>
          <h3 className="font-semibold">What you unlock</h3>
          <ul className="mt-3 space-y-2.5 text-[14px]">
            {[
              `All ${fmt(p.count)} live matches with apply links straight to the company`,
              "New matching roles emailed within the hour they go live",
              "When each role was really posted, and whether it's worth applying",
              "Your application tracker, with ghosting flagged after 21 days",
              "Company reply rates from members' own applications",
              "Stale and suspect ads hidden, so you don't waste an evening",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {p.topCompanies.length > 0 && (
          <p className="mt-6 text-center text-[14px] text-muted">
            Your matches include roles at{" "}
            <span className="text-text">{p.topCompanies.join(", ")}</span>
            {p.topSalary
              ? `, paying up to ${p.topSalary.split(" to ").pop()}`
              : ""}
            .
            <span className="mt-1 block text-[12px] text-faint">
              Not affiliated with any company shown.
            </span>
          </p>
        )}

        <div className={cx(card, "mt-6 flex gap-3 p-5")}>
          <ShieldCheck className="h-6 w-6 shrink-0 text-mint" />
          <p className="text-[14px] leading-relaxed text-muted">
            {p.guarantee}
          </p>
        </div>

        <div className={cx(card, "mt-4 flex gap-3 p-5")}>
          <GhostIcon className="h-6 w-6 shrink-0 text-violet" />
          <p className="text-[14px] leading-relaxed text-muted">
            No fake reviews or made-up member counts here. We're new, and every
            number on this page is counted live from today's roles.
          </p>
        </div>

        <div className="mt-8">{Cta("repeat")}</div>
        <button
          type="button"
          onClick={() => openLater("maybe_later")}
          className={cx(btn.link, "mt-4 w-full text-center text-[14px]")}
        >
          Maybe later
        </button>
      </div>

      {laterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Offer"
        >
          <div
            className={cx(card, "rise w-full max-w-[420px] p-6 text-center")}
          >
            <RefreshCw className="mx-auto h-8 w-8 text-violet" />
            <h2 className="mt-3 text-[22px] font-semibold">
              Before you go: 20% off, for good
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              Any plan, at 20% off for as long as you keep it. We hold it for
              you for 24 hours, then it's gone. We only offer this once.
            </p>
            <button
              type="button"
              className={cx(btn.primary, "mt-5 w-full")}
              onClick={() => {
                track("later_offer_accept");
                setLaterOpen(false);
                router.refresh();
              }}
            >
              Show me the prices
            </button>
            <button
              type="button"
              className={cx(btn.link, "mt-3 w-full text-[14px]")}
              onClick={() => {
                track("later_offer_decline");
                router.push("/");
              }}
            >
              No thanks
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * The bar at the top of the paywall. For the intro offer it is red, with a
 * flashing light and a countdown to the real deadline held on the server; when
 * it reaches zero the page reloads at full price.
 */
function TopBar({
  p,
  router,
}: {
  p: Props;
  router: ReturnType<typeof useRouter>;
}) {
  const weekly = p.offers.find((o) => o.id === "weekly");
  if (p.laterState === "active" && p.laterUntil) {
    return (
      <div className="sticky top-0 z-20 bg-coral px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-[460px] items-center justify-between gap-3 text-[13px] font-medium">
          <span className="flex items-center gap-2">
            <span className="flash h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
            20% off any plan ends in{" "}
            <Countdown
              until={p.laterUntil}
              onEnd={() => router.refresh()}
              className="font-bold"
            />
          </span>
          <a href="#plans" className="shrink-0 font-bold underline">
            Claim it
          </a>
        </div>
      </div>
    );
  }
  if (p.referred) {
    return (
      <div className="sticky top-0 z-20 bg-mint px-4 py-2.5 text-center text-[13px] font-medium text-white">
        A friend gave you your first week free
      </div>
    );
  }
  if (!p.introUntil || !weekly) return null;
  return (
    <div className="sticky top-0 z-20 bg-coral px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-[460px] items-center justify-between gap-3 text-[13px] font-medium">
        <span className="flex items-center gap-2">
          <span className="flash h-2.5 w-2.5 shrink-0 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]" />
          <span>
            Intro discount: first week <b>{weekly.today}</b> instead of{" "}
            <s className="opacity-80">{weekly.price}</s>. Ends in{" "}
            <Countdown
              until={p.introUntil}
              onEnd={() => router.refresh()}
              className="font-bold"
            />
          </span>
        </span>
        <a
          href="#plans"
          className="shrink-0 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-coral"
        >
          Claim it
        </a>
      </div>
    </div>
  );
}
