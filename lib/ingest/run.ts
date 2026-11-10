import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { scoreGhost } from "@/lib/ghost/score";
import {
  type Board,
  BoardMissing,
  fetchBoard,
  loadBoards,
  type Posting,
} from "@/lib/ingest/ats";
import { isExcludedEmployer } from "@/lib/ingest/excluded";
import { scanWorkable } from "@/lib/ingest/workable";
import { familyOf } from "@/lib/jobs/families";
import {
  cityOf,
  isUkLocation,
  levelOf,
  normTitle,
  remoteOf,
  ukPlaces,
  workTypeOf,
} from "@/lib/jobs/normalize";

const {
  companies,
  jobs,
  applications,
  ingestRuns,
  boards: boardsTable,
  sourceState,
} = schema;

const CONCURRENCY = 8;
const REPOST_WINDOW_DAYS = 120;
/** A full Workable scan (which can close vanished ads) runs at most this often. */
const FULL_SCAN_HOURS = 20;
/** The daily Workable scan covers ads posted in this many days. */
const FULL_SCAN_DAYS = 30;
/** Ads older than this are almost never a live opening, so we don't store them at all. */
export const MAX_AGE_DAYS = 180;

function freshEnough(p: Posting, now: Date): boolean {
  return (
    !p.postedAt ||
    now.getTime() - p.postedAt.getTime() <= MAX_AGE_DAYS * 86_400_000
  );
}
/** Boards that are gone this many runs in a row stop being read. */
const MAX_FAILS = 5;

export type IngestSummary = {
  boardsOk: number;
  boardsFailed: number;
  boardsRetired: number;
  jobsSeen: number;
  jobsNew: number;
  jobsClosed: number;
  workable: {
    mode: "full" | "recent" | "off";
    pages: number;
    seen: number;
    new: number;
    closed: number;
    complete: boolean;
    agenciesSkipped: number;
  };
  failed: string[];
  ms: number;
};

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

/** Copy data/boards.json into the boards table. Discovered boards are added by lib/ingest/discover.ts. */
export async function syncSeedBoards() {
  const db = await getDb();
  const seeds = loadBoards();
  for (let i = 0; i < seeds.length; i += 200) {
    await db
      .insert(boardsTable)
      .values(
        seeds.slice(i, i + 200).map((b) => ({
          ats: b.ats,
          slug: b.slug,
          name: b.name,
          origin: "seed",
        })),
      )
      .onConflictDoNothing();
  }
  return seeds.length;
}

async function getState(key: string): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(sourceState)
    .where(eq(sourceState.key, key))
    .limit(1);
  return row?.value ?? null;
}

async function setState(key: string, value: Record<string, unknown>) {
  const db = await getDb();
  await db
    .insert(sourceState)
    .values({ key, value })
    .onConflictDoUpdate({
      target: sourceState.key,
      set: { value, updatedAt: new Date() },
    });
}

/**
 * One import: every active employer board, then Workable. Hourly runs read only
 * Workable's last two days; a full scan runs when asked or after 20 hours, and
 * is the only Workable run allowed to close ads that vanished.
 */
