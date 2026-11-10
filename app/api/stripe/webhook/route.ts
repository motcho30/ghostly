import { handleStripeEvent, verifyStripeSignature } from "@/lib/payments";

/** Stripe calls this after checkout and on renewals and cancellations. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const payload = await req.text();
  if (
    !verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)
  ) {
    return new Response("Bad signature", { status: 400 });
  }
  await handleStripeEvent(JSON.parse(payload));
  return Response.json({ received: true });
}
