import { AlertTriangle } from "lucide-react";

import type { GhostReason } from "@/lib/db/schema";
import {
  type Timing,
  type Tone,
  timingOf,
  type Verdict,
  verdictOf,
} from "@/lib/timing";
import { cx } from "./ui";

const toneClass: Record<Tone, string> = {
  mint: "border-mint/40 bg-mint/10 text-mint",
  amber: "border-amber/40 bg-amber/10 text-amber",
  coral: "border-coral/40 bg-coral/10 text-coral",
};

/** "Early · Posted 3 hours ago". The first thing on every role. */
export function TimingBadge({
  postedAt,
  timing,
  className,
}: {
  postedAt?: Date | string | null;
  timing?: Timing;
  className?: string;
}) {
  const t = timing ?? timingOf(postedAt);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium",
        toneClass[t.tone],
        className,
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full bg-current",
          t.key === "new" && "pulse-dot",
        )}
      />
      {t.label}
      <span className="opacity-70">· {t.when.replace("Posted ", "")}</span>
    </span>
  );
}

export function WarningTag({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-amber">
      <AlertTriangle className="h-3.5 w-3.5" />
      {count} warning sign{count === 1 ? "" : "s"}
    </span>
  );
}

/** Warning signs worth showing a job seeker: the ones that add risk, not the good news. */
export function warnings(reasons: GhostReason[]): GhostReason[] {
  return reasons.filter(
    (r) => r.points > 0 && !["age", "no_date", "fresh"].includes(r.key),
  );
}

/** The answer to "is it worth applying?", with timing and the reasons under it. */
export function VerdictCard({
  postedAt,
  reasons,
  score,
  verdict,
}: {
  postedAt: Date | string | null;
  reasons: GhostReason[];
  score: number;
  verdict?: Verdict;
}) {
  const v = verdict ?? verdictOf({ postedAt, reasons, score });
  const t = timingOf(postedAt);
  const signs = warnings(reasons);
  const good = reasons.filter((r) => r.points < 0);
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted">
        Worth applying?
      </p>
      <p
        className={cx(
          "mt-1 text-[34px] font-semibold leading-tight",
          v.tone === "mint"
            ? "text-mint"
            : v.tone === "amber"
              ? "text-amber"
              : "text-coral",
        )}
      >
        {v.label}
      </p>
      <p className="mt-1 text-[15px] leading-relaxed text-muted">{v.line}</p>
      <div className="mt-4">
        <TimingBadge timing={t} />
      </div>
      {(signs.length > 0 || good.length > 0) && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-[14px]">
          {signs.map((r) => (
            <li key={r.key} className="flex gap-2 text-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              {r.label}
            </li>
          ))}
          {good.map((r) => (
            <li key={r.key} className="flex gap-2 text-muted">
              <span className="mt-0.5 w-4 shrink-0 text-center text-mint">
                ✓
              </span>
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
