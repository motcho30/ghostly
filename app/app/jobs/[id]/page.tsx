import { and, eq } from "drizzle-orm";
import { ArrowLeft, Building2, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VerdictCard } from "@/components/ghost-badge";
import { ApplyBox, SaveButton } from "@/components/member";
import { card, cx } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { per100, postedLabel, remoteLabel } from "@/lib/format";
import { MIN_MEMBER_APPS } from "@/lib/ghost/score";
import { formatSalary } from "@/lib/jobs/normalize";
import { companyBySlug } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Role" };

export default async function JobPage({ params }: PageProps<"/app/jobs/[id]">) {
  const { user } = await requireMember();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [row] = await db
    .select({ job: schema.jobs, company: schema.companies })
    .from(schema.jobs)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.jobs.companyId))
    .where(eq(schema.jobs.id, id))
    .limit(1);
  if (!row) notFound();
  const { job, company } = row;
  const [stats, [saved], [logged]] = await Promise.all([
    companyBySlug(company.slug),
    db
      .select()
      .from(schema.savedJobs)
      .where(
        and(
          eq(schema.savedJobs.userId, user.id),
          eq(schema.savedJobs.jobId, id),
        ),
      )
      .limit(1),
    db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.userId, user.id),
          eq(schema.applications.jobId, id),
        ),
      )
      .limit(1),
  ]);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const closed = Boolean(job.closedAt);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" /> Live roles
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/companies/${company.slug}`}
            className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-text"
          >
            <Building2 className="h-4 w-4" /> {company.name}
          </Link>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
            {job.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted">
            {salary && <span className="font-medium text-text">{salary}</span>}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />{" "}
              {[job.locationText, remoteLabel[job.remote]]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />{" "}
              {postedLabel(job.postedAt ?? job.firstSeenAt)}
            </span>
          </div>
        </div>
        <SaveButton jobId={job.id} saved={Boolean(saved)} />
      </div>

      {closed && (
        <p className="mt-4 rounded-xl border border-coral/40 bg-coral/10 p-3 text-[14px] text-coral">
          The company took this ad down. It's no longer open.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className={cx(card, "p-5")}>
            <h2 className="font-semibold">The ad</h2>
            <div className="mt-3 max-h-[520px] overflow-y-auto whitespace-pre-line text-[14px] leading-relaxed text-muted">
              {job.descriptionText}
            </div>
          </div>
        </div>
        <aside className="order-first space-y-4 sm:order-none">
          {!closed && (
            <ApplyBox
              jobId={job.id}
              url={job.applyUrl}
              company={company.name}
              logged={Boolean(logged)}
            />
          )}
          <div className={cx(card, "p-5")}>
            <VerdictCard
              postedAt={job.postedAt ?? job.firstSeenAt}
              reasons={job.ghostReasons}
              score={job.ghostScore}
            />
            <Link
              href="/how-we-score"
              className="mt-4 inline-block text-[13px] text-faint underline"
            >
              How we judge timing
            </Link>
          </div>
          {stats && (
            <div className={cx(card, "p-4 text-[14px]")}>
              <h3 className="font-semibold">{company.name} in numbers</h3>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted">Live roles</dt>
                  <dd>{stats.open}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Typical ad age</dt>
                  <dd>{stats.medianAgeDays} days</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Ads over 60 days</dt>
                  <dd>{per100(stats.over60Share * 100, 100)} in 100</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Member reply rate</dt>
                  <dd>
                    {stats.memberApplied >= MIN_MEMBER_APPS
                      ? `${stats.memberReplied} of ${stats.memberApplied}`
                      : "Not enough data yet"}
                  </dd>
                </div>
              </dl>
              <Link
                href={`/companies/${company.slug}`}
                className="mt-3 inline-block text-[13px] text-faint underline"
              >
                Company page
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
