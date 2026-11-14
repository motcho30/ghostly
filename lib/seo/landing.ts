import { and, desc, eq, isNull, ne, type SQL, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { cardColumns, freshest, type JobCardData } from "@/lib/match";
import {
  familyBySlug,
  MIN_INDEXED_ROLES,
  PLACES,
  type Place,
  placeBySlug,
  ROLE_FAMILIES,
  type RoleFamily,
} from "@/lib/seo/places";
import { cached } from "@/lib/stats";

const { jobs, companies } = schema;
const posted = sql`coalesce(${jobs.postedAt}, ${jobs.firstSeenAt})`;

/** Live roles a visitor would see: open, and not flagged as a likely dead ad. */
const LIVE = and(isNull(jobs.closedAt), ne(jobs.ghostBand, "high")) as SQL;

function placeWhere(p: Place): SQL {
  const c: SQL[] = [eq(jobs.country, p.market)];
  if (p.kind === "remote") c.push(eq(jobs.remote, "remote"));
  if (p.kind === "city" && p.city) c.push(eq(jobs.city, p.city));
  return and(...c) as SQL;
}

function where(family?: RoleFamily, place?: Place): SQL {
  const c: SQL[] = [LIVE];
  if (family) c.push(eq(jobs.family, family.id));
  if (place) c.push(placeWhere(place));
  return and(...c) as SQL;
}

type Cell = {
  family: string;
  country: string;
  city: string | null;
  remote: string;
  n: number;
};

/** Live role counts by family, country, city and remote, for the hub, links and sitemap. */
function cells(): Promise<Cell[]> {
  return cached("seo:cells", 30 * 60_000, async () => {
    const db = await getDb();
    return db
      .select({
        family: jobs.family,
        country: jobs.country,
        city: jobs.city,
        remote: jobs.remote,
        n: sql<number>`count(*)::int`,
      })
      .from(jobs)
      .where(LIVE)
      .groupBy(jobs.family, jobs.country, jobs.city, jobs.remote);
  });
}

const inPlace = (c: Cell, p: Place) =>
  c.country === p.market &&
  (p.kind === "country" ||
    (p.kind === "remote" && c.remote === "remote") ||
    (p.kind === "city" && c.city === p.city));

export type Counts = {
  count: (family?: RoleFamily, place?: Place) => number;
};

export async function liveCounts(): Promise<Counts> {
  const rows = await cells();
  return {
    count: (family, place) =>
      rows
        .filter(
          (c) =>
            (!family || c.family === family.id) &&
            (!place || inPlace(c, place)),
        )
        .reduce((s, c) => s + c.n, 0),
  };
}

/** Every family and place page worth listing, for the sitemap and IndexNow. */
export async function indexablePaths(): Promise<string[]> {
  const { count } = await liveCounts();
  const out: string[] = [];
  for (const p of PLACES)
    if (count(undefined, p) >= MIN_INDEXED_ROLES) out.push(`/jobs/${p.slug}`);
  for (const f of ROLE_FAMILIES) {
    if (count(f) >= MIN_INDEXED_ROLES) out.push(`/jobs/${f.slug}`);
    for (const p of PLACES)
      if (count(f, p) >= MIN_INDEXED_ROLES)
        out.push(`/jobs/${f.slug}/${p.slug}`);
  }
  return out;
}

export type Salary = { currency: string; median: number; n: number };

export type Landing = {
  live: number;
  fresh24: number;
  fresh7: number;
  companies: number;
  salaried: number;
  salaries: Salary[];
  jobs: JobCardData[];
  top: { name: string; slug: string; n: number }[];
};

const LIST_SIZE = 12;

export function landing(family?: RoleFamily, place?: Place): Promise<Landing> {
  const key = `seo:landing:${family?.slug ?? ""}:${place?.slug ?? ""}`;
  return cached(key, 10 * 60_000, async () => {
    const db = await getDb();
    const w = where(family, place);
    const [[s], salaries, list, top] = await Promise.all([
      db
        .select({
          live: sql<number>`count(*)::int`,
          fresh24: sql<number>`count(*) filter (where ${posted} > now() - interval '24 hours')::int`,
          fresh7: sql<number>`count(*) filter (where ${posted} > now() - interval '7 days')::int`,
          companies: sql<number>`count(distinct ${jobs.companyId})::int`,
          salaried: sql<number>`count(${jobs.salaryMin})::int`,
        })
        .from(jobs)
        .where(w),
      db
        .select({
          currency: jobs.currency,
          median: sql<number>`round(percentile_cont(0.5) within group (order by (${jobs.salaryMin} + coalesce(${jobs.salaryMax}, ${jobs.salaryMin})) / 2.0))::int`,
          n: sql<number>`count(*)::int`,
        })
        .from(jobs)
        .where(and(w, sql`${jobs.salaryMin} is not null`))
        .groupBy(jobs.currency),
      db
        .select(cardColumns)
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(w)
        .orderBy(freshest)
        .limit(LIST_SIZE),
      db
        .select({
          name: companies.name,
          slug: companies.slug,
          n: sql<number>`count(*)::int`,
        })
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(w)
        .groupBy(companies.id)
        .orderBy(desc(sql`count(*)`))
        .limit(8),
    ]);
    return { ...s, salaries, jobs: list, top };
  });
}

/** Resolve /jobs/[a] or /jobs/[a]/[b] to a family and a place. Undefined means 404. */
export function resolve(
  a: string,
  b?: string,
): { family?: RoleFamily; place?: Place } | undefined {
  if (b) {
    const family = familyBySlug(a);
    const place = placeBySlug(b);
    return family && place ? { family, place } : undefined;
  }
  const place = placeBySlug(a);
  if (place) return { place };
  const family = familyBySlug(a);
  return family ? { family } : undefined;
}
