import type { GhostReason } from "@/lib/db/schema";

/**
 * How early you'd be. The evidence (see /how-we-score): employers take
 * applications for about 9 days on average, and more than half of all
 * applications arrive in a job's first 4 days.
 */
export const EARLY_DAYS = 4;
export const WINDOW_DAYS = 9;
export const LATE_DAYS = 30;

export type Tone = "mint" | "amber" | "coral";
export type TimingKey = "new" | "early" | "open" | "late" | "stale" | "unknown";
export type Timing = {
  key: TimingKey;
  label: string;
  when: string;
  tone: Tone;
};

export function hoursSince(
  d: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d) : d;
  return Math.max(0, (now.getTime() - t.getTime()) / 3_600_000);
}

/** "3 hours ago", "2 days ago", "5 weeks ago". */
export function agoLabel(hours: number): string {
  if (hours < 1) return "under an hour ago";
  if (hours < 24)
    return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

export function timingOf(
  postedAt: Date | string | null | undefined,
  now = new Date(),
): Timing {
  const h = hoursSince(postedAt, now);
  if (h == null)
    return {
      key: "unknown",
      label: "Date unknown",
      when: "No posting date",
      tone: "amber",
    };
  const when = `Posted ${agoLabel(h)}`;
  const d = h / 24;
  if (h < 24) return { key: "new", label: "Just posted", when, tone: "mint" };
  if (d <= EARLY_DAYS)
    return { key: "early", label: "Early", when, tone: "mint" };
  if (d <= WINDOW_DAYS)
    return { key: "open", label: "Apply now", when, tone: "amber" };
  if (d <= LATE_DAYS)
    return { key: "late", label: "Late", when, tone: "amber" };
  return { key: "stale", label: "Stale", when, tone: "coral" };
}

export type VerdictKey =
  | "apply_now"
  | "apply_soon"
  | "long_shot"
  | "skip"
  | "unclear";
export type Verdict = {
  key: VerdictKey;
  label: string;
  line: string;
  tone: Tone;
};

const RED_FLAGS = new Set(["evergreen", "agency", "expired"]);

/**
 * Is it worth applying? Timing first, then the warning signs. A talent-pool
 * ad, an agency ad for an unnamed client or an expired page is a skip at any age.
 */
export function verdictOf(input: {
  postedAt: Date | string | null | undefined;
  reasons: GhostReason[];
  score: number;
  now?: Date;
}): Verdict {
  const now = input.now ?? new Date();
  const flags = input.reasons.filter((r) => RED_FLAGS.has(r.key));
  if (flags.length && input.score >= 45) {
    return {
      key: "skip",
      label: "Skip it",
      line: "It has the signs of an ad that isn't a real, open role right now.",
      tone: "coral",
    };
  }
  const h = hoursSince(input.postedAt, now);
  if (h == null) {
    return input.score >= 60
      ? {
          key: "skip",
          label: "Probably skip",
          line: "We can't tell how old it is, and it has other warning signs.",
          tone: "coral",
        }
      : {
          key: "unclear",
          label: "Can't tell",
          line: "We can't see when it was posted. Paste the full ad, including any 'Posted' line.",
          tone: "amber",
        };
  }
  const d = h / 24;
  const reposted = input.reasons.some((r) => r.key === "repost");
  if (d <= EARLY_DAYS && !reposted) {
    return {
      key: "apply_now",
      label: "Apply today",
      line: "You'd be early. Most people apply in a job's first few days, so don't wait.",
      tone: "mint",
    };
  }
  if (d <= WINDOW_DAYS) {
    return {
      key: "apply_soon",
      label: "Apply now",
      line: "Still inside the usual window. Employers often stop reading new applications after about 9 days.",
      tone: "amber",
    };
  }
  if (d <= LATE_DAYS) {
    return {
      key: "long_shot",
      label: "Long shot",
      line: "Most applications are already in. Apply only if you're a strong fit, and try to reach someone at the company directly.",
      tone: "amber",
    };
  }
  return {
    key: "skip",
    label: "Probably too late",
    line: "It has been up for over a month. The role may be filled, paused or kept open to collect CVs.",
    tone: "coral",
  };
}

export const TONE_HEX: Record<Tone, string> = {
  mint: "#6cf7b0",
  amber: "#ffc65c",
  coral: "#ff6b6b",
};