export async function runIngest(
  opts: { only?: string[]; full?: boolean; workable?: boolean } = {},
): Promise<IngestSummary> {
  const t0 = Date.now();
  const db = await getDb();
  const runStart = new Date();
  const [run] = await db
    .insert(ingestRuns)
    .values({})
    .returning({ id: ingestRuns.id });
  await syncSeedBoards();
  let boards = (
    await db.select().from(boardsTable).where(eq(boardsTable.active, true))
  ).map((b) => ({ ...b, ats: b.ats as Board["ats"] }));
  if (opts.only?.length)
    boards = boards.filter((b) => opts.only?.includes(b.slug));
  const excluded = boards.filter((b) => isExcludedEmployer(b.name, b.slug));
  if (excluded.length) {
    await db
      .update(boardsTable)
      .set({ active: false })
      .where(
        inArray(
          boardsTable.id,
          excluded.map((b) => b.id),
        ),
      );
    boards = boards.filter((b) => !excluded.includes(b));
  }

  const summary: IngestSummary = {
    boardsOk: 0,
    boardsFailed: 0,
    boardsRetired: 0,
    jobsSeen: 0,
    jobsNew: 0,
    jobsClosed: 0,
    workable: {
      mode: "off",
      pages: 0,
      seen: 0,
      new: 0,
      closed: 0,
      complete: false,
      agenciesSkipped: 0,
    },
    failed: [],
    ms: 0,
  };

  await pool(boards, CONCURRENCY, async (board) => {
    let postings: Posting[];
    const companyId = await upsertCompany({
      name: board.name,
      ats: board.ats,
      boardSlug: board.slug,
    });
    try {
      const known = await knownIds(companyId, board.ats);
      postings = await fetchBoard(board, known);
    } catch (e) {
      summary.boardsFailed++;
      const gone = e instanceof BoardMissing;
      summary.failed.push(`${board.ats}:${board.slug}${gone ? " (gone)" : ""}`);
      const fails = board.failCount + 1;
      const retire = gone && fails >= MAX_FAILS;
      if (retire) summary.boardsRetired++;
      await db
        .update(boardsTable)
        .set({ failCount: fails, active: !retire })
        .where(eq(boardsTable.id, board.id));
      return;
    }
    const uk = postings.filter(
      (p) =>
        isUkLocation(p.locationText, p.country) &&
        (p.known || p.descriptionText.length > 0) &&
        freshEnough(p, runStart),
    );
    const res = await storePostings(companyId, uk, runStart);
    summary.boardsOk++;
    summary.jobsSeen += uk.length;
    summary.jobsNew += res.inserted;
    await db
      .update(boardsTable)
      .set({ failCount: 0, lastOkAt: runStart, ukRoles: uk.length })
      .where(eq(boardsTable.id, board.id));
    // Close what this board no longer lists. Only for boards that answered, and only their own ads.
    const closed = await db
      .update(jobs)
      .set({ closedAt: runStart })
      .where(
        and(
          eq(jobs.companyId, companyId),
          eq(jobs.source, board.ats),
          isNull(jobs.closedAt),
          lt(jobs.lastSeenAt, runStart),
        ),
      )
      .returning({ id: jobs.id });
    summary.jobsClosed += closed.length;
  });

  if (opts.workable !== false && !opts.only?.length) {
    const last = await getState("workable_full");
    const lastAt = typeof last?.at === "string" ? new Date(last.at) : null;
    const full =
      opts.full ||
      !lastAt ||
      Date.now() - lastAt.getTime() > FULL_SCAN_HOURS * 3_600_000;
    try {
      const scan = await scanWorkable({
        dayRange: full ? FULL_SCAN_DAYS : 2,
        patient: full,
      });
      if (scan.rateLimited)
        summary.failed.push(
          `workable (rate limited after ${scan.pages} pages, kept what was read)`,
        );
      summary.workable = {
        mode: full ? "full" : "recent",
        pages: scan.pages,
        seen: scan.postings.length,
        new: 0,
        closed: 0,
        complete: scan.complete,
        agenciesSkipped: scan.agenciesSkipped,
      };
      const byCompany = new Map<string, Posting[]>();
      for (const p of scan.postings) {
        const name = p.companyName ?? "Unknown";
        if (isExcludedEmployer(name) || !freshEnough(p, runStart)) continue;
        byCompany.set(name, [...(byCompany.get(name) ?? []), p]);
      }
      for (const [name, list] of byCompany) {
        const companyId = await upsertCompany({
          name,
          ats: "workable",
          boardSlug: slugify(name),
        });
        const res = await storePostings(companyId, list, runStart);
        summary.workable.new += res.inserted;
      }
      if (full && scan.complete) {
        // A complete 30-day scan: anything not seen has been taken down, or is over 30 days old.
        const closed = await db
          .update(jobs)
          .set({ closedAt: runStart })
          .where(
            and(
              eq(jobs.source, "workable"),
              isNull(jobs.closedAt),
              lt(jobs.lastSeenAt, runStart),
            ),
          )
          .returning({ id: jobs.id });
        summary.workable.closed = closed.length;
        await setState("workable_full", {
          at: runStart.toISOString(),
          seen: scan.postings.length,
          pages: scan.pages,
        });
      }
    } catch (e) {
      summary.failed.push(
        `workable (${e instanceof Error ? e.message : "failed"})`,
      );
    }
    summary.jobsSeen += summary.workable.seen;
    summary.jobsNew += summary.workable.new;
    summary.jobsClosed += summary.workable.closed;
  }

  summary.jobsClosed += await sweep(runStart);
  await rescoreOpenJobs();
  summary.ms = Date.now() - t0;
  await db
    .update(ingestRuns)
    .set({
      finishedAt: new Date(),
      boardsOk: summary.boardsOk,
      boardsFailed: summary.boardsFailed,
      jobsSeen: summary.jobsSeen,
      jobsNew: summary.jobsNew,
      jobsClosed: summary.jobsClosed,
    })
    .where(eq(ingestRuns.id, run.id));
  return summary;
}

