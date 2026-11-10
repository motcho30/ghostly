"use client";

import { Check, Copy, Download, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { track } from "@/lib/track-client";
import { btn, cx } from "./ui";

/** Logs one event when the page mounts. */
export function TrackView({
  name,
  props,
}: {
  name: string;
  props?: Record<string, unknown>;
}) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: one event per mount, not per render
  useEffect(() => {
    track(name, props);
  }, []);
  return null;
}

/** Counts down to a real deadline held on the server. Shows nothing once it passes. */
export function Countdown({
  until,
  className,
}: {
  until: string;
  className?: string;
}) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(until).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left == null) return <span className={className}>--:--:--</span>;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={cx("font-mono tabular-nums", className)}>
      {left === 0 ? "ended" : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  );
}

export function ShareButtons({
  url,
  text,
  image,
  event = "share",
}: {
  url: string;
  text: string;
  image?: string;
  event?: string;
}) {
  const [copied, setCopied] = useState(false);
  const full =
    typeof window === "undefined"
      ? url
      : new URL(url, window.location.origin).toString();
  const enc = encodeURIComponent;
  const open = (channel: string, href: string) => {
    track(event, { channel });
    window.open(href, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={btn.white}
        onClick={async () => {
          track(event, { channel: "native" });
          if (navigator.share) {
            await navigator.share({ text, url: full }).catch(() => undefined);
          } else {
            await navigator.clipboard.writeText(`${text} ${full}`);
            setCopied(true);
          }
        }}
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      <button
        type="button"
        className={btn.ghost}
        onClick={async () => {
          track(event, { channel: "copy" });
          await navigator.clipboard.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? (
          <Check className="h-4 w-4 text-mint" />
        ) : (
          <Copy className="h-4 w-4" />
        )}{" "}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        className={btn.ghost}
        onClick={() =>
          open(
            "x",
            `https://x.com/intent/post?text=${enc(text)}&url=${enc(full)}`,
          )
        }
      >
        X
      </button>
      <button
        type="button"
        className={btn.ghost}
        onClick={() =>
          open(
            "linkedin",
            `https://www.linkedin.com/sharing/share-offsite/?url=${enc(full)}`,
          )
        }
      >
        LinkedIn
      </button>
      <button
        type="button"
        className={btn.ghost}
        onClick={() =>
          open("whatsapp", `https://wa.me/?text=${enc(`${text} ${full}`)}`)
        }
      >
        WhatsApp
      </button>
      {image && (
        <a
          href={image}
          download
          className={btn.ghost}
          onClick={() => track(event, { channel: "story_image" })}
        >
          <Download className="h-4 w-4" /> Story image
        </a>
      )}
    </div>
  );
}

/** The bottom bar that appears once the visitor scrolls past the hero. */
export function StickyCta({
  label,
  href,
  line,
}: {
  label: string;
  href: string;
  line: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 520);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur transition-transform duration-300",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <p className="text-[13px] leading-tight text-muted">
          <span className="pulse-dot mr-1.5 inline-block h-2 w-2 rounded-full bg-mint" />
          {line}
        </p>
        <Link
          href={href}
          className={cx(btn.primary, "shrink-0 px-5 py-2.5 text-[14px]")}
          onClick={() => track("cta_click", { where: "sticky" })}
        >
          {label}
        </Link>
      </div>
    </div>
  );
}

export function CtaLink({
  href,
  children,
  where,
  className,
}: {
  href: string;
  children: React.ReactNode;
  where: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className ?? btn.primary}
      onClick={() => track("cta_click", { where })}
    >
      {children}
    </Link>
  );
}
