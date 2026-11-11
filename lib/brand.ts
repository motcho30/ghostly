/** One place for the name and the promises we make. Rename the product here. */
export const BRAND = {
  name: "Ghostless",
  domain: "ghostless.co",
  supportEmail: "hello@ghostless.co",
  cta: "Get new roles first",
  /** Days without any reply before the tracker marks an application ghosted. */
  ghostAfterDays: 21,
  /** Shown on the paywall. Only keep it if the business will honour it. */
  guarantee:
    "Not useful in your first 7 days? Reply to any email and we refund you in full.",
} as const;

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3007").replace(/\/$/, "");
}

export const flags = {
  stripe: () => Boolean(process.env.STRIPE_SECRET_KEY),
  /** Off until EMAIL_SENDING_ENABLED is "true" and a Resend key is set. Emails are still kept in the outbox. */
  email: () =>
    process.env.EMAIL_SENDING_ENABLED === "true" &&
    Boolean(process.env.RESEND_API_KEY),
  devTools: () =>
    process.env.NODE_ENV !== "production" ||
    process.env.DEV_TOOLS_ENABLED === "true",
};
