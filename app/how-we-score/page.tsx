import type { Metadata } from "next";

import { CtaLink } from "@/components/client";
import { Eyebrow, Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { MIN_MEMBER_APPS } from "@/lib/ghost/score";
import { EARLY_DAYS, LATE_DAYS, WINDOW_DAYS } from "@/lib/timing";

export const metadata: Metadata = {
  title: "How we judge timing",
  description:
    "How we decide whether a job is worth applying to: when it was posted, the usual application window, and the warning signs. With sources.",
};

const TIMING: [string, string, string][] = [
  [
    "Just posted",
    "Under 24 hours",
    "The best moment to apply. Our alerts aim to get these to you within the hour.",
  ],
  [
    "Early",
    `Up to ${EARLY_DAYS} days`,
    "Inside the window when more than half of all applications usually arrive. Apply today.",
  ],
  [
    "Apply now",
    `${EARLY_DAYS + 1} to ${WINDOW_DAYS} days`,
    "Still inside the typical application window, but it's closing.",
  ],
  [
    "Late",
    `${WINDOW_DAYS + 1} to ${LATE_DAYS} days`,
    "Most applications are in. Worth it only if you're a strong fit.",
  ],
  [
    "Stale",
    `Over ${LATE_DAYS} days`,
    "The role may be filled, paused or kept open to collect CVs. Hidden by default when it has other warning signs.",
  ],
];

const SIGNS: [string, string][] = [
  [
    "Re-opened after closing",
    "The same title at the same company closed and came back within 120 days. Counts only from the day we started tracking.",
  ],
  [
    "Talent-pool wording",
    "Phrases like 'always looking', 'talent pool', 'future opportunities' or 'register your interest'. These are rarely a live opening.",
  ],
  [
    "Recruiter for an unnamed client",
    "Phrases like 'our client'. Rare in our feed, since every role comes from the company itself.",
  ],
  [
    "No salary in the ad",
    "Not a red flag on its own, but worth knowing before you spend an evening on it.",
  ],
  [
    "Very short ad",
    "Under about 700 characters, with little about the actual job.",
  ],
  [
    "Company's ads are mostly old",
    "Half or more of the company's live ads are over 60 days old, when it has at least 5.",
  ],
  [
    "Members rarely hear back",
    `Under 15 in 100 member applications got any reply, once ${MIN_MEMBER_APPS} or more have waited ${BRAND.ghostAfterDays} days.`,
  ],
  [
    "Ad says it has expired",
    "Job checker only: the page's own data says the closing date has passed.",
  ],
];

const SOURCES: {
  claim: string;
  source: string;
  href: string;
  caveat: string;
}[] = [
  {
    claim:
      "More than half of applications arrive in a job's first 4 days, and employers take applications for about 9 days on average.",
    source:
      "Davis and Samaniego de la Parra, Application Flows, Chicago Booth: 66 million applications to 8 million postings",
    href: "https://www.chicagobooth.edu/media-relations-and-communications/press-releases/looking-for-a-job-you-may-have-only-9-days-to-apply",
    caveat:
      "US job boards, mostly tech and finance roles. It shows when applications arrive, not interview odds.",
  },
  {
    claim:
      "56 in 100 UK hiring managers said they were likely to stop replying to candidates or had no problem doing it.",
    source:
      "CV Genius Employer Ghosting Report, 625 UK hiring managers, September 2025",
    href: "https://workplacejournal.co.uk/2025/09/over-half-of-employers-admit-to-ghosting-job-applicants-cv-genius/",
    caveat:
      "Run by a CV-builder company, and it's what managers said, not what they did.",
  },
];

export default function HowWeScore() {
  return (
    <main className="glow flex min-h-dvh flex-col">
      <SiteHeader />
      <Section className="max-w-3xl pt-6 pb-16">
        <Eyebrow>Method</Eyebrow>
        <h1 className="mt-2 text-[36px] font-semibold tracking-tight">
          How we judge timing
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">
          Every role gets two things: a timing label from when the company first
          published it, and any warning signs we can see in the ad. Together
          they answer one question: is it worth applying, and how soon?
        </p>

        <h2 className="mt-8 text-[22px] font-semibold">Timing</h2>
        <div className={cx(card, "mt-3 divide-y divide-line")}>
          {TIMING.map(([label, when, what]) => (
            <div
              key={label}
              className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_150px_1fr]"
            >
              <p className="font-medium">{label}</p>
              <p className="font-mono text-[14px] text-amber">{when}</p>
              <p className="text-[14px] text-muted">{what}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-[22px] font-semibold">Warning signs</h2>
        <div className={cx(card, "mt-3 divide-y divide-line")}>
          {SIGNS.map(([what, how]) => (
            <div key={what} className="px-5 py-4">
              <p className="font-medium">{what}</p>
              <p className="mt-0.5 text-[14px] text-muted">{how}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-[22px] font-semibold">
          The evidence behind it
        </h2>
        <div className="mt-3 space-y-3">
          {SOURCES.map((s) => (
            <div key={s.href} className={cx(card, "p-5")}>
              <p className="font-medium">{s.claim}</p>
              <p className="mt-2 text-[14px] text-muted">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {s.source}
                </a>
              </p>
              <p className="mt-1 text-[13px] text-faint">Caveat: {s.caveat}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          You'll see claims online that applying in the first 96 hours makes you
          "8 times more likely" to get an interview. We don't use that number:
          it comes from one company's analysis with no published study behind
          it. What the evidence does show is that the window is short and most
          people apply early.
        </p>

        <h2 className="mt-8 text-[22px] font-semibold">
          What a verdict is not
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          It's a guide, not a promise. An old ad can be a real, hard-to-fill
          role, and an early application still needs to be a good fit. We don't
          say any company posts fake jobs: we show when its ads went up and how
          often members heard back.
        </p>
        <h2 className="mt-8 text-[22px] font-semibold">
          Where the roles come from
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Companies' own public careers boards (Greenhouse, Lever and Ashby),
          checked every hour. When a company takes an ad down, it leaves{" "}
          {BRAND.name} on the next check.
        </p>
        <div className="mt-10 text-center">
          <CtaLink href="/check" where="method" className={btn.white}>
            Check a job
          </CtaLink>
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
