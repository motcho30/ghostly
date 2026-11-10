import type { PlanId } from "@/lib/db/schema";

/**
 * The live Stripe products each charge is filed under, so payments show by plan
 * in Stripe's reports. Amounts are still worked out per buyer on the server
 * (intro week, the one-time 20% offer), so checkout sends the amount and points
 * it at the product. IDs are not secret. Defaults are the live "ghostly"
 * account (created 10 Nov 2026); env vars override them, for example for a sandbox.
 */
export const STRIPE_PRODUCTS: Record<PlanId | "first_week", string> = {
  weekly: process.env.STRIPE_PRODUCT_WEEKLY ?? "prod_Vbbjh5qqZjVYRr",
  monthly: process.env.STRIPE_PRODUCT_MONTHLY ?? "prod_VbbjwhNx1cxfoY",
  lifetime: process.env.STRIPE_PRODUCT_LIFETIME ?? "prod_VbbjhxG0JpvUMP",
  first_week: process.env.STRIPE_PRODUCT_FIRST_WEEK ?? "prod_Vbbj5MWP0SbmMc",
};

/** The cancel-flow save offer: 50% off the next payment, once. */
export const STRIPE_SAVE_COUPON = process.env.STRIPE_COUPON_SAVE50 ?? "ghostless_save50";

/** Checkout form fields for a line item's product: the real product when we have it. */
export function productFields(index: number, key: PlanId | "first_week", fallbackName: string): Record<string, string> {
  const id = STRIPE_PRODUCTS[key];
  return id
    ? { [`line_items[${index}][price_data][product]`]: id }
    : { [`line_items[${index}][price_data][product_data][name]`]: fallbackName };
}
