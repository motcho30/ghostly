import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { FAMILIES } from "@/lib/jobs/families";
import { cardColumns, freshest, type JobCardData } from "@/lib/match";
import type { QuizStats } from "@/lib/quiz/types";

const { jobs, companies, applications, ingestRuns } = schema;

const age = sql`extract(epoch from (now() - coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}))) / 86400`;

type Cached<T> = { at: number; value: T };
// On globalThis so pages and the cron route share one cache: the cron route clears it after an import.
const g = globalThis as unknown as {
  __ghostlessStats?: Map<string, Cached<unknown>>;
};
if (!g.__ghostlessStats) g.__ghostlessStats = new Map();
const cache = g.__ghostlessStats;
async function cached<T>(
  key: string,
  ms: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key) as Cached<T> | undefined;
  if (hit && Date.now() - hit.at < ms) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export type SiteStats = QuizStats & {
  fresh48: number;
  liveGB: number;
  liveUS: number;
  medianAgeDays: number;
  lastIngestAt: Date | null;
};

/** Headline numbers for the landing page and quiz. All counted live, never typed in. */
export function siteStats(): Promise<SiteStats> {
  return cached("site", 5 * 60_000, async () => {
    const db = await getDb();
    const [r] = await db
      .select({
        live: sql<number>`count(*)::int`,
        liveGB: sql<number>`count(*) filter (where ${jobs.country} = 'GB')::int`,
        liveUS: sql<number>`count(*) filter (where ${jobs.country} = 'US')::int`,
        companies: sql<number>`count(distinct ${jobs.companyId})::int`,
        fresh24: sql<number>`count(*) filter (where ${age} <= 1)::int`,
        fresh7: sql<number>`count(*) filter (where ${age} <= 7)::int`,
        over30: sql<number>`count(*) filter (where ${age} > 30)::int`,
        fresh48: sql<number>`count(*) filter (where ${age} <= 2)::int`,
        high: sql<number>`count(*) filter (where ${jobs.ghostBand} = 'high')::int`,
        over60: sql<number>`count(*) filter (where ${age} > 60)::int`,
        median: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${age}), 0)::float`,
      })
      .from(jobs)
      .where(isNull(jobs.closedAt));
    const [run] = await db
      .select({ at: ingestRuns.finishedAt })
      .from(ingestRuns)
      .where(isNotNull(ingestRuns.finishedAt))
      .orderBy(sql`${ingestRuns.finishedAt} desc`)
      .limit(1);
    return {
      liveRoles: r.live,
      liveGB: r.liveGB,
      liveUS: r.liveUS,
      companies: r.companies,
      fresh24: r.fresh24,
      fresh7: r.fresh7,
      over30: r.over30,
      over30Per100: r.live ? Math.round((r.over30 / r.live) * 100) : 0,
      fresh48: r.fresh48,
      highRisk: r.high,
      highRiskPer100: r.live ? Math.round((r.high / r.live) * 100) : 0,
      staleOver60: r.over60,
      medianAgeDays: Math.round(r.median),
      lastIngestAt: run?.at ?? null,
    };
  });
}

/** Salaries in live ads, in £5k buckets from £20k to £150k, for the quiz slider. */
/** Salary range and bucket size of the quiz slider, per market. */
export const SALARY_SCALE = {
  GB: { min: 20_000, max: 150_000, step: 5_000, start: 45_000, sym: "£" },
  US: { min: 30_000, max: 290_000, step: 10_000, start: 90_000, sym: "$" },
} as const;

/** Salaries in live ads, in 26 buckets across the market's slider range. */
export function salaryHistogram(market: "GB" | "US" = "GB"): Promise<number[]> {
  const sc = SALARY_SCALE[market];
  return cached(`hist:${market}`, 30 * 60_000, async () => {
    const db = await getDb();
    const rows = await db
      .select({
        b: sql<number>`width_bucket((${jobs.salaryMin} + coalesce(${jobs.salaryMax}, ${jobs.salaryMin})) / 2, ${sc.min}, ${sc.max}, 26)::int`,
        n: sql<number>`count(*)::int`,
      })
      .from(jobs)
      .where(
        and(
          isNull(jobs.closedAt),
          isNotNull(jobs.salaryMin),
          eq(jobs.country, market),
        ),
      )
      .groupBy(sql`1`);
    const out = new Array(26).fill(0);
    for (const r of rows) if (r.b >= 1 && r.b <= 26) out[r.b - 1] = r.n;
    return out;
  });
}

/** Role families ranked by live roles, for the title chips. */
export function familyChips(): Promise<
  { id: string; label: string; n: number }[]
> {
  return cached("chips", 30 * 60_000, async () => {
    const db = await getDb();
    const rows = await db
      .select({ family: jobs.family, n: sql<number>`count(*)::int` })
      .from(jobs)
      .where(and(isNull(jobs.closedAt), ne(jobs.ghostBand, "high")))
      .groupBy(jobs.family);
    const counts = new Map(rows.map((r) => [r.family, r.n]));
    return FAMILIES.map((f) => ({
      id: f.id,
      label: f.label,
      n: counts.get(f.id) ?? 0,
    }))
      .filter((f) => f.n > 0)
      .sort((a, b) => b.n - a.n);
  });
}

/** Fresh, salaried, low-risk roles for the landing page hero. */
export function showcaseJobs(limit = 3): Promise<JobCardData[]> {
  return cached(`showcase:${limit}`, 10 * 60_000, async () => {
    const db = await getDb();
    return db
      .selectDistinctOn([jobs.companyId], cardColumns)
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(
        and(
          isNull(jobs.closedAt),
          eq(jobs.ghostBand, "low"),
          isNotNull(jobs.salaryMin),
          // Clean examples only: no warning signs beyond the posting date itself.
          sql`not exists (select 1 from jsonb_array_elements(${jobs.ghostReasons}) r where (r->>'points')::int > 0 and r->>'key' not in ('age', 'no_date', 'fresh'))`,
        ),
      )
      .orderBy(jobs.companyId, freshest)
      .then((rows) =>
        rows
          .sort(
            (a, b) =>
              (b.postedAt ?? b.firstSeenAt).getTime() -
              (a.postedAt ?? a.firstSeenAt).getTime(),
          )
          .slice(0, limit),
      );
  });
}

export type CompanyStats = {
  id: number;
  slug: string;
  name: string;
  open: number;
  medianAgeDays: number;
  over60Share: number;
  newThisWeek: number;
  salaryShare: number;
  reposted: number;
  highShare: number;
  memberApplied: number;
  memberReplied: number;
};

const companyStatsSelect = {
  id: companies.id,
  slug: companies.slug,
  name: companies.name,
  open: sql<number>`count(${jobs.id})::int`,
  medianAgeDays: sql<number>`coalesce(round(percentile_cont(0.5) within group (order by ${age})), 0)::int`,
  over60Share: sql<number>`coalesce(avg(case when ${age} > 60 then 1.0 else 0 end), 0)::float`,
  newThisWeek: sql<number>`count(*) filter (where ${age} <= 7)::int`,
  salaryShare: sql<number>`coalesce(avg(case when ${jobs.salaryMin} is not null then 1.0 else 0 end), 0)::float`,
  reposted: sql<number>`count(*) filter (where ${jobs.repostCount} > 0)::int`,
  highShare: sql<number>`coalesce(avg(case when ${jobs.ghostBand} = 'high' then 1.0 else 0 end), 0)::float`,
};

async function memberCounts() {
  const db = await getDb();
  const rows = await db
    .select({
      companyId: applications.companyId,
      applied: sql<number>`count(*) filter (where ${applications.status} <> 'applied' or ${applications.appliedAt} < now() - interval '21 days')::int`,
      replied: sql<number>`count(*) filter (where ${applications.status} in ('heard_back','interviewing','offer','rejected'))::int`,
    })
    .from(applications)
    .where(isNotNull(applications.companyId))
    .groupBy(applications.companyId);
  return new Map(rows.map((r) => [r.companyId as number, r]));
}

/** Every company with at least `minOpen` live UK roles, for the Hiring now page. */
export function ghostIndex(minOpen = 5): Promise<CompanyStats[]> {
  return cached(`index:${minOpen}`, 10 * 60_000, async () => {
    const db = await getDb();
    const rows = await db
      .select(companyStatsSelect)
      .from(companies)
      .innerJoin(
        jobs,
        and(eq(jobs.companyId, companies.id), isNull(jobs.closedAt)),
      )
      .groupBy(companies.id)
      .having(sql`count(${jobs.id}) >= ${minOpen}`);
    const m = await memberCounts();
    return rows.map((r) => ({
      ...r,
      memberApplied: m.get(r.id)?.applied ?? 0,
      memberReplied: m.get(r.id)?.replied ?? 0,
    }));
  });
}

export async function companyBySlug(
  slug: string,
): Promise<CompanyStats | null> {
  const db = await getDb();
  const [r] = await db
    .select(companyStatsSelect)
    .from(companies)
    .leftJoin(
      jobs,
      and(eq(jobs.companyId, companies.id), isNull(jobs.closedAt)),
    )
    .where(eq(companies.slug, slug))
    .groupBy(companies.id);
  if (!r) return null;
  const m = (await memberCounts()).get(r.id);
  return {
    ...r,
    memberApplied: m?.applied ?? 0,
    memberReplied: m?.replied ?? 0,
  };
}

export async function companyJobs(
  companyId: number,
  limit = 200,
): Promise<JobCardData[]> {
  const db = await getDb();
  return db
    .select(cardColumns)
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(and(eq(jobs.companyId, companyId), isNull(jobs.closedAt)))
    .orderBy(freshest)
    .limit(limit);
}

export function clearStatsCache() {
  cache.clear();
}
