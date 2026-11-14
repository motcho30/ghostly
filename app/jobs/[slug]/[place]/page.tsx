import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JobsLanding, landingMetadata } from "@/components/jobs-landing";
import { resolve } from "@/lib/seo/landing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/jobs/[slug]/[place]">): Promise<Metadata> {
  const { slug, place } = await params;
  const r = resolve(slug, place);
  return r ? landingMetadata(r.family, r.place) : {};
}

export default async function JobsByFamilyAndPlace({
  params,
}: PageProps<"/jobs/[slug]/[place]">) {
  const { slug, place } = await params;
  const r = resolve(slug, place);
  if (!r) notFound();
  return <JobsLanding family={r.family} place={r.place} />;
}
