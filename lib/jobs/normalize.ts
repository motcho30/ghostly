import type { Level, Remote, WorkType } from "@/lib/db/schema";

// ---------- UK location ----------

const OTHER_COUNTRY =
  /\b(united states|usa|u\.s\.a?|america|canada|australia|germany|france|netherlands|spain|italy|(?<!northern )ireland|india|singapore|uae|dubai|hong kong|japan|brazil|mexico|sweden|norway|denmark|poland|portugal|switzerland|austria|belgium|romania|czech|pakistan|nigeria|kenya|south africa|israel|new york|san francisco|seattle|boston|austin|chicago|los angeles|san diego|san jose|denver|atlanta|miami|toronto|vancouver|montreal|sydney|melbourne|bangalore|bengaluru|hyderabad|mumbai|pune|tel aviv|zurich|munich|stockholm|lisbon|madrid|barcelona|milan|warsaw|prague|amsterdam|berlin|paris|dublin|tokyo|emea|europe|apac|latam|americas|global)\b|,\s?(?:ca|ny|wa|tx|ma|il|co|ga|pa|va|nc|dc|fl|az|or|nj)\b(?!\w)|\bus\b/i;
const UK_NATION =
  /\b(united kingdom|great britain|england|scotland|wales|northern ireland|uk)\b/i;

export const UK_CITIES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Glasgow",
  "Edinburgh",
  "Bristol",
  "Cardiff",
  "Belfast",
  "Liverpool",
  "Sheffield",
  "Nottingham",
  "Newcastle",
  "Cambridge",
  "Oxford",
  "Reading",
  "Brighton",
  "Southampton",
  "Leicester",
  "Milton Keynes",
] as const;

const CITY_RE = new RegExp(`\\b(${UK_CITIES.join("|")})\\b`, "i");
const UK_PLACE = new RegExp(
  `\\b(uk|u\\.k\\.|united kingdom|great britain|britain|england|scotland|wales|northern ireland|canary wharf|shoreditch|${UK_CITIES.join("|")})\\b`,
  "i",
);
const REMOTE =
  /\b(remote|anywhere|work from home|home[- ]based|distributed)\b/i;

/** True when a board's location text points at the UK. Multi-location text is split, so "New York; London" counts and "Cambridge, MA" does not. */
export function isUkLocation(
  location: string | null | undefined,
  country?: string | null,
): boolean {
  const c = country?.trim() ?? "";
  if (c) {
    if (/^(gb|gbr|uk|united kingdom|great britain)$/i.test(c)) return true;
    if (/^[a-z]{2,3}$/i.test(c)) return false;
  }
  const parts = (location ?? "")
    .split(/[;|/]| or /i)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.some(
    (p) => UK_PLACE.test(p) && (!OTHER_COUNTRY.test(p) || UK_NATION.test(p)),
  );
}

/** Only the UK places in a multi-location ad, so "Berlin; Remote (UK)" shows as "Remote (UK)". */
export function ukPlaces(location: string | null | undefined): string {
  const parts = (location ?? "")
    .split(/[;|/]| or /i)
    .map((p) => p.trim())
    .filter(Boolean);
  const uk = parts.filter(
    (p) => UK_PLACE.test(p) && (!OTHER_COUNTRY.test(p) || UK_NATION.test(p)),
  );
  return [...new Set(uk.length ? uk : parts)].join("; ");
}

export function cityOf(location: string | null | undefined): string | null {
  const m = location?.match(CITY_RE);
  if (!m) return null;
  const hit = m[1].toLowerCase();
  return UK_CITIES.find((c) => c.toLowerCase() === hit) ?? null;
}

export function remoteOf(
  location: string,
  text: string,
  hint?: string | null,
): Remote {
  const h = (hint ?? "").toLowerCase();
  if (h.includes("hybrid")) return "hybrid";
  if (h.includes("remote")) return "remote";
  if (h.includes("site") || h.includes("office")) return "on_site";
  const loc = location.toLowerCase();
  if (/\bhybrid\b/.test(loc)) return "hybrid";
  if (REMOTE.test(loc)) return "remote";
  const head = text.slice(0, 3000).toLowerCase();
  if (/\bhybrid\b/.test(head)) return "hybrid";
  if (
    /\b(fully remote|100% remote|remote[- ]first|work from anywhere)\b/.test(
      head,
    )
  )
    return "remote";
  return "on_site";
}

// ---------- Level and work type ----------

export function levelOf(title: string): Level {
  const t = title.toLowerCase();
  if (
    /\b(director|vp\b|vice president|chief|head of|cto|cfo|coo|ceo|cmo)\b/.test(
      t,
    )
  )
    return "director";
  if (
    /\b(lead|leader|principal|staff|engineering manager|senior manager|team manager)\b/.test(
      t,
    )
  )
    return "lead";
  if (/\b(senior|sr\.?|snr)\b/.test(t)) return "senior";
  if (
    /\b(intern|internship|graduate|grad\b|junior|jr\.?|entry|apprentice|trainee|associate)\b/.test(
      t,
    )
  )
    return "entry";
  return "mid";
}

export function workTypeOf(title: string, hint?: string | null): WorkType {
  const s = `${title} ${hint ?? ""}`.toLowerCase();
  if (/\b(intern|internship|placement|summer)\b/.test(s)) return "internship";
  if (
    /\b(contract|contractor|fixed[- ]term|ftc|temporary|temp\b|freelance)\b/.test(
      s,
    )
  )
    return "contract";
  if (/\b(part[- ]time|parttime)\b/.test(s)) return "part_time";
  return "full_time";
}

export function normTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[-–|,/].*$/, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Salary ----------

export type Salary = { min: number; max: number; text: string };

const DAYS_A_YEAR = 220;
const HOURS_A_YEAR = 1950;

function toNumber(raw: string, k: string | undefined): number {
  const n = Number(raw.replace(/,/g, ""));
  return k ? n * 1000 : n;
}

/**
 * Annual GBP from text like "£45,000 - £55,000", "£60k–£70k" or "£450 a day".
 * Day and hour rates become annual so the quiz salary filter can use them.
 */
export function parseSalary(text: string): Salary | null {
  const re =
    /£\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?(?:\s?(?:-|–|to)\s?£?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?)?(?:\s*(?:per|a|\/)\s*(year|annum|day|hour|month))?/gi;
  for (const m of text.matchAll(re)) {
    let lo = toNumber(m[1], m[2] ?? m[4]);
    let hi = m[3] ? toNumber(m[3], m[4] ?? m[2]) : lo;
    const per = (m[5] ?? "").toLowerCase();
    if (
      per === "day" ||
      (!per &&
        hi >= 150 &&
        hi < 2000 &&
        /day|daily/i.test(text.slice(m.index, m.index + 60)))
    ) {
      lo *= DAYS_A_YEAR;
      hi *= DAYS_A_YEAR;
    } else if (per === "hour") {
      lo *= HOURS_A_YEAR;
      hi *= HOURS_A_YEAR;
    } else if (per === "month") {
      lo *= 12;
      hi *= 12;
    }
    if (lo < 12_000 || hi > 1_000_000 || hi < lo) continue;
    return { min: Math.round(lo), max: Math.round(hi), text: m[0].trim() };
  }
  return null;
}

export function formatSalary(
  min: number | null,
  max: number | null,
): string | null {
  if (min == null) return null;
  const k = (n: number) => `£${Math.round(n / 1000)}k`;
  return max && max !== min ? `${k(min)} to ${k(max)}` : k(min);
}

// ---------- Text ----------

export function htmlToText(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<\s*(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
