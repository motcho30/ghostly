import fs from "node:fs";
import path from "node:path";

import { htmlToText, parseSalary, type Salary } from "@/lib/jobs/normalize";

export type Board = {
  ats: "greenhouse" | "lever" | "ashby" | "smartrecruiters";
  slug: string;
  name: string;
};

/** One advert as the company's own careers board gives it. */
export type Posting = {
  source: Board["ats"] | "workable";
  sourceId: string;
  title: string;
  locationText: string;
  country: string | null;
  remoteHint: string | null;
  workTypeHint: string | null;
  salary: Salary | null;
  descriptionText: string;
  applyUrl: string;
  postedAt: Date | null;
  /** Already stored: the reader skipped the full text, so keep what we have. */
  known?: boolean;
  /** Set by readers that cover many employers at once, such as Workable. */
  companyName?: string;
};

export class BoardMissing extends Error {}

export function loadBoards(): Board[] {
  const file = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "boards.json"), "utf8"),
  ) as {
    boards: Board[];
  };
  return file.boards;
}

// Enough for the verdict and the job page; full ads stay one click away on the company site.
const MAX_TEXT = 6_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "user-agent": "GhostlessBot/0.1 (+job freshness checks)",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 404 || res.status === 403) throw new BoardMissing(url);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return (await res.json()) as T;
}

function date(v: string | number | null | undefined): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

type GhJob = {
  id: number;
  title: string;
  absolute_url: string;
  first_published?: string | null;
  updated_at?: string;
  content?: string;
  location?: { name?: string };
};

async function greenhouse(slug: string): Promise<Posting[]> {
  const data = await getJson<{ jobs: GhJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
  );
  return data.jobs.map((j) => {
    const text = htmlToText(j.content ?? "").slice(0, MAX_TEXT);
    return {
      source: "greenhouse",
      sourceId: String(j.id),
      title: j.title.trim(),
      locationText: j.location?.name ?? "",
      country: null,
      remoteHint: null,
      workTypeHint: null,
      salary: parseSalary(text),
      descriptionText: text,
      applyUrl: j.absolute_url,
      postedAt: date(j.first_published) ?? null,
    } satisfies Posting;
  });
}

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  country?: string;
  workplaceType?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text?: string; content?: string }[];
  categories?: {
    location?: string;
    commitment?: string;
    allLocations?: string[];
  };
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
  };
};

async function lever(slug: string): Promise<Posting[]> {
  const data = await getJson<LeverJob[]>(
    `https://api.lever.co/v0/postings/${slug}?mode=json`,
  );
  return data.map((j) => {
    const lists = (j.lists ?? [])
      .map((l) => `${l.text ?? ""}\n${htmlToText(l.content ?? "")}`)
      .join("\n\n");
    const text = [j.descriptionPlain, lists, j.additionalPlain]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MAX_TEXT);
    const sr = j.salaryRange;
    const structured: Salary | null =
      sr?.min &&
      (sr.currency === "GBP" || sr.currency === "USD") &&
      (sr.interval ?? "per-year-salary").includes("year")
        ? {
            min: sr.min,
            max: sr.max ?? sr.min,
            text: "",
            currency: sr.currency,
          }
        : null;
    return {
      source: "lever",
      sourceId: j.id,
      title: j.text.trim(),
      locationText: [
        j.categories?.location,
        ...(j.categories?.allLocations ?? []),
      ]
        .filter(Boolean)
        .join("; "),
      country: j.country ?? null,
      remoteHint: j.workplaceType ?? null,
      workTypeHint: j.categories?.commitment ?? null,
      salary: structured ?? parseSalary(text),
      descriptionText: text,
      applyUrl: j.hostedUrl,
      postedAt: date(j.createdAt),
    } satisfies Posting;
  });
}

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  address?: { postalAddress?: { addressCountry?: string } };
  workplaceType?: string;
  employmentType?: string;
  publishedAt?: string;
  isListed?: boolean;
  jobUrl: string;
  descriptionPlain?: string;
  compensation?: {
    compensationTierSummary?: string | null;
    scrapeableCompensationSalarySummary?: string | null;
  };
};

