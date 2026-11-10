import type { GhostBand, GhostReason } from "@/lib/db/schema";

/**
 * Ghost risk: how likely a job ad is to be stale, evergreen or never answered.
 * Every point comes from a fact we can show the user, so the score is always
 * explained by its reasons. It is a risk signal, never a claim about intent.
 */
export type GhostInput = {
  now: Date;
  /** When the employer first published it, or when we first saw it. */
  postedAt: Date | null;
  text: string;
  hasSalary: boolean;
  /** Times this company re-opened the same title after closing it. */
  repostCount: number;
  /** Share of this company's open UK ads older than 60 days, 0 to 1. */
  companyStaleShare?: number | null;
  /** Member applications to this company with any reply, when we have 5+. */
  memberReplies?: { applied: number; replied: number } | null;
  /** Text pasted from a job site, which can carry "Reposted" and "applicants" lines. */
  pasted?: boolean;
};

export type GhostResult = {
  score: number;
  band: GhostBand;
  reasons: GhostReason[];
};

// Talent-pool ads say so near the top. Careers-page boilerplate ("we're always looking for new
// ideas", "join our talent community") sits further down, so only the opening is checked.
const EVERGREEN =
  /\b(always (?:looking|on the lookout|keen to hear) (?:out )?(?:for|from) (?:talented |great |exceptional |brilliant |strong |passionate |amazing |outstanding |new )?(?:people|talent|candidates|individuals|applicants|engineers|professionals)|(?:build|building|join|for) (?:our|a) talent pool|future (?:vacancies|openings)|pipeline (?:role|requisition)|evergreen (?:role|requisition|posting|position)|general application|speculative application|register your interest|expression of interest|no (?:current|specific) vacanc)/i;
const EVERGREEN_WINDOW = 1500;
const AGENCY =
  /\b(our client|on behalf of (?:our|a) client|my client|recruitment agency|recruitment consultancy|we are recruiting for|client is (?:a|an|looking)|exciting opportunity has arisen for)\b/i;
const REPOSTED =
  /\breposted\s+(\d+)?\s*(minute|hour|day|week|month)s?\s+ago\b/i;
const POSTED_AGO =
  /\b(?:posted|active)\s+(\d+)\+?\s*(day|week|month)s?\s+ago\b|\b(30)\+\s*days?\s+ago\b/i;
const APPLICANTS =
  /\b(?:over\s+)?(\d{2,4})\+?\s+(?:applicants|people (?:clicked|applied))\b/i;

export const MIN_MEMBER_APPS = 5;

function ageDays(now: Date, at: Date): number {
  return Math.max(0, Math.floor((now.getTime() - at.getTime()) / 86_400_000));
}

/** "Posted 3 weeks ago" in pasted text, as days. */
export function pastedAgeDays(text: string): number | null {
  const m = text.match(POSTED_AGO);
  if (!m) return null;
  if (m[3]) return 30;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  return unit === "day" ? n : unit === "week" ? n * 7 : n * 30;
}

export function bandOf(score: number): GhostBand {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function scoreGhost(input: GhostInput): GhostResult {
  const reasons: GhostReason[] = [];
  const add = (key: string, label: string, points: number) =>
    reasons.push({ key, label, points });

  const age = input.postedAt
    ? ageDays(input.now, input.postedAt)
    : input.pasted
      ? pastedAgeDays(input.text)
      : null;
  if (age != null) {
    if (age > 90)
      add(
        "age",
        `Open for ${age} days. Most live roles close well before 90`,
        45,
      );
    else if (age > 60) add("age", `Open for ${age} days`, 35);
    else if (age > 30) add("age", `Open for ${age} days`, 22);
    else if (age > 14) add("age", `Posted ${age} days ago`, 8);
    else
      add(
        "fresh",
        age <= 1 ? "Posted in the last day" : `Posted ${age} days ago`,
        -5,
      );
  } else {
    add("no_date", "No posting date we can confirm", 10);
  }

  if (input.repostCount > 0) {
    add(
      "repost",
      `Re-opened ${input.repostCount === 1 ? "once" : `${input.repostCount} times`} after closing`,
      Math.min(30, 15 + input.repostCount * 5),
    );
  } else if (input.pasted) {
    const r = input.text.match(REPOSTED);
    if (r) add("repost", "Marked as reposted on the job site", 20);
  }

  if (!input.hasSalary) add("no_salary", "No salary in the ad", 10);
  else add("salary", "Salary listed upfront", -5);

  if (EVERGREEN.test(input.text.slice(0, EVERGREEN_WINDOW)))
    add(
      "evergreen",
      "Talent-pool wording such as 'always looking' or 'future opportunities'",
      25,
    );
  if (AGENCY.test(input.text))
    add("agency", "Written by a recruiter for an unnamed client", 15);

  const length = input.text.replace(/\s+/g, " ").trim().length;
  if (length > 0 && length < 700)
    add("thin", "Very short ad with few details about the role", 10);

  if (input.companyStaleShare != null && input.companyStaleShare >= 0.5) {
    add(
      "company_stale",
      `${Math.round(input.companyStaleShare * 100)} in 100 of this company's UK ads are over 60 days old`,
      10,
    );
  }

  const m = input.memberReplies;
  if (m && m.applied >= MIN_MEMBER_APPS) {
    const rate = m.replied / m.applied;
    const line = `Members heard back on ${m.replied} of ${m.applied} applications here`;
    if (rate < 0.15) add("member_ghosting", line, 15);
    else if (rate >= 0.4) add("member_replies", line, -10);
  }

  if (input.pasted) {
    const a = input.text.match(APPLICANTS);
    if (a && Number(a[1]) >= 100)
      add("crowded", `${a[1]}+ applicants already`, 5);
  }

  const raw = reasons.reduce((s, r) => s + r.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  reasons.sort((a, b) => b.points - a.points);
  return { score, band: bandOf(score), reasons };
}

export const BAND_COPY: Record<GhostBand, { label: string; short: string }> = {
  low: { label: "Looks live", short: "Low ghost risk" },
  medium: { label: "Some warning signs", short: "Medium ghost risk" },
  high: { label: "High ghost risk", short: "High ghost risk" },
};
