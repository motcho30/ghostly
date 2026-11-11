import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { SaveButton } from "@/components/member";
import { btn, cx } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fmt } from "@/lib/format";
import { FAMILIES } from "@/lib/jobs/families";
import { CITIES } from "@/lib/jobs/normalize";
import { answersOf, leadById } from "@/lib/leads";
import { feed } from "@/lib/match";
import type { Answers, Setting } from "@/lib/quiz/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live roles" };

const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function Feed({ searchParams }: PageProps<"/app">) {
  const { user } = await requireMember();
  const sp = await searchParams;
  const saved = await (await getDb())
    .select({ jobId: schema.savedJobs.jobId })
    .from(schema.savedJobs)
    .where(eq(schema.savedJobs.userId, user.id));
  const savedIds = new Set(saved.map((s) => s.jobId));

  // The member's quiz answers are the default search; the filters below override them.
  const base = user.leadId ? answersOf(await leadById(user.leadId)) : {};
  const a: Answers = {
    ...base,
    family: one(sp.family) ?? base.family,
    titleText: one(sp.family) ? undefined : base.titleText,
    city: one(sp.city) ?? base.city,
    setting: (one(sp.setting) as Setting) ?? base.setting,
    salary: one(sp.salary) ? Number(one(sp.salary)) || undefined : base.salary,
    country:
      one(sp.country) === "US"
        ? "US"
        : one(sp.country) === "GB"
          ? "GB"
          : (base.country ?? "GB"),
  };
  // Switching country drops the other country's city and salary.
  if (one(sp.country) && one(sp.country) !== (base.country ?? "GB")) {
    if (!one(sp.city)) a.city = undefined;
    if (!one(sp.salary)) a.salary = undefined;
  }
  const market = a.country ?? "GB";
  const sym = market === "US" ? "$" : "£";
  if (one(sp.family) === "all") {
    a.family = undefined;
    a.titleText = undefined;
  }
  if (one(sp.city) === "anywhere") a.city = undefined;
  const includeHigh = one(sp.risk) === "all";
  const onlySaved = one(sp.saved) === "1";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const postedRaw = Number(one(sp.posted));
  const postedWithinDays = [1, 3, 7].includes(postedRaw)
    ? postedRaw
    : undefined;
  const result = await feed(a, {
    includeHigh,
    page,
    postedWithinDays,
    jobIds: onlySaved ? [...savedIds] : undefined,
  });
  const qs = (patch: Record<string, string>) =>
    `?${new URLSearchParams({ ...(sp as Record<string, string>), ...patch }).toString()}`;

  const select =
    "rounded-full border border-line bg-surface px-3 py-2 text-[13px] text-text outline-none focus:border-mint";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">
            {onlySaved ? "Saved roles" : "Your live roles"}
          </h1>
          <p className="text-[14px] text-muted">
            {fmt(result.total)} roles ·{" "}
            {includeHigh
              ? "including high-risk ads"
              : "stale and suspect ads hidden"}{" "}
            · newest first
          </p>
        </div>
        <Link
          href={onlySaved ? "/app" : "?saved=1"}
          className={cx(btn.ghost, "px-4 py-2 text-[13px]")}
        >
          {onlySaved ? "All roles" : `Saved (${savedIds.size})`}
        </Link>
      </div>

      {!onlySaved && (
        <form className="mt-4 flex flex-wrap gap-2" action="/app">
          <select
            name="family"
            defaultValue={a.family ?? "all"}
            className={select}
            aria-label="Role"
          >
            <option value="all">All roles</option>
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            name="country"
            defaultValue={market}
            className={select}
            aria-label="Country"
          >
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
          </select>
          <select
            name="city"
            defaultValue={a.city ?? "anywhere"}
            className={select}
            aria-label="City"
          >
            <option value="anywhere">
              Anywhere in {market === "US" ? "the US" : "the UK"}
            </option>
            {CITIES[market].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="setting"
            defaultValue={a.setting ?? "any"}
            className={select}
            aria-label="Work setting"
          >
            <option value="any">Any setting</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid or remote</option>
            <option value="office">Office or hybrid</option>
          </select>
          <select
            name="salary"
            defaultValue={String(a.salary ?? "")}
            className={select}
            aria-label="Minimum salary"
          >
            <option value="">Any salary</option>
            {[
              ...new Set([
                ...(market === "US"
                  ? [50, 75, 100, 125, 150, 175, 200, 250]
                  : [30, 40, 50, 60, 75, 90, 110, 130]),
                ...(a.salary ? [Math.round(a.salary / 1000)] : []),
              ]),
            ]
              .sort((x, y) => x - y)
              .map((k) => (
                <option key={k} value={k * 1000}>
                  {sym}
                  {k}k+
                </option>
              ))}
          </select>
          <select
            name="posted"
            defaultValue={String(postedWithinDays ?? "")}
            className={select}
            aria-label="Posted"
          >
            <option value="">Posted any time</option>
            <option value="1">Last 24 hours</option>
            <option value="3">Last 3 days</option>
            <option value="7">Last 7 days</option>
          </select>
          <select
            name="risk"
            defaultValue={includeHigh ? "all" : "live"}
            className={select}
            aria-label="Stale ads"
          >
            <option value="live">Hide stale and suspect ads</option>
            <option value="all">Show everything</option>
          </select>
          <button
            type="submit"
            className={cx(btn.white, "px-4 py-2 text-[13px]")}
          >
            Update
          </button>
        </form>
      )}
      <p className="mt-2 text-[12px] text-faint">
        Roles with no salary in the ad stay in when you filter by salary, so you
        don't miss them.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {result.jobs.map((j) => (
          <JobCard
            key={j.id}
            job={j}
            href={`/app/jobs/${j.id}`}
            action={<SaveButton jobId={j.id} saved={savedIds.has(j.id)} />}
          />
        ))}
      </div>
      {result.jobs.length === 0 && (
        <div className="mt-10 text-center text-muted">
          <p>Nothing live for this search right now.</p>
          <Link
            href="/app?family=all&city=anywhere"
            className={cx(btn.ghost, "mt-4")}
          >
            Widen the search
          </Link>
        </div>
      )}
      <div className="mt-6 flex justify-center gap-2">
        {page > 1 && (
          <Link href={qs({ page: String(page - 1) })} className={btn.ghost}>
            Newer
          </Link>
        )}
        {page * 30 < result.total && (
          <Link href={qs({ page: String(page + 1) })} className={btn.ghost}>
            Older roles
          </Link>
        )}
      </div>
    </>
  );
}
