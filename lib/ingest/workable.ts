import type { Posting } from "@/lib/ingest/ats";
import { htmlToText, parseSalary } from "@/lib/jobs/normalize";

/**
 * Workable's public job search covers every employer on Workable, not one board
 * at a time. Free, no key, 20 ads a page with full text. It rate-limits heavy
 * use, so pages are read slowly, a 429 means wait and retry, and a scan that is
 * still refused stops cleanly with what it has. The daily scan reads ads from the
 * last 30 days (about 250 pages); hourly runs read the last two days.
 * For more volume, Workable offers an official jobs XML feed on request.
 */
const PAGE_GAP_MS = 1_200;
const RATE_LIMIT_WAIT_MS = 30_000;

export class WorkableRateLimited extends Error {}
const SEARCH = "https://jobs.workable.com/api/v1/jobs";
const MAX_TEXT = 6_000;

/** Recruitment firms post on Workable too. We only list employers hiring for themselves. */
export const AGENCY_NAME =
  /\b(recruit(?:ment|ers|ing)?|staffing|resourcing|personnel|headhunt\w*|executive search|search partners|talent (?:solutions|partners|acquisition)|employment (?:agency|services)|appointments|jobs? (?:agency|board))\b/i;

type WorkableJob = {
  id?: string;
  title?: string;
  state?: string;
  description?: string;
  requirementsSection?: string;
  benefitsSection?: string;
  employmentType?: string;
  url?: string;
  locations?: string[];
  location?: { city?: string; subregion?: string; countryName?: string };
  created?: string;
  company?: { id?: string; title?: string };
  workplace?: string;
};

function toPosting(j: WorkableJob): Posting | null {
  const name = j.company?.title?.trim();
  if (!j.id || !j.title || !name || !j.url) return null;
  if (j.state && j.state !== "published") return null;
  if (AGENCY_NAME.test(name)) return null;
  const countryName = j.location?.countryName ?? "";
  const country = /united kingdom|great britain/i.test(countryName)
    ? "GB"
    : /united states/i.test(countryName)
      ? "US"
      : null;
  if (!country) return null;
  const text = htmlToText(
    [j.description, j.requirementsSection, j.benefitsSection]
      .filter(Boolean)
      .join("\n"),
  ).slice(0, MAX_TEXT);
  if (!text) return null;
  const loc = [j.location?.city, j.location?.subregion, countryName]
    .filter(Boolean)
    .join(", ");
  return {
    source: "workable",
    sourceId: j.id,
    title: j.title.trim(),
    locationText: loc,
    country,
    remoteHint: j.workplace ?? null,
    workTypeHint: j.employmentType ?? null,
    salary: parseSalary(text),
    descriptionText: text,
    applyUrl: j.url,
    postedAt: j.created ? new Date(j.created) : null,
    companyName: name,
  };
}

async function page(
  params: URLSearchParams,
  tries = 3,
): Promise<{ jobs?: WorkableJob[]; nextPageToken?: string }> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(`${SEARCH}?${params}`, {
        signal: AbortSignal.timeout(20_000),
        headers: { accept: "application/json" },
      });
      if (res.status === 429) {
        if (i + 1 >= tries)
          throw new WorkableRateLimited("Workable rate limit");
        await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`Workable ${res.status}`);
      return (await res.json()) as {
        jobs?: WorkableJob[];
        nextPageToken?: string;
      };
    } catch (error) {
      if (i + 1 >= tries) throw error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

/**
 * Every UK Workable ad, or only the last `dayRange` days. `complete` is true only
 * when the scan reached the last page, which is when it is safe to close ads that
 * were not seen.
 */
export async function scanWorkable(
  opts: {
    dayRange?: number;
    maxPages?: number;
    patient?: boolean;
    location?: "United Kingdom" | "United States";
  } = {},
): Promise<{
  postings: Posting[];
  pages: number;
  complete: boolean;
  agenciesSkipped: number;
  rateLimited?: boolean;
}> {
  const postings: Posting[] = [];
  let token: string | undefined;
  let pages = 0;
  let agenciesSkipped = 0;
  const maxPages = opts.maxPages ?? 700;
  while (pages < maxPages) {
    const params = new URLSearchParams({
      location: opts.location ?? "United Kingdom",
    });
    if (opts.dayRange) params.set("day_range", String(opts.dayRange));
    if (token) params.set("pageToken", token);
    let data: Awaited<ReturnType<typeof page>>;
    try {
      // Hourly runs don't wait out a rate limit; the daily scan does.
      data = await page(params, opts.patient ? 3 : 1);
    } catch (error) {
      // Keep what we have; an incomplete scan never closes ads.
      if (error instanceof WorkableRateLimited)
        return {
          postings,
          pages,
          complete: false,
          agenciesSkipped,
          rateLimited: true,
        };
      throw error;
    }
    pages++;
    if (pages > 1) await new Promise((r) => setTimeout(r, PAGE_GAP_MS));
    for (const j of data.jobs ?? []) {
      if (j.company?.title && AGENCY_NAME.test(j.company.title))
        agenciesSkipped++;
      const p = toPosting(j);
      if (p) postings.push(p);
    }
    token = data.nextPageToken;
    if (!token || !(data.jobs ?? []).length)
      return { postings, pages, complete: true, agenciesSkipped };
  }
  return { postings, pages, complete: false, agenciesSkipped };
}
