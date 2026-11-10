import { z } from "zod";

import { track } from "@/lib/events";
import { currentLead } from "@/lib/leads";
import { checkoutUrl } from "@/lib/payments";

const Body = z.object({ plan: z.enum(["weekly", "monthly", "lifetime"]) });

/** Prices are always worked out here from the lead, never taken from the browser. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return Response.json({ error: "Pick a plan" }, { status: 400 });
  const lead = await currentLead();
  if (!lead)
    return Response.json({ error: "Take the quiz first" }, { status: 404 });
  try {
    const url = await checkoutUrl(lead, body.data.plan);
    await track(
      "checkout_redirect",
      { plan: body.data.plan },
      { anonId: lead.anonId },
    );
    return Response.json({ url });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Checkout is unavailable right now. Try again in a minute." },
      { status: 502 },
    );
  }
}
