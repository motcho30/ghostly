"use client";

/** Fire-and-forget funnel event from the browser. Never send emails or names here. */
export function track(name: string, props: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({
      name,
      props: { ...props, path: location.pathname },
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
