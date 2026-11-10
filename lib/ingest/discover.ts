import { sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { isExcludedEmployer } from "@/lib/ingest/excluded";
import { syncSeedBoards } from "@/lib/ingest/run";
import { UK_CITIES } from "@/lib/jobs/normalize";

/**
 * Daily discovery. SmartRecruiters' public search returns the newest postings
 * that match a word, across every employer on it. Searching UK places and common
 * job words turns up employers we don't read yet; each one is kept only if its
 * own board lists UK roles, and only if it isn't a recruitment agency.
 * Workable needs no discovery: its search already covers every employer.
 */
const SR_SEARCH = "https://jobs.smartrecruiters.com/sr-jobs/search";

const PLACES = [
  ...UK_CITIES,
  "UK",
  "United Kingdom",
  "England",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "Remote UK",
  "Canary Wharf",
  "Belfast",
];
const WORDS = [
  "engineer",
  "developer",
  "manager",
  "analyst",
  "sales",
  "marketing",
  "customer",
  "operations",
  "finance",
  "accountant",
  "designer",
  "product",
  "data",
  "nurse",
  "teacher",
  "support",
  "assistant",
  "coordinator",
  "consultant",
  "executive",
  "technician",
  "administrator",
  "graduate",
  "intern",
  "lead",
  "director",
  "specialist",
  "advisor",
  "officer",
  "associate",
];

type Hit = {
  company?: { identifier?: string; name?: string };
  location?: { country?: string };
};

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "application/json" },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

export type DiscoverSummary = {
  searches: number;
  candidates: number;
  checked: number;
  added: number;
  skippedAgencies: number;
  ms: number;
};

export async function discoverBoards(
  opts: { maxNew?: number } = {},
): Promise<DiscoverSummary> {
  const t0 = Date.now();
  const db = await getDb();
  await syncSeedBoards();
  const known = new Set(
    (
      await db
        .select({ slug: schema.boards.slug })
        .from(schema.boards)
        .where(sql`${schema.boards.ats} = 'smartrecruiters'`)
    ).map((b) => b.slug.toLowerCase()),
  );
  const searches = [
    ...PLACES,
    ...WORDS.map((w) => `${w} London`),
    ...WORDS.map((w) => `${w} UK`),
  ];
  const candidates = new Map<string, string>();
  let skippedAgencies = 0;

  await pool(searches, 6, async (keyword) => {
    const data = await json<{ content?: Hit[] }>(
      `${SR_SEARCH}?${new URLSearchParams({ keyword, limit: "100" })}`,
    );
    for (const h of data?.content ?? []) {
      const id = h.company?.identifier;
      const name = h.company?.name?.trim();
      if (!id || !name || (h.location?.country ?? "").toLowerCase() !== "gb")
        continue;
      if (known.has(id.toLowerCase()) || candidates.has(id)) continue;
      if (isExcludedEmployer(name, id)) {
        skippedAgencies++;
        continue;
      }
      candidates.set(id, name);
    }
  });

  // Keep only employers whose own board really lists UK roles today.
  const list = [...candidates].slice(0, opts.maxNew ?? 400);
  const found: { slug: string; name: string; uk: number }[] = [];
  let checked = 0;
  await pool(list, 8, async ([slug, name]) => {
    checked++;
    const page = await json<{ totalFound?: number }>(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?country=gb&limit=1`,
    );
    if ((page?.totalFound ?? 0) > 0)
      found.push({ slug, name, uk: page?.totalFound ?? 0 });
  });

  if (found.length) {
    await db
      .insert(schema.boards)
      .values(
        found.map((f) => ({
          ats: "smartrecruiters",
          slug: f.slug,
          name: f.name,
          origin: "discovered",
          ukRoles: f.uk,
        })),
      )
      .onConflictDoNothing();
  }
  return {
    searches: searches.length,
    candidates: candidates.size,
    checked,
    added: found.length,
    skippedAgencies,
    ms: Date.now() - t0,
  };
}
