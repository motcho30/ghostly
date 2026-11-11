import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, SiteFooter, SiteHeader } from "@/components/site";
import { BRAND } from "@/lib/brand";
import { PLANS, pounds } from "@/lib/pricing";

/**
 * First drafts in plain words. A UK consumer lawyer should review all four
 * before launch, the subscription page most of all.
 */
const DOCS: Record<string, { title: string; sections: [string, string][] }> = {
  terms: {
    title: "Terms of use",
    sections: [
      [
        "Who we are",
        `${BRAND.name} sends job seekers new UK and US roles from companies' own careers pages soon after they go live, with when each was posted and whether it looks worth applying to. Contact: ${BRAND.supportEmail}.`,
      ],
      [
        "What you get",
        "Paid plans unlock every matching role with its apply link, posting dates and verdicts, new-role emails, the application tracker and company reply rates. The job checker and the hiring pages are free.",
      ],
      [
        "What we don't promise",
        "We don't promise interviews, replies or a job. A verdict such as 'Probably too late' is a judgement from public facts, not a statement about any employer. We aren't a recruitment agency and don't apply on your behalf.",
      ],
      [
        "Employers",
        "We aren't affiliated with the companies shown. Their names and ads appear because they publish them openly. Companies can contact us to correct anything.",
      ],
      [
        "Your account",
        "One person per account. Don't scrape the site or resell the data. We can close accounts that do.",
      ],
      [
        "Changes",
        "If these terms change in a way that matters, we'll email members before it takes effect.",
      ],
    ],
  },
  privacy: {
    title: "Privacy",
    sections: [
      [
        "What we collect",
        "Your quiz answers, first name and email, the roles you save and the applications you log, plus anonymous usage events (which screens you saw) tied to a random id in a cookie.",
      ],
      [
        "What we don't do",
        "We never show your profile or answers to employers. We don't sell your data. Share cards hold only the numbers in the link, never your name or email.",
      ],
      [
        "Reply rates",
        "Your tracker updates feed company reply rates only as counts, and only once 5 or more applications to a company have waited 21 days.",
      ],
      [
        "Payments",
        "Payments go through Stripe. We never see or store your card details.",
      ],
      [
        "Emails",
        "Sign-in links, renewal reminders and new-role emails, which you can set to within the hour, once a day or off. Turn that off in your account.",
      ],
      [
        "Your rights",
        `Ask for a copy of your data or for us to delete it at ${BRAND.supportEmail}. UK GDPR applies.`,
      ],
    ],
  },
  subscriptions: {
    title: "Renewals and cancelling",
    sections: [
      [
        "Prices",
        PLANS.map(
          (p) =>
            `${p.label}: ${pounds(p.pricePence)}${p.per === "once" ? " once" : ` every ${p.per}`}`,
        ).join(". ") +
          ". Some new members get an intro first week for £1 or free, shown before you pay.",
      ],
      [
        "Renewals",
        "Weekly and monthly plans renew automatically at the price shown at checkout until you cancel. We email you before an intro week ends and before renewals.",
      ],
      [
        "Cancelling",
        "Two clicks from your account page: Cancel plan, then confirm. You keep access until the end of the period you've paid for. No phone calls, no forms.",
      ],
      ["Refunds", BRAND.guarantee],
      [
        "Your cooling-off right",
        "You have 14 days from signing up to cancel and ask for a refund. If you've used the service in that time we may keep a fair amount for the days you used.",
      ],
      [
        "Pausing",
        "You can pause for a month instead of cancelling. Nothing is charged while paused, and your tracker and saved roles stay.",
      ],
    ],
  },
  reviews: {
    title: "Reviews policy",
    sections: [
      [
        "Only real members",
        "Reviews on our site come only from people who paid for and used the service. We ask after a member logs an offer in their tracker.",
      ],
      [
        "Checked before they show",
        "Every review is checked by a person against the member's account before it appears. We show first name, role, city and hire month.",
      ],
      [
        "No incentives, no edits",
        "We don't pay or reward people for reviews, and we don't edit their words beyond removing personal details.",
      ],
      [
        "Bad reviews stay",
        "We don't hide reviews because they're critical. We remove a review only if it's fake, abusive or names a private person.",
      ],
      [
        "Fake reviews",
        "Writing, buying or commissioning fake reviews is banned under the Digital Markets, Competition and Consumers Act 2024. We don't do it and we remove any we find.",
      ],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const d = DOCS[(await params).doc];
  return { title: d?.title ?? "Legal" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const d = DOCS[(await params).doc];
  if (!d) notFound();
  return (
    <main className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Section className="max-w-2xl pt-6 pb-16">
        <h1 className="text-[32px] font-semibold tracking-tight">{d.title}</h1>
        <p className="mt-2 text-[13px] text-amber">
          Draft for legal review. Last updated 10 November 2026.
        </p>
        <div className="mt-6 space-y-6">
          {d.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-semibold">{h}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                {body}
              </p>
            </section>
          ))}
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
