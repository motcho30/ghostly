import { NextResponse } from "next/server";

import { startSession } from "@/lib/auth";
import { currentLead } from "@/lib/leads";
import { claimStripeSession } from "@/lib/payments";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  const lead = await currentLead();
  const user = lead
    ? await claimStripeSession(sessionId, lead.id).catch(() => null)
    : null;
  if (!user) {
    // Paid on another device, or the session didn't check out: the email link still works.
    return NextResponse.redirect(new URL("/login?paid=1", url));
  }
  await startSession(user.id);
  return NextResponse.redirect(new URL("/welcome", url));
}
