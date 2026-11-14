import { resolve } from "@/lib/seo/landing";
import { jobsImage } from "@/lib/seo/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Live jobs from company careers pages";
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; place: string }>;
}) {
  const { slug, place } = await params;
  const r = resolve(slug, place);
  return jobsImage(r?.family, r?.place);
}
