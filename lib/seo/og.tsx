import { ImageResponse } from "next/og";

import { OgFrame } from "@/lib/og";
import { landing } from "@/lib/seo/landing";
import { type Place, pageHeading, type RoleFamily } from "@/lib/seo/places";

const size = { width: 1200, height: 630 };

/** Shared by every /jobs page: the live count, big, with the page's heading. */
export async function jobsImage(family?: RoleFamily, place?: Place) {
  const d = await landing(family, place);
  return new ImageResponse(
    <OgFrame
      eyebrow={pageHeading(family, place)}
      big={d.live.toLocaleString("en-GB")}
      headline="live roles, straight from company careers pages"
      sub={`${d.fresh7.toLocaleString("en-GB")} posted this week. Updated every hour, so you can apply first.`}
      footer="Stop getting ghosted"
    />,
    size,
  );
}
