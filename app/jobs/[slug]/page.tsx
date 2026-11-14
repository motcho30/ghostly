import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JobsLanding, landingMetadata } from "@/components/jobs-landing";
import { resolve } from "@/lib/seo/landing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const r = resolve((await params).slug);
  return r ? landingMetadata(r.family, r.place) : {};
}

export default async function JobsBySlug({
  params,
}: PageProps<"/jobs/[slug]">) {
  const r = resolve((await params).slug);
  if (!r) notFound();
  return <JobsLanding family={r.family} place={r.place} />;
}
