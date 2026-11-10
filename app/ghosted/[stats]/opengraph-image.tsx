import { ImageResponse } from "next/og";

import { cardLines, parseCard } from "@/lib/ghost-card";
import { OgFrame } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "A Ghost Count card: how many job applications never got a reply";

export default async function Image({
  params,
}: {
  params: Promise<{ stats: string }>;
}) {
  const c = parseCard((await params).stats) ?? {
    sent: 0,
    ghosted: 0,
    period: 0,
    unit: "months" as const,
  };
  const l = cardLines(c);
  return new ImageResponse(
    <OgFrame
      eyebrow="Ghost Count"
      big={l.big}
      headline={l.headline}
      sub={l.sub}
    />,
    size,
  );
}
