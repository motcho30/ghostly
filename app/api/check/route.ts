import { z } from "zod";

import { CheckError, runCheck } from "@/lib/check/run";
import { anonId } from "@/lib/cookies";
import { track } from "@/lib/events";

const Body = z.object({
  url: z.url().max(2000).optional(),
  text: z.string().max(20_000).optional(),
});

// A small per-visitor limit so the free tool can't be used as a scraper.
const hits = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW = 60 * 60_000;

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success || (!body.data.url && !body.data.text?.trim())) {
    return Response.json(
      { error: "Paste a job link or the ad text." },
      { status: 400 },
    );
  }
  const anon = await anonId();
  const key = `${anon}:${req.headers.get("x-forwarded-for") ?? ""}`;
  const recent = (hits.get(key) ?? []).filter((t) => Date.now() - t < WINDOW);
  if (recent.length >= LIMIT)
    return Response.json(
      { error: "That's a lot of checks. Try again in an hour." },
      { status: 429 },
    );
  hits.set(key, [...recent, Date.now()]);

  try {
    const result = await runCheck({
      url: body.data.url,
      text: body.data.text,
      anonId: anon,
    });
    await track(
      "ghost_check",
      { band: result.band, source: result.facts.source },
      { anonId: anon },
    );
    return Response.json({ id: result.id });
  } catch (e) {
    if (e instanceof CheckError)
      return Response.json(
        { error: e.message, needText: true },
        { status: 422 },
      );
    console.error(e);
    return Response.json(
      { error: "Something went wrong reading that ad." },
      { status: 500 },
    );
  }
}
