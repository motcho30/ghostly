import type { Metadata } from "next";

import { JobsLanding, landingMetadata } from "@/components/jobs-landing";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return landingMetadata();
}

export default function JobsHub() {
  return <JobsLanding />;
}
