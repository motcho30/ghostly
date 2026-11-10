import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { safeFetchText } from "@/lib/check/fetch";
import { getDb, schema } from "@/lib/db";
import type { GhostBand, GhostReason } from "@/lib/db/schema";
import { pastedAgeDays, scoreGhost } from "@/lib/ghost/score";
import { shortId } from "@/lib/ids";
import { loadBoards } from "@/lib/ingest/ats";
import { companyReplyCounts } from "@/lib/ingest/run";
import { htmlToText, parseSalary } from "@/lib/jobs/normalize";

const { jobs, companies, checks } = schema;

export type CheckFacts = {
  source: "ghostless" | "greenhouse" | "lever" | "ashby" | "page" | "text";
  title?: string | null;
  company?: string | null;
  companySlug?: string | null;
  postedAt?: string | null;
  validThrough?: string | null;
  salary?: string | null;
  url?: string | null;
  readable: boolean;
  note?: string;
};

export class CheckError extends Error {}

export type CheckResult = {
  id: string;
  score: number;
  band: GhostBand;
  reasons: GhostReason[];
  facts: CheckFacts;
};

type Parsed = {
  title?: string;
  company?: string;
  postedAt?: Date | null;
  validThrough?: Date | null;
  text: string;
  source: CheckFacts["source"];
  url?: string;
};

const GH = /(?:job-)?boards(?:\.eu)?\.greenhouse\.io\/([\w-]+)\/jobs\/(\d+)/i;
const LEVER = /jobs\.(?:eu\.)?lever\.co\/([\w-]+)\/([0-9a-f-]{36})/i;
const ASHBY = /jobs\.ashbyhq\.com\/([\w.-]+)\/([0-9a-f-]{36})/i;

async function json<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  return res.ok ? ((await res.json()) as T) : null;
}

/** Company boards we know how to read through their public APIs. */
async function fromAts(url: string): Promise<Parsed | null> {
  let m = url.match(GH);
  if (m) {
    const j = await json<{
      title: string;
      content?: string;
      first_published?: string;
      company_name?: string;
    }>(`https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs/${m[2]}`);
    if (j)
      return {
        title: j.title,
        company: j.company_name ?? m[1],
        postedAt: j.first_published ? new Date(j.first_published) : null,
        text: htmlToText(j.content ?? ""),
        source: "greenhouse",
        url,
      };
  }
  // Company careers sites that embed Greenhouse put the job id in ?gh_jid=. Guess the board from the host name.
  const ghId = url.match(/[?&]gh_jid=(\d+)/)?.[1];
  if (ghId) {
    const host = new URL(url).hostname.toLowerCase();
    const boards = loadBoards().filter(
      (b) => b.ats === "greenhouse" && host.includes(b.slug.toLowerCase()),
    );
    for (const b of boards) {
      const j = await json<{
        title: string;
        content?: string;
        first_published?: string;
        company_name?: string;
      }>(`https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs/${ghId}`);
      if (j)
        return {
          title: j.title,
          company: j.company_name ?? b.name,
          postedAt: j.first_published ? new Date(j.first_published) : null,
          text: htmlToText(j.content ?? ""),
          source: "greenhouse",
          url,
        };
    }
  }
  m = url.match(LEVER);
  if (m) {
    const j = await json<{
      text: string;
      createdAt?: number;
      descriptionPlain?: string;
      additionalPlain?: string;
    }>(`https://api.lever.co/v0/postings/${m[1]}/${m[2]}`);
    if (j)
      return {
        title: j.text,
        company: m[1],
        postedAt: j.createdAt ? new Date(j.createdAt) : null,
        text: `${j.descriptionPlain ?? ""}\n${j.additionalPlain ?? ""}`,
        source: "lever",
        url,
      };
  }
  m = url.match(ASHBY);
  if (m) {
    const board = await json<{
      jobs: {
        id: string;
        title: string;
        publishedAt?: string;
        descriptionPlain?: string;
      }[];
    }>(`https://api.ashbyhq.com/posting-api/job-board/${m[1]}`);
    const j = board?.jobs.find((x) => x.id === m?.[2]);
    if (j)
      return {
        title: j.title,
        company: m[1],
        postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
        text: j.descriptionPlain ?? "",
        source: "ashby",
        url,
      };
  }
  return null;
}

type LdJob = {
  "@type"?: string | string[];
  title?: string;
  datePosted?: string;
  validThrough?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  "@graph"?: LdJob[];
};

function findJobPosting(node: unknown): LdJob | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findJobPosting(n);
      if (hit) return hit;
    }
    return null;
  }
  const n = node as LdJob;
  const type = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
  if (type.includes("JobPosting")) return n;
  return n["@graph"] ? findJobPosting(n["@graph"]) : null;
}