/** Close what should no longer show: ads past the age limit, and anything from a blocked employer. */
async function sweep(now: Date): Promise<number> {
  const db = await getDb();
  const old = await db
    .update(jobs)
    .set({ closedAt: now })
    .where(
      and(
        isNull(jobs.closedAt),
        sql`coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) < now() - make_interval(days => ${MAX_AGE_DAYS})`,
      ),
    )
    .returning({ id: jobs.id });
  const all = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.boardSlug,
    })
    .from(companies);
  const blocked = all
    .filter((c) => isExcludedEmployer(c.name, c.slug))
    .map((c) => c.id);
  const gone = blocked.length
    ? await db
        .update(jobs)
        .set({ closedAt: now })
        .where(and(isNull(jobs.closedAt), inArray(jobs.companyId, blocked)))
        .returning({ id: jobs.id })
    : [];
  return old.length + gone.length;
}

async function knownIds(
  companyId: number,
  source: string,
): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db
    .select({ id: jobs.sourceId })
    .from(jobs)
    .where(and(eq(jobs.companyId, companyId), eq(jobs.source, source)));
  return new Set(rows.map((r) => r.id));
}

async function upsertCompany(c: {
  name: string;
  ats: string;
  boardSlug: string;
}): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .insert(companies)
    .values({
      slug: slugify(c.name) || c.boardSlug,
      name: c.name,
      ats: c.ats,
      boardSlug: c.boardSlug,
      lastFetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: companies.slug,
      set: { lastFetchedAt: new Date() },
    })
    .returning({ id: companies.id });
  return row.id;
}

