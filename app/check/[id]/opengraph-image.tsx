import { ImageResponse } from "next/og";

import type { CheckFacts } from "@/lib/check/run";
import { getCheck } from "@/lib/check/run";
import { OgFrame } from "@/lib/og";
import { TONE_HEX, timingOf, verdictOf } from "@/lib/timing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Is this job worth applying to?";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const c = await getCheck((await params).id);
  if (!c)
    return new ImageResponse(
      <OgFrame
        eyebrow="Is it worth applying?"
        big="?"
        headline="Check any job, free"
      />,
      size,
    );
  const facts = c.facts as CheckFacts;
  const v = verdictOf({
    postedAt: facts.postedAt ?? null,
    reasons: c.reasons,
    score: c.score,
    now: c.createdAt,
  });
  const t = timingOf(facts.postedAt ?? null, c.createdAt);
  const what =
    [c.title, c.companyName].filter(Boolean).join(" at ") || "This job ad";
  return new ImageResponse(
    <OgFrame
      eyebrow="Is it worth applying?"
      big={v.label}
      bigSize={130}
      bigColor={TONE_HEX[v.tone]}
      headline={t.when}
      sub={what.length > 90 ? `${what.slice(0, 88)}…` : what}
      footer="Check any job, free"
    />,
    size,
  );
}
