import { countMatches } from "@/lib/match";
import { decodeAnswers } from "@/lib/quiz/schema";

/** The live match counter in the quiz header. Answers come base64url-encoded in ?a=. */
export async function GET(req: Request) {
  const a = decodeAnswers(new URL(req.url).searchParams.get("a"));
  return Response.json(
    { count: await countMatches(a) },
    { headers: { "cache-control": "no-store" } },
  );
}
