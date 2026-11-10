import { eq } from "drizzle-orm";
import { z } from "zod";

import { anonId, referralCodeCookie } from "@/lib/cookies";
import { getDb, schema } from "@/lib/db";
import { track } from "@/lib/events";
import { assignArms } from "@/lib/experiments";
import { familyLabel } from "@/lib/jobs/families";
import { currentLead, validReferrer } from "@/lib/leads";
import {
  countMatches,
  familyFor,
  freshCount,
  type JobCardData,
  previewMatches,
} from "@/lib/match";
import { AnswersSchema } from "@/lib/quiz/schema";
import { segmentOf } from "@/lib/quiz/segment";

const { leads } = schema;

/** Never send a locked job's title or company to the browser, blurred or not. */
function redact(job: JobCardData): JobCardData {
  return {
    ...job,
    id: 0,
    title: "Hidden until you unlock",
    company: "Hidden company",
    companySlug: "",
    ghostReasons: [],
  };
}

const Post = z.object({
  answers: AnswersSchema,
  arms: z.record(z.string(), z.string()).optional(),
});

/** Quiz finished: store the lead, count real matches, return the result screen. */
export async function POST(req: Request) {
  const body = Post.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return Response.json({ error: "Bad answers" }, { status: 400 });
  const anon = await anonId();
  const answers = body.data.answers;
  // Forced arms (?arm_trial=...) are for testing only; production always uses the stable hash.
  const arms = assignArms(
    anon,
    process.env.NODE_ENV === "production" ? {} : (body.data.arms ?? {}),
  );
  const segment = segmentOf(answers);
  const [count, preview, fresh48] = await Promise.all([
    countMatches(answers),
    previewMatches(answers, 3),
    freshCount(answers, 48),
  ]);
  // A wider search for the empty state: same title, any level, salary or city.
  const broader =
    count > 0
      ? count
      : await countMatches({
          family: answers.family,
          titleText: answers.titleText,
          setting: answers.setting === "remote" ? "remote" : "any",
        });

  const db = await getDb();
  const existing = await currentLead();
  const referredBy =
    existing?.referredBy ?? (await validReferrer(await referralCodeCookie()));
  const values = {
    answers,
    arms,
    segment,
    matchCount: count,
    referredBy,
    updatedAt: new Date(),
  };
  const [lead] = await db
    .insert(leads)
    .values({ anonId: anon, ...values })
    .onConflictDoUpdate({ target: leads.anonId, set: values })
    .returning();

  await track("quiz_complete", { segment, count, arms }, { anonId: anon });
  const visible = arms.result === "one_visible" ? preview.slice(0, 1) : [];
  const fam = familyFor(answers);
  return Response.json({
    leadId: lead.id,
    count,
    broader,
    fresh48,
    segment,
    titleLabel: fam ? familyLabel(fam) : answers.titleText || "matching",
    visible,
    locked: preview.slice(visible.length).map(redact),
  });
}

const Patch = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  email: z.email().max(200).optional(),
});

export async function PATCH(req: Request) {
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return Response.json(
      { error: "Check that email address" },
      { status: 400 },
    );
  const lead = await currentLead();
  if (!lead)
    return Response.json({ error: "Start the quiz first" }, { status: 404 });
  const db = await getDb();
  await db
    .update(leads)
    .set({
      ...body.data,
      email: body.data.email?.toLowerCase(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id));
  await track(
    body.data.email ? "email_submit" : "name_submit",
    {},
    { anonId: lead.anonId },
  );
  return Response.json({ ok: true });
}
