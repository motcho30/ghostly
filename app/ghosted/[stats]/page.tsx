import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CtaLink, ShareButtons, TrackView } from "@/components/client";
import { GhostIcon } from "@/components/ghost";
import { Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { BRAND, siteUrl } from "@/lib/brand";
import { cardLines, parseCard } from "@/lib/ghost-card";
import { validReferrer } from "@/lib/leads";
import { siteStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/ghosted/[stats]">): Promise<Metadata> {
  const c = parseCard((await params).stats);
  if (!c) return { title: "Ghost Count" };
  const l = cardLines(c);
  return {
    title: l.headline,
    description: `${l.sub} What's your Ghost Count?`,
  };
}

export default async function GhostedCard({
  params,
  searchParams,
}: PageProps<"/ghosted/[stats]">) {
  const { stats: slug } = await params;
  const c = parseCard(slug);
  if (!c) notFound();
  const raw = (await searchParams).ref;
  // Only a real member's code earns the free week, so only then do we promise it.
  const ref = await validReferrer(
    typeof raw === "string" && /^[a-z0-9]{4,16}$/i.test(raw) ? raw : null,
  );
  const refQs = ref ? `?ref=${ref}` : "";
  const l = cardLines(c);
  const stats = await siteStats();
  const url = `${siteUrl()}/ghosted/${slug}${refQs}`;

  return (
    <main className="glow flex min-h-dvh flex-col">
      <TrackView name="ghostcard_view" props={{ referred: Boolean(refQs) }} />
      <SiteHeader />
      <Section className="max-w-xl pt-6 pb-16">
        <div className={cx(card, "overflow-hidden p-8 text-center")}>
          <GhostIcon className="float mx-auto h-16 w-16 text-violet" />
          <p className="mt-4 text-[13px] uppercase tracking-[0.16em] text-muted">
            Ghost Count
          </p>
          <div className="font-mono text-[88px] font-semibold leading-none tabular-nums">
            {l.big}
          </div>
          <h1 className="mt-3 text-[28px] font-semibold">{l.headline}</h1>
          {l.sub && <p className="mt-2 text-[15px] text-muted">{l.sub}</p>}
        </div>

        <div className="mt-5">
          <ShareButtons
            url={url}
            text={`${l.headline}. What's your Ghost Count?`}
            image={`/ghosted/${slug}/story`}
            event="ghostcard_share"
          />
        </div>

        <div className={cx(card, "mt-6 p-6")}>
          <h2 className="text-[20px] font-semibold">
            Most of that isn't about you
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Most applications land in a job's first few days, so applying late
            puts you at the back of a pile nobody reads. {BRAND.name} sends you
            new roles the hour they go live on the company's own site, so you're
            one of the first in.
          </p>
          <CtaLink
            href={`/start${refQs}`}
            where="ghostcard"
            className={cx(btn.primary, "mt-5 w-full")}
          >
            Get my Ghost Count
          </CtaLink>
          {refQs && (
            <p className="mt-2 text-center text-[13px] text-mint">
              You were invited: your first week is free.
            </p>
          )}
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
