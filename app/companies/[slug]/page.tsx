import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaLink, TrackView } from "@/components/client";
import { TimingBadge } from "@/components/ghost-badge";
import { Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { currentUser, hasAccess } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { MIN_MEMBER_APPS } from "@/lib/ghost/score";
import { companyBySlug, companyJobs } from "@/lib/stats";

export const dynamic = "force-dynamic";

const PUBLIC_ROWS = 10;

export async function generateMetadata({
  params,
}: PageProps<"/companies/[slug]">): Promise<Metadata> {
  const c = await companyBySlug((await params).slug);
  if (!c) return { title: "Company" };
  return {
    title: `Does ${c.name} reply? New roles and reply rates`,
    description: `${c.open} live roles at ${c.name}. Typical ad is ${c.medianAgeDays} days old. See which ones are fresh before you apply.`,
  };
}

export default async function CompanyPage({
  params,
}: PageProps<"/companies/[slug]">) {
  const c = await companyBySlug((await params).slug);
  if (!c) notFound();
  const [jobs, me] = await Promise.all([companyJobs(c.id), currentUser()]);
  const member = me && hasAccess(me.sub);
  const shown = member ? jobs : jobs.slice(0, PUBLIC_ROWS);
  const enoughMembers = c.memberApplied >= MIN_MEMBER_APPS;

  return (
    <main className="glow flex min-h-dvh flex-col">
      <TrackView name="company_view" props={{ slug: c.slug }} />
      <SiteHeader />
      <Section className="max-w-3xl pt-6 pb-16">
        <Link
          href="/hiring-now"
          className="text-[14px] text-muted hover:text-text"
        >
          Hiring now
        </Link>
        <h1 className="mt-2 text-[34px] font-semibold tracking-tight">
          {c.name}
        </h1>
        <p className="text-[15px] text-muted">
          Live UK roles from {c.name}'s own careers page, checked today.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [String(c.open), "live roles"],
            [`${c.medianAgeDays} days`, "typical ad age"],
            [
              `${Math.round(c.over60Share * 100)} in 100`,
              "ads over 60 days old",
            ],
            [`${Math.round(c.salaryShare * 100)} in 100`, "ads show a salary"],
          ].map(([n, l]) => (
            <div key={l} className={cx(card, "p-4")}>
              <div className="font-mono text-[22px] font-semibold">{n}</div>
              <div className="text-[13px] text-muted">{l}</div>
            </div>
          ))}
        </div>

        <div className={cx(card, "mt-3 p-5")}>
          <h2 className="font-semibold">Do they reply?</h2>
          <p className="mt-1 text-[15px] text-muted">
            {enoughMembers
              ? `Members heard back on ${c.memberReplied} of ${c.memberApplied} applications to ${c.name} that had at least ${BRAND.ghostAfterDays} days to get an answer.`
              : `Not enough member applications yet to say. We show a reply rate once ${MIN_MEMBER_APPS} or more have had ${BRAND.ghostAfterDays} days to get an answer.`}
          </p>
        </div>

        <h2 className="mt-8 text-[20px] font-semibold">Live roles</h2>
        <ul className={cx(card, "mt-3 divide-y divide-line")}>
          {shown.map((j) => (
            <li key={j.id}>
              <Link
                href={member ? `/app/jobs/${j.id}` : "/start"}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-2"
              >
                <span>
                  <span className="block font-medium">{j.title}</span>
                  <span className="text-[13px] text-muted">
                    {j.city ?? j.locationText?.split(/[;,]/)[0]}
                  </span>
                </span>
                <TimingBadge postedAt={j.postedAt ?? j.firstSeenAt} />
              </Link>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-5 py-4 text-muted">
              No live UK roles right now.
            </li>
          )}
        </ul>
        {!member && jobs.length > PUBLIC_ROWS && (
          <div className="mt-4 text-center">
            <p className="text-[14px] text-muted">
              {jobs.length - PUBLIC_ROWS} more live roles here, with apply links
              and the reasons behind every score.
            </p>
            <CtaLink
              href="/start"
              where="company"
              className={cx(btn.primary, "mt-3")}
            >
              {BRAND.cta}
            </CtaLink>
          </div>
        )}
        <p className="mt-6 text-[12px] text-faint">
          Figures come from {c.name}'s public careers page and members' own
          tracking. Timing labels are a guide, not a claim about the employer.
          Not affiliated with {c.name}.
        </p>
      </Section>
      <SiteFooter />
    </main>
  );
}
