import type { Level, Remote, WorkType } from "@/lib/db/schema";

// ---------- Markets: the UK and the US ----------

export type Market = "GB" | "US";
export const MARKETS: Market[] = ["GB", "US"];
export const CURRENCY: Record<Market, "GBP" | "USD"> = { GB: "GBP", US: "USD" };
export const MARKET_NAME: Record<Market, string> = {
  GB: "the UK",
  US: "the US",
};

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

export const US_CITIES = [
  "New York",
  "San Francisco",
  "Los Angeles",
  "Seattle",
  "Austin",
  "Boston",
  "Chicago",
  "Denver",
  "Atlanta",
  "Miami",
  "Washington",
  "Dallas",
  "Houston",
  "San Diego",
  "San Jose",
  "Philadelphia",
  "Phoenix",
  "Portland",
  "Minneapolis",
  "Nashville",
  "Salt Lake City",
  "Raleigh",
  "Pittsburgh",
  "Detroit",
  "Charlotte",
  "Palo Alto",
  "Mountain View",
  "Menlo Park",
  "Sunnyvale",
  "Brooklyn",
] as const;

export const CITIES: Record<Market, readonly string[]> = {
  GB: UK_CITIES,
  US: US_CITIES,
};

const US_STATES =
  "alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming";
const US_CODES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";

const UK_PLACE = new RegExp(
  `\\b(uk|u\\.k\\.|united kingdom|great britain|britain|england|scotland|wales|northern ireland|canary wharf|shoreditch|${UK_CITIES.join("|")})\\b`,
  "i",
);
const US_PLACE = new RegExp(
  `\\b(united states|usa|u\\.s\\.a?\\.?|america|${US_STATES}|${US_CITIES.join("|")}|nyc|bay area|silicon valley|sf)\\b`,
  "i",
);
// State codes and "US" only count in capitals, so the word "us" in a sentence never matches.
const US_CODE = new RegExp(
  `(?:,\\s*|\\(|-\\s*|\\s)(?:${US_CODES})(?:\\b|$)|\\bUS\\b`,
);
const CANADA =
  /\b(canada|ontario|british columbia|quebec|alberta)\b|,\s*(ON|BC|QC|AB|MB|NS|NB|SK)\b/;
const ELSEWHERE =
  /\b(australia|germany|france|netherlands|spain|italy|(?<!northern )ireland|india|singapore|uae|dubai|hong kong|japan|brazil|mexico|sweden|norway|denmark|poland|portugal|switzerland|austria|belgium|romania|czech|pakistan|nigeria|kenya|south africa|israel|toronto|vancouver|montreal|sydney|melbourne|bangalore|bengaluru|hyderabad|mumbai|pune|tel aviv|zurich|munich|stockholm|lisbon|madrid|barcelona|milan|warsaw|prague|amsterdam|berlin|paris|dublin|tokyo|emea|europe|apac|latam)\b/i;
const UK_NATION =
  /\b(united kingdom|great britain|england|scotland|wales|northern ireland|uk)\b/i;

function splitPlaces(location: string | null | undefined): string[] {
  return (location ?? "")
    .split(/[;|/]| or /i)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Which of our markets one place name belongs to, if any. */
function placeMarket(p: string): Market | null {
  if (CANADA.test(p)) return null;
  if (
    UK_PLACE.test(p) &&
    (!ELSEWHERE.test(p) || UK_NATION.test(p)) &&
    !/\b(?:new )?london,?\s*(?:ON|ontario|KY|OH|CT)\b/i.test(p)
  ) {
    // "Cambridge, MA" and "Birmingham, AL" are American.
    if (US_CODE.test(p) && !UK_NATION.test(p)) return "US";
    return "GB";
  }
  if ((US_PLACE.test(p) || US_CODE.test(p)) && !ELSEWHERE.test(p)) return "US";
  return null;
}

/**
 * The market an ad belongs to: the UK or the US, from the board's country code
 * or its location text. An ad listing both counts as UK, our home market.
 */
export function marketOf(
  location: string | null | undefined,
  country?: string | null,
): Market | null {
  const c = country?.trim() ?? "";
  if (c) {
    if (/^(gb|gbr|uk|united kingdom|great britain)$/i.test(c)) return "GB";
    if (/^(us|usa|united states|united states of america)$/i.test(c))
      return "US";
    if (/^[a-z]{2,3}$/i.test(c)) return null;
  }
  const found = splitPlaces(location).map(placeMarket);
  if (found.includes("GB")) return "GB";
  if (found.includes("US")) return "US";
  return null;
}

/** Kept for the UK-only callers and tests. */
export function isUkLocation(
  location: string | null | undefined,
  country?: string | null,
): boolean {
  return marketOf(location, country) === "GB";
}

/** Only the places in a multi-location ad that belong to its market. */
export function marketPlaces(
  location: string | null | undefined,
  market: Market,
): string {
  const parts = splitPlaces(location);
  const mine = parts.filter((p) => placeMarket(p) === market);
  return [...new Set(mine.length ? mine : parts)].join("; ");
}

export function ukPlaces(location: string | null | undefined): string {
  return marketPlaces(location, "GB");
}

export function cityOf(
  location: string | null | undefined,
  market: Market = "GB",
): string | null {
  const list = CITIES[market];
  const re = new RegExp(`\\b(${list.join("|")})\\b`, "i");
  const m = location?.match(re);
  if (!m)
    return market === "US" && /\bnyc\b/i.test(location ?? "")
      ? "New York"
      : null;
  const hit = m[1].toLowerCase();
  return list.find((c) => c.toLowerCase() === hit) ?? null;
}

const REMOTE =
  /\b(remote|anywhere|work from home|home[- ]based|distributed)\b/i;

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

export type Salary = {
  min: number;
  max: number;
  text: string;
  currency?: "GBP" | "USD";
};

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
export function parseSalary(text: string, only?: "GBP" | "USD"): Salary | null {
  const re =
    /([£$])\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?(?:\s?(?:-|–|to)\s?[£$]?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?)?(?:\s*(?:per|a|an|\/)\s*(year|annum|yr|day|hour|hr|month))?/gi;
  for (const m of text.matchAll(re)) {
    const currency = m[1] === "$" ? "USD" : "GBP";
    if (only && currency !== only) continue;
    let lo = toNumber(m[2], m[3] ?? m[5]);
    let hi = m[4] ? toNumber(m[4], m[5] ?? m[3]) : lo;
    const per = (m[6] ?? "").toLowerCase();
    if (
      per === "day" ||
      (!per &&
        hi >= 150 &&
        hi < 2000 &&
        /day|daily/i.test(text.slice(m.index, m.index + 60)))
    ) {
      lo *= DAYS_A_YEAR;
      hi *= DAYS_A_YEAR;
    } else if (
      per === "hour" ||
      per === "hr" ||
      (!per &&
        hi < 150 &&
        /hour|hr\b|hourly/i.test(text.slice(m.index, m.index + 40)))
    ) {
      lo *= HOURS_A_YEAR;
      hi *= HOURS_A_YEAR;
    } else if (per === "month") {
      lo *= 12;
      hi *= 12;
    }
    if (lo < 12_000 || hi > 1_500_000 || hi < lo) continue;
    return {
      min: Math.round(lo),
      max: Math.round(hi),
      text: m[0].trim(),
      currency,
    };
  }
  return null;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string = "GBP",
): string | null {
  if (min == null) return null;
  const sym = currency === "USD" ? "$" : "£";
  const k = (n: number) => `${sym}${Math.round(n / 1000)}k`;
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
