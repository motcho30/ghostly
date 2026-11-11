import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Paywall } from "@/components/paywall";
import { currentUser, hasAccess } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { track } from "@/lib/events";
import { familyLabel } from "@/lib/jobs/families";
import { formatSalary, MARKET_NAME } from "@/lib/jobs/normalize";
import {
  answersOf,
  currentLead,
  ensureIntroHold,
  leadOffer,
} from "@/lib/leads";
import {
  countMatches,
  familyFor,
  freshCount,
  previewMatches,
  weeklyCounts,
} from "@/lib/match";
import { PLANS, pounds } from "@/lib/pricing";
import { PAIN_ECHO, type Segment } from "@/lib/quiz/segment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your live roles" };

const levelLabel: Record<string, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead",
  director: "Director+",
};
const settingLabel: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  office: "In the office",
  any: "Any setting",
};

function segmentCopy(
  segment: Segment,
  salary: number | undefined,
  sym: string,
  fresh48: number,
) {
  const weekly = salary ? Math.round(salary / 52) : null;
  switch (segment) {
    case "urgent":
      return {
        headline: "Stop getting ghosted.",
        line: weekly
          ? `Three more weeks of silence is about ${sym}${(weekly * 3).toLocaleString("en-GB")} of your target pay. Get new roles the hour they go live and be one of the first to apply.`
          : "Get new roles the hour they go live and be one of the first to apply.",
      };
    case "switcher":
      return {
        headline: "Get out before the crowd gets in.",
        line: "New roles that meet your salary, the hour they go live. Your search stays private: employers never see you here.",
      };
    case "senior":
      return {
        headline: "Skip the queue. Go straight to the company.",
        line: "Every role comes from the employer's own careers page, sent to you the hour it goes live. No recruiter in the middle.",
      };
    default:
      return {
        headline: "Be one of the first to apply.",
        line: fresh48
          ? `${fresh48} of your matches went live in the last 48 hours. Most people apply in a job's first few days, so this is your window.`
          : "New roles go live every day. Most people apply in a job's first few days, so getting there first matters.",
      };
  }
}

export default async function PlanPage() {
  const me = await currentUser();
  if (me && hasAccess(me.sub)) redirect("/app");
  const found = await currentLead();
  if (!found) redirect("/start");
  const lead = await ensureIntroHold(found);
  const a = answersOf(lead);

  const [count, preview, weeks, fresh48] = await Promise.all([
    countMatches(a),
    previewMatches(a, 6),
    weeklyCounts(a),
    freshCount(a, 48),
  ]);
  const fam = familyFor(a);
  const title = fam ? familyLabel(fam) : a.titleText || "matching";
  const sym = a.country === "US" ? "$" : "£";
  const place =
    a.setting === "remote" || a.city === "Remote UK"
      ? `across ${MARKET_NAME[a.country ?? "GB"]}`
      : `in or near ${a.city ?? "the UK"}`;
  const firstPain = Object.entries(a.pains ?? {}).find(([, yes]) => yes)?.[0];
  const copy = segmentCopy(lead.segment as Segment, a.salary, sym, fresh48);
  const now = new Date();
  const offers = PLANS.map((p) => leadOffer(lead, p.id, now));

  await track(
    "paywall_view",
    { segment: lead.segment, arms: lead.arms, count },
    { anonId: lead.anonId },
  );

  return (
    <Paywall
      name={lead.name}
      hasEmail={Boolean(lead.email)}
      count={count}
      title={title}
      place={place}
      fresh48={fresh48}
      weeks={weeks}
      headline={copy.headline}
      segmentLine={copy.line}
      painEcho={firstPain ? PAIN_ECHO[firstPain] : null}
      profile={
        [
          a.salary ? `Target ${sym}${Math.round(a.salary / 1000)}k+` : null,
          title,
          a.level ? levelLabel[a.level] : null,
          a.setting ? settingLabel[a.setting] : null,
          a.city && a.setting !== "remote" ? a.city : null,
        ].filter(Boolean) as string[]
      }
      topCompanies={[...new Set(preview.map((j) => j.company))].slice(0, 4)}
      topSalary={formatSalary(
        preview[0]?.salaryMin ?? null,
        preview[0]?.salaryMax ?? null,
        preview[0]?.currency,
      )}
      offers={offers.map((o) => ({
        id: o.plan.id,
        label: o.plan.label,
        badge: o.plan.badge ?? null,
        pitch: o.plan.pitch,
        per: o.plan.per,
        price: pounds(o.pricePence),
        listPrice:
          o.pricePence !== o.plan.pricePence ? pounds(o.plan.pricePence) : null,
        today: pounds(o.firstChargePence),
        intro: o.introLabel,
        terms: o.terms,
      }))}
      introUntil={
        lead.introExpiresAt && lead.introExpiresAt > now
          ? lead.introExpiresAt.toISOString()
          : null
      }
      introFree={offers[0].firstChargePence === 0}
      referred={Boolean(lead.referredBy)}
      laterState={
        lead.laterOfferExpiresAt
          ? lead.laterOfferExpiresAt > now
            ? "active"
            : "used"
          : "unused"
      }
      laterUntil={lead.laterOfferExpiresAt?.toISOString() ?? null}
      guarantee={BRAND.guarantee}
    />
  );
}
