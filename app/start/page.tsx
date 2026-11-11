import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Quiz } from "@/components/quiz";
import { anonId } from "@/lib/cookies";
import { assignArms, EXPERIMENTS } from "@/lib/experiments";
import { UK_CITIES, US_CITIES } from "@/lib/jobs/normalize";
import { currentLead } from "@/lib/leads";
import { screensFor } from "@/lib/quiz/config";
import {
  familyChips,
  SALARY_SCALE,
  salaryHistogram,
  siteStats,
} from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Get new roles first" };

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const sp = await searchParams;
  const lead = await currentLead();
  // Returning visitors who already gave an email go straight back to their result.
  if (lead?.email && sp.restart !== "1") redirect("/plan");

  const overrides = Object.fromEntries(
    Object.keys(EXPERIMENTS).map((k) => [
      k,
      typeof sp[`arm_${k}`] === "string"
        ? (sp[`arm_${k}`] as string)
        : undefined,
    ]),
  );
  const arms = assignArms(
    await anonId(),
    process.env.NODE_ENV === "production" ? {} : overrides,
  );
  const [stats, histGB, histUS, chips] = await Promise.all([
    siteStats(),
    salaryHistogram("GB"),
    salaryHistogram("US"),
    familyChips(),
  ]);

  // Hosting adds the visitor's country and city as headers; locally we fall back to the UK and London.
  const h = await headers();
  const country = h.get("x-vercel-ip-country") === "US" ? "US" : "GB";
  const ipCity = decodeURIComponent(
    h.get("x-vercel-ip-city") ?? "",
  ).toLowerCase();
  const pick = (list: readonly string[], fallback: string) =>
    list.find((c) => c.toLowerCase() === ipCity) ?? fallback;

  return (
    <Quiz
      screens={screensFor(arms.quiz)}
      arms={arms}
      stats={{
        liveRoles: stats.liveRoles,
        companies: stats.companies,
        fresh24: stats.fresh24,
        fresh7: stats.fresh7,
        over30: stats.over30,
        over30Per100: stats.over30Per100,
        highRisk: stats.highRisk,
        highRiskPer100: stats.highRiskPer100,
        staleOver60: stats.staleOver60,
      }}
      markets={{
        GB: {
          histogram: histGB,
          cities: [...UK_CITIES.slice(0, 8), "Remote UK"],
          defaultCity: pick(UK_CITIES, "London"),
          scale: SALARY_SCALE.GB,
        },
        US: {
          histogram: histUS,
          cities: [...US_CITIES.slice(0, 10), "Remote US"],
          defaultCity: pick(US_CITIES, "New York"),
          scale: SALARY_SCALE.US,
        },
      }}
      defaultCountry={country}
      chips={chips.slice(0, 12)}
    />
  );
}
