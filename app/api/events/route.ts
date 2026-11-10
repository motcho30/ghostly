import { z } from "zod";

import { currentUser } from "@/lib/auth";
import { anonId } from "@/lib/cookies";
import { track } from "@/lib/events";

const Body = z.object({
  name: z.string().regex(/^[a-z0-9_]{2,48}$/),
  props: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const props = Object.fromEntries(
    Object.entries(parsed.data.props).slice(0, 20),
  );
  const me = await currentUser();
  await track(parsed.data.name, props, {
    anonId: await anonId(),
    userId: me?.user.id,
  });
  return new Response(null, { status: 204 });
}
