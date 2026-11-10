import { ImageResponse } from "next/og";

import { cardLines, parseCard } from "@/lib/ghost-card";
import { OgFrame } from "@/lib/og";

/** A 9:16 image for TikTok, Reels and Stories, downloaded from the share buttons. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/ghosted/[stats]/story">,
) {
  const c = parseCard((await params).stats);
  if (!c) return new Response("Not found", { status: 404 });
  const l = cardLines(c);
  return new ImageResponse(
    <OgFrame
      tall
      eyebrow="My Ghost Count"
      big={l.big}
      headline={l.headline}
      sub={l.sub}
    />,
    {
      width: 1080,
      height: 1920,
      headers: {
        "content-disposition": `attachment; filename="ghost-count-${c.ghosted}.png"`,
      },
    },
  );
}
