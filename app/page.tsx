import { desc, eq } from "drizzle-orm";
import {
  BellRing,
  Building2,
  CalendarClock,
  Check,
  Clock,
  EyeOff,
  ListChecks,
  Mail,
  Search,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { CtaLink, StickyCta, TrackView } from "@/components/client";
import { GhostIcon } from "@/components/ghost";
import { JobCard } from "@/components/job-card";
import { Eyebrow, Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";
import { fmt } from "@/lib/format";
import { ghostIndex, showcaseJobs, siteStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

async function verifiedReviews() {
  const db = await getDb();
  return db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.verified, true))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(3);
}

export default async function Landing() {
  const [stats, showcase, index, reviews] = await Promise.all([
    siteStats(),
    showcaseJobs(3),
    ghostIndex(5),
    verifiedReviews(),
  ]);
  const hiring = [...index]
    .sort((a, b) => b.newThisWeek - a.newThisWeek)
    .slice(0, 5);

  return (
    <main className="glow flex flex-1 flex-col">
      <TrackView name="landing_view" />
      <SiteHeader />

      {/* Hero */}
      <Section className="pt-8 pb-14 text-center sm:pt-16">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-muted">
          <span className="pulse-dot h-2 w-2 rounded-full bg-mint" />
          <span>
            <span className="font-semibold text-text">
              {fmt(stats.liveRoles)} live roles
            </span>{" "}
            across the UK and US · {fmt(stats.fresh24)} new today
          </span>
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-[48px] font-semibold leading-[1.02] tracking-tight sm:text-[76px]">
          Stop getting{" "}
          <span className="font-serif font-normal italic text-mint">
            ghosted
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
          Applied to 100 jobs and heard nothing back? Most applications land in
          a job's first few days, so by the time you find it on a job board,
          you're often at the back of the pile. We send you new roles the hour
          they go live on the company's own site.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <CtaLink
            href="/start"
            where="hero"
            className={cx(btn.primary, "px-8 py-4 text-[16px]")}
          >
            {BRAND.cta}
          </CtaLink>
          <p className="text-[13px] text-faint">
            Free · About 2 minutes · No sign-up to see your matches
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
          {showcase.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-faint">
          Real roles, straight from company careers pages. They change every
          hour.
        </p>
      </Section>

      {/* Why nobody replies: sourced facts plus our own live count */}
      <Section className="pb-16">
        <Eyebrow>Why you never hear back</Eyebrow>
        <h2 className="mt-2 max-w-2xl text-[30px] font-semibold leading-tight tracking-tight">
          It's often not your CV. It's timing, and a lot of silence.
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              n: "56 in 100",
              l: "UK hiring managers say they'd stop replying to candidates",
              s: "CV Genius survey of 625 UK hiring managers, 2025",
            },
            {
              n: "4 days",
              l: "is when more than half of all applications are already in",
              s: "Chicago Booth study of 66 million applications",
            },
            {
              n: "9 days",
              l: "is how long employers typically keep taking applications",
              s: "Same study, US tech and finance job boards",
            },
          ].map((f) => (
            <div key={f.n} className={cx(card, "p-5")}>
              <div className="font-mono text-[36px] font-semibold tabular-nums text-text">
                {f.n}
              </div>
              <p className="mt-1 text-[15px] text-muted">{f.l}</p>
              <p className="mt-3 text-[12px] text-faint">{f.s}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-faint">
          Sources and caveats on{" "}
          <Link href="/how-we-score" className="underline">
            how we judge timing
          </Link>
          .
        </p>
      </Section>

      {/* Two free tools */}
      <Section className="pb-16">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cx(card, "flex flex-col p-6")}>
            <GhostIcon className="float h-12 w-12 text-violet" />
            <h2 className="mt-4 text-[22px] font-semibold">
              What's your Ghost Count?
            </h2>
            <p className="mt-1 flex-1 text-[15px] text-muted">
              How many employers never replied to you. Two minutes, then share
              it if you dare.
            </p>
            <CtaLink
              href="/start"
              where="ghostcount_card"
              className={cx(btn.white, "mt-5 self-start")}
            >
              Get my Ghost Count
            </CtaLink>
          </div>
          <div className={cx(card, "flex flex-col p-6")}>
            <Search className="h-12 w-12 text-mint" />
            <h2 className="mt-4 text-[22px] font-semibold">
              Is it worth applying?
            </h2>
            <p className="mt-1 flex-1 text-[15px] text-muted">
              Paste any job link. See when it was really posted and whether
              you'd be early or way too late.
            </p>
            <CtaLink
              href="/check"
              where="tool_card"
              className={cx(btn.ghost, "mt-5 self-start")}
            >
              Check a job, free
            </CtaLink>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section className="pb-16">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-2 text-[30px] font-semibold tracking-tight">
          Get there first. Get read.
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            {
              icon: Clock,
              c: "text-violet",
              t: "We check every hour",
              b: `${fmt(stats.companies)} employers' own careers pages across the UK and US, every hour. No job boards, no agencies in the middle.`,
            },
            {
              icon: Mail,
              c: "text-mint",
              t: "You hear within the hour",
              b: "New roles that match your salary, level, title and city, emailed the hour we find them.",
            },
            {
              icon: Zap,
              c: "text-amber",
              t: "You apply early",
              b: "Straight to the company, in the first days, while the pile is small and still being read.",
            },
            {
              icon: ListChecks,
              c: "text-coral",
              t: "We flag who ghosts",
              b: `Log what you apply to. No reply in ${BRAND.ghostAfterDays} days and we mark it, so everyone sees who replies.`,
            },
          ].map((s, i) => (
            <div key={s.t} className={cx(card, "p-5")}>
              <div className="flex items-center justify-between">
                <s.icon className={cx("h-5 w-5", s.c)} />
                <span className="font-mono text-[12px] text-faint">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                {s.b}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Them vs us */}
      <Section className="pb-16">
        <Eyebrow>Why you'll actually hear back</Eyebrow>
        <h2 className="mt-2 text-[30px] font-semibold tracking-tight">
          Job boards vs {BRAND.name}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className={cx(card, "p-5")}>
            <p className="font-semibold text-coral">Job boards</p>
            <ul className="mt-3 space-y-3 text-[15px] text-muted">
              {[
                "You see a role days later, after everyone else",
                "Old ads stay up and get bumped to look new",
                "Recruiters post the same role for an unnamed client",
                "No way to tell which companies ever reply",
                "Salary hidden until the third interview",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className={cx(card, "border-mint/30 p-5")}>
            <p className="font-semibold text-mint">{BRAND.name}</p>
            <ul className="mt-3 space-y-3 text-[15px] text-text">
              {[
                "New roles within the hour they go live",
                "The real posting date on every role",
                "Only direct from the company. No agencies",
                "Reply rates from members' own applications",
                "A salary filter that respects your target",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Benefits */}
      <Section className="pb-16">
        <Eyebrow>What members get</Eyebrow>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: BellRing,
              t: "Within-the-hour alerts",
              b: "New matching roles in your inbox the hour we find them. Nothing on quiet days.",
            },
            {
              icon: CalendarClock,
              t: "Real posting dates",
              b: "When the company first published it, not when a board last bumped it.",
            },
            {
              icon: Zap,
              t: "Worth applying?",
              b: "Every role says if you'd be early, on time or too late, and why.",
            },
            {
              icon: ListChecks,
              t: "Application tracker",
              b: `Log what you apply to. Silence for ${BRAND.ghostAfterDays} days gets marked as ghosted.`,
            },
            {
              icon: Building2,
              t: "Company reply rates",
              b: "How often members heard back from each company, once we have 5+ applications.",
            },
            {
              icon: EyeOff,
              t: "Stale ads hidden",
              b: `${fmt(stats.over30)} live ads are over a month old. You won't waste an evening on them.`,
            },
          ].map((b) => (
            <div key={b.t} className={cx(card, "p-5")}>
              <b.icon className="h-5 w-5 text-violet" />
              <h3 className="mt-3 font-semibold">{b.t}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">
                {b.b}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Who's hiring */}
      {hiring.length > 0 && (
        <Section className="pb-16">
          <Eyebrow>Hiring right now</Eyebrow>
          <h2 className="mt-2 text-[30px] font-semibold tracking-tight">
            Most new roles this week
          </h2>
          <div className={cx(card, "mt-6 divide-y divide-line")}>
            {hiring.map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.slug}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-[13px] text-muted">
                  {c.newThisWeek} new this week · {c.open} live
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/hiring-now"
            className={cx(btn.link, "mt-3 inline-block text-[14px]")}
          >
            See every company
          </Link>
        </Section>
      )}

      {/* Reviews: only real, verified ones */}
      <Section className="pb-16">
        <Eyebrow>Reviews</Eyebrow>
        {reviews.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className={cx(card, "p-5")}>
                <div className="text-amber">{"★".repeat(r.rating)}</div>
                <blockquote className="mt-2 text-[15px] leading-relaxed">
                  {r.body}
                </blockquote>
                <figcaption className="mt-3 text-[13px] text-muted">
                  {r.name}, {r.role}
                  {r.city ? `, ${r.city}` : ""}
                  {r.hiredAt
                    ? ` · hired ${r.hiredAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                    : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className={cx(card, "mt-4 p-6")}>
            <h3 className="text-[20px] font-semibold">
              No fake reviews. Ever.
            </h3>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              We're new, so this space is empty for now. Reviews here will come
              only from members who used {BRAND.name}, with their first name,
              role and hire date.{" "}
              <Link href="/legal/reviews" className="underline">
                Our reviews policy
              </Link>
              .
            </p>
          </div>
        )}
      </Section>

      {/* FAQ */}
      <Section className="pb-20">
        <Eyebrow>Questions</Eyebrow>
        <div className="mt-4 space-y-2">
          {[
            {
              q: "Why do I never hear back?",
              a: "Two big reasons. Most applications arrive in a job's first few days, and employers often stop reading new ones after about a week or two, so late applications can sit unread. And many employers simply don't reply to people they won't take forward. Neither is about you.",
            },
            {
              q: "Does applying early really help?",
              a: "Getting in before the pile builds up gives you the best chance of being read, but it isn't magic: being a good fit matters most. We get you there early so a good fit doesn't get lost at the bottom.",
            },
            {
              q: "Where do the jobs come from?",
              a: `Every role comes from the company's own careers page, which we check every hour, and the apply button takes you there. When a company removes an ad, it leaves ${BRAND.name} too.`,
            },
            {
              q: "Do you take a cut of my salary?",
              a: "No. You pay for the service, nothing else. Employers don't pay us either, so we have no reason to push you towards anyone.",
            },
            {
              q: "Can I cancel easily?",
              a: "Yes. Two clicks from your account page, and we email you before an intro week ends. You keep access until the end of the period you paid for.",
            },
          ].map((f) => (
            <details key={f.q} className={cx(card, "group p-5")}>
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="text-faint transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {f.a}
              </p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <CtaLink
            href="/start"
            where="footer"
            className={cx(btn.primary, "px-8 py-4 text-[16px]")}
          >
            {BRAND.cta}
          </CtaLink>
        </div>
      </Section>

      <SiteFooter />
      <StickyCta
        href="/start"
        label={BRAND.cta}
        line={`${fmt(stats.liveRoles)} live roles in the UK and US, ${fmt(stats.fresh24)} new today`}
      />
    </main>
  );
}
