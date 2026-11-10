"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { startSession } from "@/lib/auth";
import { flags } from "@/lib/brand";
import type { PlanId } from "@/lib/db/schema";
import { shortId, unsign } from "@/lib/ids";
import { leadById, leadOffer } from "@/lib/leads";
import { fulfil } from "@/lib/payments";

export async function completeTestCheckout(form: FormData) {
  if (flags.stripe())
    throw new Error("Test checkout is off while Stripe is connected");
  const data = unsign<{ leadId: string; planId: PlanId; exp: number }>(
    String(form.get("t") ?? ""),
  );
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!data || data.exp < Date.now() || !email.success) redirect("/plan");
  const lead = await leadById(data.leadId);
  if (!lead) redirect("/start");
  const offer = leadOffer(lead, data.planId);
  const user = await fulfil({
    leadId: lead.id,
    planId: data.planId,
    email: email.data,
    provider: "dev",
    providerRef: `dev_${shortId(12)}`,
    pricePence: offer.pricePence,
    firstChargePence: offer.firstChargePence,
  });
  // Same browser that paid: sign them straight in.
  await startSession(user.id);
  redirect("/welcome");
}
