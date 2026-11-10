import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaLink, ShareButtons, TrackView } from "@/components/client";
import { VerdictCard } from "@/components/ghost-badge";
import { Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { BRAND, siteUrl } from "@/lib/brand";
import type { CheckFacts } from "@/lib/check/run";
import { getCheck } from "@/lib/check/run";
import { verdictOf } from "@/lib/timing";

export const dynamic = "force-dynamic";

function verdictFor(c: NonNullable<Awaited<ReturnType<typeof getCheck>>>) {
  const facts = c.facts as CheckFacts;
  return verdictOf({
    postedAt: facts.postedAt ?? null,
    reasons: c.reasons,
    score: c.score,
    now: c.createdAt,
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/check/[id]">): Promise<Metadata> {
  const c = await getCheck((await params).id);
  if (!c) return { title: "Is it worth applying?" };
  const v = verdictFor(c);
  return {
    title: `${v.label}: ${c.title ?? "a job ad"}`,
    description: `${v.line} Checked free on ${BRAND.name}.`,
  };
}

export default async function CheckResult({
  params,
}: PageProps<"/check/[id]">) {
  const c = await getCheck((await params).id);
  if (!c) notFound();
  const facts = c.facts as CheckFacts;
  const v = verdictFor(c);
  const url = `${siteUrl()}/check/${c.id}`;
  return (
    <main className="glow flex min-h-dvh flex-col">
      <TrackView name="check_result_view" props={{ verdict: v.key }} />
      <SiteHeader />
      <Section className="max-w-xl pt-6 pb-16">
        <div className={cx(card, "p-6")}>
          <p className="text-[13px] text-muted">
            {[c.companyName, c.title].filter(Boolean).join(" · ") ||
              "Pasted job ad"}
          </p>
          <div className="mt-4">
            <VerdictCard
              postedAt={facts.postedAt ?? null}
              reasons={c.reasons}
              score={c.score}
              verdict={v}
            />
          </div>
          <p className="mt-5 text-[12px] text-faint">
            Based on public facts about the ad, checked{" "}
            {c.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
            .{" "}
            <Link href="/how-we-score" className="underline">
              How we judge it
            </Link>
          </p>
        </div>
        <div className="mt-5">
          <ShareButtons
            url={url}
            text={`"${v.label}" for this job. Check if yours is worth applying to:`}
            event="check_share"
          />
        </div>
        <div className={cx(card, "mt-6 p-5 text-center")}>
          <p className="font-semibold">Tired of applying too late?</p>
          <p className="mt-1 text-[14px] text-muted">
            Get new roles the hour they go live, straight from the company, so
            you're one of the first in.
          </p>
          <CtaLink
            href="/start"
            where="check_result"
            className={cx(btn.primary, "mt-4 w-full")}
          >
            {BRAND.cta}
          </CtaLink>
        </div>
        <Link
          href="/check"
          className={cx(btn.link, "mt-4 block text-center text-[14px]")}
        >
          Check another job
        </Link>
      </Section>
      <SiteFooter />
    </main>
  );
}