async function ashby(slug: string): Promise<Posting[]> {
  const data = await getJson<{ jobs: AshbyJob[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
  );
  return data.jobs
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const text = (j.descriptionPlain ?? "").slice(0, MAX_TEXT);
      const comp =
        j.compensation?.scrapeableCompensationSalarySummary ??
        j.compensation?.compensationTierSummary ??
        "";
      const country = j.address?.postalAddress?.addressCountry ?? null;
      return {
        source: "ashby",
        sourceId: j.id,
        title: j.title.trim(),
        locationText: [
          j.location,
          ...(j.secondaryLocations ?? []).map((s) => s.location),
        ]
          .filter(Boolean)
          .join("; "),
        // Ashby writes the country in full ("United Kingdom", "United States").
        country:
          country && /united kingdom|great britain|^uk$/i.test(country)
            ? "GB"
            : country && /united states|^usa?$/i.test(country)
              ? "US"
              : null,
        remoteHint: j.workplaceType ?? null,
        workTypeHint: j.employmentType ?? null,
        salary: parseSalary(comp) ?? parseSalary(text),
        descriptionText: text,
        applyUrl: j.jobUrl,
        postedAt: date(j.publishedAt),
      } satisfies Posting;
    });
}

type SrRow = {
  id: string;
  name: string;
  releasedDate?: string;
  location?: {
    city?: string;
    country?: string;
    remote?: boolean;
    hybrid?: boolean;
    fullLocation?: string;
  };
  typeOfEmployment?: { label?: string };
};
type SrDetail = SrRow & {
  applyUrl?: string;
  jobAd?: { sections?: Record<string, { text?: string }> };
};

/**
 * SmartRecruiters' public Posting API, UK roles only. The list has no ad text, so
 * each new posting is read once in full; postings we already hold are not re-read.
 */
async function smartrecruiters(
  slug: string,
  known: Set<string>,
): Promise<Posting[]> {
  const out: Posting[] = [];
  const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings`;
  // UK and US roles, one country at a time, so each ad keeps its country.
  for (const cc of ["gb", "us"] as const) {
    for (let offset = 0, page = 0; page < 50; page++) {
      const data = await getJson<{ content?: SrRow[]; totalFound?: number }>(
        `${base}?country=${cc}&limit=100&offset=${offset}`,
      );
      const rows = data.content ?? [];
      for (const r of rows) {
        const isKnown = known.has(r.id);
        let text = "";
        let applyUrl = `https://jobs.smartrecruiters.com/${slug}/${r.id}`;
        if (!isKnown) {
          const d = await getJson<SrDetail>(`${base}/${r.id}`).catch(
            () => null,
          );
          text = htmlToText(
            Object.values(d?.jobAd?.sections ?? {})
              .map((s) => s.text ?? "")
              .join("\n\n"),
          ).slice(0, MAX_TEXT);
          if (d?.applyUrl) applyUrl = d.applyUrl;
          if (!text) continue;
        }
        const loc = r.location ?? {};
        const countryName = cc === "gb" ? "United Kingdom" : "United States";
        out.push({
          source: "smartrecruiters",
          sourceId: r.id,
          title: r.name.trim(),
          locationText:
            loc.fullLocation ||
            [loc.city, countryName].filter(Boolean).join(", "),
          country: cc === "gb" ? "GB" : "US",
          remoteHint: loc.remote ? "remote" : loc.hybrid ? "hybrid" : null,
          workTypeHint: r.typeOfEmployment?.label ?? null,
          salary: text ? parseSalary(text, cc === "gb" ? "GBP" : "USD") : null,
          descriptionText: text,
          applyUrl,
          postedAt: date(r.releasedDate),
          known: isKnown,
        });
      }
      offset += rows.length;
      if (!rows.length || offset >= (data.totalFound ?? 0)) break;
    }
  }
  return out;
}

export function fetchBoard(
  board: Board,
  known: Set<string> = new Set(),
): Promise<Posting[]> {
  if (board.ats === "greenhouse") return greenhouse(board.slug);
  if (board.ats === "lever") return lever(board.slug);
  if (board.ats === "smartrecruiters")
    return smartrecruiters(board.slug, known);
  return ashby(board.slug);
}
