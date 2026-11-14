import { ImageResponse } from "next/og";

import { POSTS, postBySlug } from "@/lib/blog/posts";
import { OgFrame } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ghostless blog";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = postBySlug((await params).slug);
  return new ImageResponse(
    <OgFrame
      eyebrow="Ghostless blog"
      big={post?.title ?? "Stop getting ghosted"}
      bigSize={58}
      headline=""
      sub={post?.description}
      footer="New roles the hour they go live"
    />,
    size,
  );
}
