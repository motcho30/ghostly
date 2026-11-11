import type { Metadata } from "next";
import Link from "next/link";

import { CtaLink, ShareButtons, TrackView } from "@/components/client";
import { Eyebrow, Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { BRAND, siteUrl } from "@/lib/brand";
import { fmt } from "@/lib/format";
import { ghostIndex, siteStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Who's hiring right now in the UK and US",
  description:
    "UK and US employers ranked by how many new roles they posted this week, straight from their own careers pages. Updated every hour.",
};

type Row = Awaited<ReturnType<typeof ghostIndex>>[number];

const SORTS = {
  new: {
    label: "Most new this week",
    fn: (a: Row, b: Row) =>
      b.newThisWeek - a.newThisWeek || a.medianAgeDays - b.medianAgeDays,
  },
  fresh: {
    label: "Freshest ads",
    fn: (a: Row, b: Row) => a.medianAgeDays - b.medianAgeDays,
  },
  stale: {
    label: "Oldest ads",
    fn: (a: Row, b: Row) =>
      b.over60Share - a.over60Share || b.medianAgeDays - a.medianAgeDays,
  },
  size: { label: "Most live roles", fn: (a: Row, b: Row) => b.open - a.open },
};

export default async function HiringNow({
  searchParams,
}: PageProps<"/hiring-now">) {
  const sortKey = (await searchParams).sort;
  const sort =
    typeof sortKey === "string" && sortKey in SORTS
      ? (sortKey as keyof typeof SORTS)
      : "new";
  const [rows, stats] = await Promise.all([ghostIndex(5), siteStats()]);
  const sorted = [...rows].sort(SORTS[sort].fn);
  const p100 = (x: number) => Math.round(x * 100);

  return (
    <main className="glow flex min-h-dvh flex-col">
      <TrackView name="index_view" props={{ sort }} />
      <SiteHeader />
      <Section className="pt-6 pb-16">
        <Eyebrow>Updated every hour</Eyebrow>
        <h1 className="mt-2 text-[36px] font-semibold leading-tight tracking-tight">
          Who's hiring right now
        </h1>
        <p className="mt-2 max-w-2xl text-[16px] text-muted">
          {rows.length} employers with 5 or more live roles in the UK and US.{" "}
          {fmt(stats.fresh7)} new roles went live this week, and{" "}
          {fmt(stats.over30)} of {fmt(stats.liveRoles)} live ads are more than a
          month old, when most applications are long in.
        </p>
        <div className="mt-4">
          <ShareButtons
            url={`${siteUrl()}/hiring-now`}
            text="Which companies are actually hiring this week:"
            event="index_share"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(SORTS).map(([k, v]) => (
            <Link
              key={k}
              href={`?sort=${k}`}
              className={cx(
                "rounded-full border px-3.5 py-1.5 text-[13px]",
                sort === k
                  ? "border-mint bg-mint/10 text-text"
                  : "border-line text-muted hover:text-text",
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <div className={cx(card, "mt-4 overflow-x-auto")}>
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="text-[12px] uppercase tracking-wider text-faint">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Employer</th>
                <th className="px-4 py-3 text-right font-medium">
                  New this week
                </th>
                <th className="px-4 py-3 text-right font-medium">Live roles</th>
                <th className="px-4 py-3 text-right font-medium">
                  Typical ad age
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Over 60 days
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Salary shown
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-line/60 last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-mono text-faint">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/companies/${r.slug}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td
                    className={cx(
                      "px-4 py-3 text-right font-mono",
                      r.newThisWeek > 0 ? "text-mint" : "text-faint",
                    )}
                  >
                    {r.newThisWeek}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.open}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.medianAgeDays}d
                  </td>
                  <td
                    className={cx(
                      "px-4 py-3 text-right font-mono",
                      r.over60Share >= 0.5
                        ? "text-coral"
                        : r.over60Share >= 0.25
                          ? "text-amber"
                          : "text-muted",
                    )}
                  >
                    {p100(r.over60Share)} in 100
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {p100(r.salaryShare)} in 100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-faint">
          From each employer's public careers page. "Typical ad age" is the
          median days since an ad was first published. An old ad isn't proof a
          role is closed: some stay open for good reasons.{" "}
          <Link href="/how-we-score" className="underline">
            Method
          </Link>
          .
        </p>
        <div className="mt-8 text-center">
          <CtaLink href="/start" where="index" className={btn.primary}>
            {BRAND.cta}
          </CtaLink>
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
