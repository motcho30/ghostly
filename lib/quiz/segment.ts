import type { Answers } from "./types";

/**
 * Who this person is, for paywall copy. From the teardown: people unhappy in a
 * job and long searchers buy; brand-new and entry-level searchers mostly don't.
 */
export type Segment = "senior" | "urgent" | "switcher" | "casual";

export function segmentOf(a: Answers): Segment {
  if (a.level === "director" || a.level === "lead" || (a.salary ?? 0) >= 80_000)
    return "senior";
  const longSearch = a.searching === "3_6" || a.searching === "6_plus";
  if (a.status === "out_of_work" || (longSearch && a.start === "asap"))
    return "urgent";
  if (a.status === "employed") return "switcher";
  return "casual";
}

/** Applications sent and never answered, from the two quiz answers. */
export function ghostCount(
  a: Answers,
): { sent: number; ghosted: number } | null {
  if (a.sent == null || a.replyShare == null) return null;
  return { sent: a.sent, ghosted: Math.round(a.sent * (1 - a.replyShare)) };
}

export const PAIN_ECHO: Record<string, string> = {
  void: "never hearing back",
  crowd: "hundreds of applicants on every job",
  recruiter: "going silent after the final round",
};
