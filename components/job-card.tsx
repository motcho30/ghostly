import { Building2, MapPin } from "lucide-react";
import Link from "next/link";

import { remoteLabel } from "@/lib/format";
import { formatSalary } from "@/lib/jobs/normalize";
import type { JobCardData } from "@/lib/match";
import { TimingBadge, WarningTag, warnings } from "./ghost-badge";
import { cx } from "./ui";

export function JobCard({
  job,
  href,
  blurred = false,
  action,
  className,
}: {
  job: JobCardData;
  href?: string;
  blurred?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const place = [
    job.city ?? job.locationText?.split(/[;,]/)[0],
    remoteLabel[job.remote],
  ]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.company}</span>
          </div>
          <h3 className="mt-1 text-[16px] font-semibold leading-snug text-text">
            {job.title}
          </h3>
        </div>
        {action}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
        {salary && <span className="font-medium text-text">{salary}</span>}
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {place}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <TimingBadge postedAt={job.postedAt ?? job.firstSeenAt} />
        {warnings(job.ghostReasons ?? []).length > 0 ? (
          <WarningTag count={warnings(job.ghostReasons ?? []).length} />
        ) : (
          <span className="text-[12px] text-faint">
            Direct from the company
          </span>
        )}
      </div>
    </>
  );
  const cls = cx(
    "block rounded-2xl border border-line bg-surface p-4 transition",
    href && "hover:border-faint",
    className,
  );
  if (blurred) {
    return (
      <div className={cx(cls, "relative overflow-hidden")} aria-hidden="true">
        <div className="blurred">{body}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-bg/30">
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-muted">
            🔒 Unlock to see
          </span>
        </div>
      </div>
    );
  }
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
