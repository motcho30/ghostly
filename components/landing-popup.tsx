"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/track-client";
import { GhostIcon } from "./ghost";
import { btn, cx } from "./ui";

const KEY = "gl_popup_seen";
const DELAY_MS = 2_000;
const QUIET_DAYS = 7;

/**
 * Two seconds after landing, once the headline has been read, one question with
 * one real number. Shown once a week at most; Escape, the cross, the backdrop
 * and "Not now" all close it.
 */
export function LandingPopup({
  fresh24,
  liveRoles,
  href,
}: {
  fresh24: number;
  liveRoles: number;
  href: string;
}) {
  const fmt = (n: number) => n.toLocaleString("en-GB");
  // A quiet day leads with the live total instead of a small number.
  const headline =
    fresh24 >= 20
      ? `${fmt(fresh24)} new jobs went live today.`
      : `${fmt(liveRoles)} live jobs, straight from employers.`;
  const [open, setOpen] = useState(false);
  const cta = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    try {
      const seen = Number(localStorage.getItem(KEY) ?? 0);
      if (Date.now() - seen < QUIET_DAYS * 86_400_000) return;
    } catch {
      // Storage blocked: still show it, just once this visit.
    }
    const t = setTimeout(() => {
      setOpen(true);
      track("popup_view");
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        // Ignore.
      }
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    cta.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close("escape");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // biome-ignore lint/correctness/useExhaustiveDependencies: close is stable enough here
  }, [open]);

  function close(how: string) {
    setOpen(false);
    track("popup_close", { how });
  }

  if (!open) return null;
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onClick={() => close("backdrop")}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        className="rise relative w-full max-w-[460px] rounded-3xl bg-white p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => close("x")}
          className="absolute top-4 right-4 rounded-full p-2 text-faint hover:text-text"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <GhostIcon className="float mx-auto h-12 w-12 text-violet" />
        <h2
          id="popup-title"
          className="mt-4 text-[26px] font-semibold leading-tight tracking-tight"
        >
          {headline} Be one of the first to apply.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Straight from company careers pages, before the crowd shows up.{" "}
          {fmt(liveRoles)} live roles across the UK and US. It takes 2 minutes
          to see yours.
        </p>
        <Link
          ref={cta}
          href={href}
          className={cx(btn.primary, "mt-6 w-full py-4 text-[16px]")}
          onClick={() => track("popup_cta")}
        >
          Show me my new roles <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => close("not_now")}
          className="mt-4 text-[15px] font-medium text-muted hover:text-text"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
