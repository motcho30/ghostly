"use client";

import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";

import {
  logApplication,
  setApplicationStatus,
  toggleSave,
} from "@/app/app/actions";
import type { AppStatus } from "@/lib/db/schema";
import { track } from "@/lib/track-client";
import { btn, card, cx } from "./ui";

export function SaveButton({
  jobId,
  saved,
}: {
  jobId: number;
  saved: boolean;
}) {
  const [on, setOn] = useState(saved);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={on ? "Unsave" : "Save"}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn(!on);
        start(async () => setOn(await toggleSave(jobId)));
      }}
      className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"
    >
      {on ? (
        <BookmarkCheck className="h-5 w-5 text-mint" />
      ) : (
        <Bookmark className="h-5 w-5" />
      )}
    </button>
  );
}

/** Opens the company's own page, then asks whether they applied. Clicking is not applying. */
export function ApplyBox({
  jobId,
  url,
  company,
  logged,
}: {
  jobId: number;
  url: string;
  company: string;
  logged: boolean;
}) {
  const [asked, setAsked] = useState(false);
  const [done, setDone] = useState(logged);
  const [pending, start] = useTransition();
  return (
    <div className={cx(card, "p-4")}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(btn.primary, "w-full")}
        onClick={() => {
          track("apply_click", { jobId });
          setTimeout(() => setAsked(true), 600);
        }}
      >
        Apply on {company}'s site <ExternalLink className="h-4 w-4" />
      </a>
      {done ? (
        <p className="mt-3 text-center text-[14px] text-mint">
          In your tracker. We'll flag it if they go quiet.
        </p>
      ) : asked ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[14px] text-muted">Did you apply?</p>
          <button
            type="button"
            className={cx(btn.ghost, "px-4 py-2 text-[13px]")}
            disabled={pending}
            onClick={() =>
              start(async () => {
                await logApplication(jobId);
                setDone(true);
              })
            }
          >
            Yes, add to tracker
          </button>
        </div>
      ) : (
        <p className="mt-3 text-center text-[13px] text-faint">
          Goes straight to the company. No middleman.
        </p>
      )}
    </div>
  );
}

const STATUSES: { value: AppStatus; label: string }[] = [
  { value: "applied", label: "Applied, waiting" },
  { value: "heard_back", label: "Heard back" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "Ghosted" },
];

export function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: AppStatus;
}) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Status"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as AppStatus;
        setValue(next);
        start(() => setApplicationStatus(id, next));
      }}
      className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-text outline-none focus:border-mint"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