/** Any other job page: the JobPosting data most sites embed for Google. */
async function fromPage(url: string): Promise<Parsed | null> {
  const page = await safeFetchText(url);
  if (page.status >= 400 || !page.body) return null;
  for (const m of page.body.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const job = findJobPosting(JSON.parse(m[1].trim()));
      if (job) {
        const org =
          typeof job.hiringOrganization === "string"
            ? job.hiringOrganization
            : job.hiringOrganization?.name;
        return {
          title: job.title,
          company: org,
          postedAt: job.datePosted ? new Date(job.datePosted) : null,
          validThrough: job.validThrough ? new Date(job.validThrough) : null,
          text: htmlToText(job.description ?? ""),
          source: "page",
          url: page.url,
        };
      }
    } catch {
      // Some sites ship broken JSON-LD. Try the next block.
    }
  }
  return null;
}

async function fromOurDb(url: string) {
  const db = await getDb();
  const clean = url.split("?")[0];
  const [row] = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(or(eq(jobs.applyUrl, url), ilike(jobs.applyUrl, `${clean}%`)))
    .limit(1);
  return row ?? null;
}

async function companyContext(name: string | null | undefined) {
  if (!name) return null;
  const db = await getDb();
  const [c] = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      open: sql<number>`count(${jobs.id})::int`,
      old: sql<number>`count(*) filter (where coalesce(${jobs.postedAt}, ${jobs.firstSeenAt}) < now() - interval '60 days')::int`,
    })
    .from(companies)
    .leftJoin(
      jobs,
      and(eq(jobs.companyId, companies.id), isNull(jobs.closedAt)),
    )
    .where(
      or(
        ilike(companies.name, name.trim()),
        eq(companies.boardSlug, name.trim().toLowerCase()),
      ),
    )
    .groupBy(companies.id)
    .limit(1);
  if (!c) return null;
  const member = (await companyReplyCounts()).get(c.id) ?? null;
  return { ...c, staleShare: c.open >= 5 ? c.old / c.open : null, member };
}

/** Scores a pasted link or a pasted ad, saves the result and returns its public id. */
export async function runCheck(input: {
  url?: string;
  text?: string;
  anonId?: string;
}): Promise<CheckResult> {
  const now = new Date();
  let parsed: Parsed | null = null;
  let note: string | undefined;
  let repostCount = 0;
  let hasSalaryFromDb: boolean | null = null;

  if (input.url) {
    const known = await fromOurDb(input.url);
    if (known) {
      parsed = {
        title: known.job.title,
        company: known.company.name,
        postedAt: known.job.postedAt ?? known.job.firstSeenAt,
        text: known.job.descriptionText,
        source: "ghostless",
        url: known.job.applyUrl,
      };
      repostCount = known.job.repostCount;
      hasSalaryFromDb = known.job.salaryMin != null;
    } else {
      try {
        parsed = (await fromAts(input.url)) ?? (await fromPage(input.url));
      } catch (e) {
        note = e instanceof Error ? e.message : "We couldn't open that page";
      }
      if (!parsed)
        note ??=
          "That site didn't let us read the ad. Paste the ad text instead for a full check.";
    }
  }
  if (!parsed && input.text) {
    // Job sites print "Posted 3 weeks ago". Turn it into a date so the verdict can use it.
    const days = pastedAgeDays(input.text);
    parsed = {
      text: input.text.slice(0, 20_000),
      source: "text",
      postedAt:
        days == null ? null : new Date(now.getTime() - days * 86_400_000),
    };
  }
  // Never score what we could not read: an empty ad would look falsely safe.
  if (!parsed || parsed.text.trim().length < 80) {
    throw new CheckError(
      note ??
        "There isn't enough of the ad here to check. Paste the full ad text.",
    );
  }

  const text = parsed?.text ?? "";
  const salary = parseSalary(text);
  const company = await companyContext(parsed?.company);
  const pasted = parsed?.source === "text";
  const result = scoreGhost({
    now,
    postedAt: parsed?.postedAt ?? null,
    text,
    hasSalary: hasSalaryFromDb ?? Boolean(salary),
    repostCount,
    companyStaleShare: company?.staleShare ?? null,
    memberReplies: company?.member ?? null,
    pasted,
  });
  if (parsed?.validThrough && parsed.validThrough < now) {
    result.reasons.unshift({
      key: "expired",
      label: "The page says this ad has already expired",
      points: 30,
    });
    result.score = Math.min(100, result.score + 30);
    result.band =
      result.score >= 60 ? "high" : result.score >= 30 ? "medium" : "low";
  }

  const facts: CheckFacts = {
    source: parsed?.source ?? "text",
    title: parsed?.title ?? null,
    company: company?.name ?? parsed?.company ?? null,
    companySlug: company?.slug ?? null,
    postedAt: parsed?.postedAt?.toISOString() ?? null,
    validThrough: parsed?.validThrough?.toISOString() ?? null,
    salary: salary?.text ?? null,
    url: parsed?.url ?? input.url ?? null,
    readable: Boolean(parsed && text.length > 0),
    note,
  };

  const id = shortId(8);
  const db = await getDb();
  await db.insert(checks).values({
    id,
    anonId: input.anonId ?? null,
    inputKind: input.url ? "url" : "text",
    inputUrl: input.url ?? null,
    title: facts.title,
    companyName: facts.company,
    score: result.score,
    band: result.band,
    reasons: result.reasons,
    facts,
  });
  return { id, ...result, facts };
}

export async function getCheck(id: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(checks)
    .where(eq(checks.id, id))
    .limit(1);
  return row ?? null;
}