async function storePostings(
  companyId: number,
  postings: Posting[],
  now: Date,
) {
  if (!postings.length) return { inserted: 0 };
  const db = await getDb();
  // Ads the reader didn't re-read in full: just mark them seen again.
  const stillThere = postings.filter((p) => p.known && !p.descriptionText);
  for (let i = 0; i < stillThere.length; i += 200) {
    const chunk = stillThere.slice(i, i + 200);
    await db
      .update(jobs)
      .set({ lastSeenAt: now, closedAt: null })
      .where(
        and(
          eq(jobs.source, chunk[0].source),
          inArray(
            jobs.sourceId,
            chunk.map((p) => p.sourceId),
          ),
        ),
      );
  }
  postings = postings.filter((p) => !(p.known && !p.descriptionText));
  if (!postings.length) return { inserted: 0 };
  const existing = await db
    .select({ source: jobs.source, sourceId: jobs.sourceId })
    .from(jobs)
    .where(
      and(
        eq(jobs.companyId, companyId),
        inArray(
          jobs.sourceId,
          postings.map((p) => p.sourceId),
        ),
      ),
    );
  const known = new Set(existing.map((e) => `${e.source}:${e.sourceId}`));

  // Titles this company closed recently: a new ad with the same title is a repost.
  const since = new Date(now.getTime() - REPOST_WINDOW_DAYS * 86_400_000);
  const closedRows = await db
    .select({ normTitle: jobs.normTitle, n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(
      and(
        eq(jobs.companyId, companyId),
        isNotNull(jobs.closedAt),
        gte(jobs.closedAt, since),
      ),
    )
    .groupBy(jobs.normTitle);
  const closedByTitle = new Map(closedRows.map((r) => [r.normTitle, r.n]));

  let inserted = 0;
  const rows = postings.map((p) => {
    const nt = normTitle(p.title);
    const isNew = !known.has(`${p.source}:${p.sourceId}`);
    if (isNew) inserted++;
    return {
      companyId,
      source: p.source,
      sourceId: p.sourceId,
      title: p.title,
      normTitle: nt,
      family: familyOf(p.title),
      level: levelOf(p.title),
      workType: workTypeOf(p.title, p.workTypeHint),
      locationText: ukPlaces(p.locationText).slice(0, 300),
      city: cityOf(ukPlaces(p.locationText)),
      remote: remoteOf(p.locationText, p.descriptionText, p.remoteHint),
      salaryMin: p.salary?.min ?? null,
      salaryMax: p.salary?.max ?? null,
      salaryText: p.salary?.text || null,
      descriptionText: p.descriptionText,
      applyUrl: p.applyUrl,
      postedAt: p.postedAt,
      firstSeenAt: now,
      lastSeenAt: now,
      closedAt: null,
      repostCount: isNew ? (closedByTitle.get(nt) ?? 0) : 0,
    };
  });

  for (let i = 0; i < rows.length; i += 100) {
    await db
      .insert(jobs)
      .values(rows.slice(i, i + 100))
      .onConflictDoUpdate({
        target: [jobs.source, jobs.sourceId],
        set: {
          title: sql`excluded.title`,
          normTitle: sql`excluded.norm_title`,
          family: sql`excluded.family`,
          level: sql`excluded.level`,
          workType: sql`excluded.work_type`,
          locationText: sql`excluded.location_text`,
          city: sql`excluded.city`,
          remote: sql`excluded.remote`,
          salaryMin: sql`excluded.salary_min`,
          salaryMax: sql`excluded.salary_max`,
          salaryText: sql`excluded.salary_text`,
          descriptionText: sql`excluded.description_text`,
          applyUrl: sql`excluded.apply_url`,
          postedAt: sql`coalesce(${jobs.postedAt}, excluded.posted_at)`,
          lastSeenAt: sql`excluded.last_seen_at`,
          closedAt: sql`null`,
        },
      });
  }
  return { inserted };
}

/** Recompute every open job's ghost score from its own facts and its company's. */
export async function rescoreOpenJobs() {
  const db = await getDb();
  const now = new Date();
  const open = await db
    .select({
      id: jobs.id,
      companyId: jobs.companyId,
      postedAt: jobs.postedAt,
      firstSeenAt: jobs.firstSeenAt,
      text: jobs.descriptionText,
      salaryMin: jobs.salaryMin,
      repostCount: jobs.repostCount,
    })
    .from(jobs)
    .where(isNull(jobs.closedAt));

  const stale = new Map<number, { open: number; old: number }>();
  for (const j of open) {
    const s = stale.get(j.companyId) ?? { open: 0, old: 0 };
    s.open++;
    const at = j.postedAt ?? j.firstSeenAt;
    if (now.getTime() - at.getTime() > 60 * 86_400_000) s.old++;
    stale.set(j.companyId, s);
  }
  const member = await companyReplyCounts();

  const updates = open.map((j) => {
    const s = stale.get(j.companyId);
    const r = scoreGhost({
      now,
      postedAt: j.postedAt ?? j.firstSeenAt,
      text: j.text,
      hasSalary: j.salaryMin != null,
      repostCount: j.repostCount,
      companyStaleShare: s && s.open >= 5 ? s.old / s.open : null,
      memberReplies: member.get(j.companyId) ?? null,
    });
    return { id: j.id, ...r };
  });

  for (let i = 0; i < updates.length; i += 400) {
    const chunk = updates.slice(i, i + 400);
    const values = sql.join(
      chunk.map(
        (u) =>
          sql`(${u.id}::int, ${u.score}::int, ${u.band}::text, ${JSON.stringify(u.reasons)}::jsonb)`,
      ),
      sql`, `,
    );
    await db.execute(sql`
      update jobs set ghost_score = v.score, ghost_band = v.band, ghost_reasons = v.reasons
      from (values ${values}) as v(id, score, band, reasons)
      where jobs.id = v.id`);
  }
  return updates.length;
}

/** Applications per company and how many got any reply, from the member tracker. */
export async function companyReplyCounts() {
  const db = await getDb();
  const rows = await db
    .select({
      companyId: applications.companyId,
      // An application still waiting inside 21 days has not had its chance yet.
      applied: sql<number>`count(*) filter (where ${applications.status} <> 'applied' or ${applications.appliedAt} < now() - interval '21 days')::int`,
      replied: sql<number>`count(*) filter (where ${applications.status} in ('heard_back','interviewing','offer','rejected'))::int`,
    })
    .from(applications)
    .where(isNotNull(applications.companyId))
    .groupBy(applications.companyId);
  return new Map(
    rows.map((r) => [
      r.companyId as number,
      { applied: r.applied, replied: r.replied },
    ]),
  );
}
