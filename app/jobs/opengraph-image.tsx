import { jobsImage } from "@/lib/seo/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Live jobs from company careers pages";
export const dynamic = "force-dynamic";

export default function Image() {
  return jobsImage();
}
