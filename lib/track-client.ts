"use client";

const SOURCE_KEY = "gl_source";

type Source = {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  entry?: string;
};

/**
 * Where this visit came from, worked out on the first page of the visit and kept
 * for the rest of it: the referring site's name only (never the full address),
 * any utm tags, and the page they landed on.
 */
function source(): Source {
  try {
    const saved = sessionStorage.getItem(SOURCE_KEY);
    if (saved) return JSON.parse(saved) as Source;
  } catch {
    // Storage blocked: work it out each time instead.
  }
  const s: Source = { entry: location.pathname };
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host && host !== location.hostname) s.ref = host.replace(/^www\./, "");
  } catch {
    // Ignore a malformed referrer.
  }
  const q = new URLSearchParams(location.search);
  for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = q.get(k);
    if (v) s[k] = v.slice(0, 80);
  }
  try {
    sessionStorage.setItem(SOURCE_KEY, JSON.stringify(s));
  } catch {
    // Ignore.
  }
  return s;
}

/** Fire-and-forget funnel event from the browser. Never send emails or names here. */
export function track(name: string, props: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({
      name,
      props: { ...props, path: location.pathname, ...source() },
    });
    if (navigator.sendBeacon)
      navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" }),
      );
    else
      void fetch("/api/events", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      });
  } catch {
    // Tracking must never break the page.
  }
}
