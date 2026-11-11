import { z } from "zod";

import type { Answers } from "./types";

/** Server-side check of quiz answers. Unknown keys are dropped. */
export const AnswersSchema = z.object({
  salary: z.number().int().min(10_000).max(500_000).optional(),
  workType: z.enum(["full_time", "part_time", "contract", "any"]).optional(),
  start: z.enum(["asap", "month", "quarter", "browsing"]).optional(),
  status: z
    .enum(["out_of_work", "employed", "self_employed", "student"])
    .optional(),
  searching: z.enum(["just_started", "1_3", "3_6", "6_plus"]).optional(),
  sent: z.number().int().min(0).max(5000).optional(),
  replyShare: z.number().min(0).max(1).optional(),
  wants: z.array(z.string().max(40)).max(10).optional(),
  setting: z.enum(["remote", "hybrid", "office", "any"]).optional(),
  level: z.enum(["entry", "mid", "senior", "lead", "director"]).optional(),
  family: z.string().max(40).optional(),
  titleText: z.string().max(80).optional(),
  pains: z.record(z.string().max(20), z.boolean()).optional(),
  city: z.string().max(60).optional(),
  country: z.enum(["GB", "US"]).optional(),
}) satisfies z.ZodType<Answers>;

export function decodeAnswers(param: string | null): Answers {
  if (!param) return {};
  try {
    const raw = JSON.parse(Buffer.from(param, "base64url").toString());
    const parsed = AnswersSchema.safeParse(raw);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
