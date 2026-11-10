import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import type { GhostReason, Level } from "@/lib/db/schema";
import { familyOf } from "@/lib/jobs/families";
import type { Answers } from "@/lib/quiz/types";

const { jobs, companies } = schema;

const LEVEL_BANDS: Record<Level, Level[]> = {
  entry: ["entry", "mid"],
  mid: ["mid", "senior"],
  senior: ["senior", "lead", "mid"],
  lead: ["lead", "senior", "director"],
  director: ["director", "lead"],
};

const escapeLike = (s: string) => s.replace(/[%_\\]/g, (m) => `\\${m}`);

/** The family to filter on: a chip, or a typed title that maps to one. */
export function familyFor(a: Answers): string | null {
  if (a.family) return a.family;
  if (a.titleText) {
    const f = familyOf(a.titleText);
    return f === "other" ? null : f;
  }
  return null;
}

/** SQL filters for one person's answers. Open roles only; high-risk ones out unless asked. */
export function matchWhere(
  a: Answers,
  opts: { includeHigh?: boolean; includeClosed?: boolean } = {},
): SQL {
  const c: (SQL | undefined)[] = [];
  if (!opts.includeClosed) c.push(isNull(jobs.closedAt));
  if (!opts.includeHigh) c.push(ne(jobs.ghostBand, "high"));
  if (a.workType && a.workType !== "any") c.push(eq(jobs.workType, a.workType));
  else if (a.level !== "entry") c.push(ne(jobs.workType, "internship"));
  if (a.salary)
    c.push(
      or(
        isNull(jobs.salaryMax),
        gte(jobs.salaryMax, Math.round(a.salary * 0.9)),
      ),
    );
  if (a.setting === "remote") c.push(eq(jobs.remote, "remote"));
  else if (a.setting === "hybrid")
    c.push(inArray(jobs.remote, ["hybrid", "remote"]));
  else if (a.setting === "office")
    c.push(inArray(jobs.remote, ["on_site", "hybrid"]));
  if (a.level) c.push(inArray(jobs.level, LEVEL_BANDS[a.level]));
  const family = familyFor(a);
  if (family) c.push(eq(jobs.family, family));
  else if (a.titleText?.trim())
    c.push(ilike(jobs.title, `%${escapeLike(a.titleText.trim())}%`));
  if (a.city && a.city !== "Remote UK" && a.setting !== "remote") {
    c.push(or(eq(jobs.city, a.city), eq(jobs.remote, "remote")));
  }
  return and(...c.filter(Boolean)) as SQL;
}

export async function countMatches(a: Answers): Promise<number> {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(matchWhere(a));
  return r.n;
}

export type JobCardData = {
  id: number;
  title: string;
  company: string;
  companySlug: string;
  city: string | null;
  locationText: string | null;
  remote: string;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: Date | null;
  firstSeenAt: Date;
  ghostScore: number;
  ghostBand: "low" | "medium" | "high";
  ghostReasons?: GhostReason[];
};

export const cardColumns = {
  id: jobs.id,
  title: jobs.title,
  company: companies.name,
  companySlug: companies.slug,
  city: jobs.city,
  locationText: jobs.locationText,
  remote: jobs.remote,
  salaryMin: jobs.salaryMin,
  salaryMax: jobs.salaryMax,
  postedAt: jobs.postedAt,
  firstSeenAt: jobs.firstSeenAt,
  ghostScore: jobs.ghostScore,
  ghostBand: jobs.ghostBand,
  ghostReasons: jobs.ghostReasons,
};

export const freshest = sql`coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) desc`;

/** Best matches first: roles still in the early window, salaried ones, then newest. */
export async function previewMatches(
  a: Answers,
  limit = 3,
): Promise<JobCardData[]> {
  const db = await getDb();
  return db
    .select(cardColumns)
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(matchWhere(a))
    .orderBy(
      // Inside the early window first, then salary shown, then newest.
      sql`(coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) < now() - interval '4 days')`,
      sql`(${jobs.salaryMin} is null)`,
      freshest,
    )
    .limit(limit);
}

/** Matching roles posted in each of the last four weeks that are still open. */
export async function weeklyCounts(a: Answers): Promise<number[]> {
  const db = await getDb();
  const rows = await db
    .select({
      w: sql<number>`floor(extract(epoch from (now() - coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}))) / 604800)::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(jobs)
    .where(
      and(
        matchWhere(a, { includeHigh: true }),
        sql`coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) > now() - interval '28 days'`,
      ),
    )
    .groupBy(sql`1`);
  const out = [0, 0, 0, 0];
  for (const r of rows) if (r.w >= 0 && r.w < 4) out[3 - r.w] = r.n;
  return out;
}

export async function freshCount(a: Answers, hours: number): Promise<number> {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(
      and(
        matchWhere(a),
        sql`coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) > now() - make_interval(hours => ${hours})`,
      ),
    );
  return r.n;
}

/** The feed inside the app. */
export async function feed(
  a: Answers,
  opts: {
    includeHigh: boolean;
    page: number;
    pageSize?: number;
    jobIds?: number[];
    /** Only roles posted in the last N days. */
    postedWithinDays?: number;
  },
): Promise<{ jobs: JobCardData[]; total: number }> {
  const db = await getDb();
  const size = opts.pageSize ?? 30;
  const where = opts.jobIds
    ? and(
        isNull(jobs.closedAt),
        inArray(jobs.id, opts.jobIds.length ? opts.jobIds : [-1]),
      )
    : and(
        matchWhere(a, { includeHigh: opts.includeHigh }),
        opts.postedWithinDays
          ? sql`coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) > now() - make_interval(days => ${opts.postedWithinDays})`
          : undefined,
      );
  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(where);
  const rows = await db
    .select(cardColumns)
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(where)
    .orderBy(freshest, desc(jobs.id))
    .limit(size)
    .offset((opts.page - 1) * size);
  return { jobs: rows, total: count.n };
}
