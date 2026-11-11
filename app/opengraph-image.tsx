import { ImageResponse } from "next/og";

import { OgFrame } from "@/lib/og";
import { siteStats } from "@/lib/stats";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Stop getting ghosted. New UK and US roles the hour they go live.";
export const dynamic = "force-dynamic";

export default async function Image() {
  const s = await siteStats();
  return new ImageResponse(
    <OgFrame
      eyebrow="Applied to 100 jobs and heard nothing?"
      big="Stop getting ghosted."
      bigSize={104}
      headline="Be one of the first to apply."
      sub={`${s.fresh24.toLocaleString("en-GB")} new UK and US roles in the last 24 hours, straight from ${s.companies} companies' own careers pages.`}
      footer="New roles the hour they go live"
    />,
    size,
  );
}
