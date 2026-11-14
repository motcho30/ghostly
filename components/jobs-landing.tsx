import type { Metadata } from "next";
import Link from "next/link";

import { CtaLink, TrackView } from "@/components/client";
import { TimingBadge } from "@/components/ghost-badge";
import { breadcrumbs, faqPage, JsonLd } from "@/components/json-ld";
import { Eyebrow, Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { BRAND, siteUrl } from "@/lib/brand";
import { fmt } from "@/lib/format";
import { formatSalary } from "@/lib/jobs/normalize";
import { type Landing, landing, liveCounts } from "@/lib/seo/landing";
import {
  MIN_INDEXED_ROLES,
  PLACES,
  type Place,
  pageHeading,
  pagePath,
  ROLE_FAMILIES,
  type RoleFamily,
} from "@/lib/seo/places";

const money = (n: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

const today = () =>
  new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export async function landingMetadata(
  family?: RoleFamily,
  place?: Place,
): Promise<Metadata> {
  const d = await landing(family, place);
  const heading = pageHeading(family, place);
  const path = pagePath(family, place);
  const recent =
    d.fresh24 > 0
      ? `${fmt(d.fresh24)} new today`
      : `${fmt(d.fresh7)} new this week`;
  const title = `${heading}: ${fmt(d.live)} live, ${recent}`;
  const description = `${fmt(d.live)} live ${heading.toLowerCase().replace(/ in .*/, "")} from ${fmt(d.companies)} companies' own careers pages. ${fmt(d.fresh7)} posted this week. Updated every hour, so you can apply first.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    robots:
      d.live >= MIN_INDEXED_ROLES ? undefined : { index: false, follow: true },
  };
}

function faqFor(
  d: Landing,
  family?: RoleFamily,
  place?: Place,
): { q: string; a: string }[] {
  const what = family ? `${family.noun} jobs` : "jobs";
  const remote = place?.kind === "remote" ? "remote " : "";
  const where = place ? ` in ${place.name}` : " in the UK and US";
  const out = [
    {
      q: `How many ${remote}${what} are there${where} right now?`,
      a: `${fmt(d.live)} live roles from ${fmt(d.companies)} companies' own careers pages, as of ${today()}. ${fmt(d.fresh24)} were posted in the last 24 hours and ${fmt(d.fresh7)} in the last 7 days. ${BRAND.name} checks these pages every hour.`,
    },
  ];
  const pay = d.salaries.filter((s) => s.n >= 5);
  out.push({
    q: `What do ${remote}${what}${where} pay?`,
    a: pay.length
      ? `${fmt(d.salaried)} of the ${fmt(d.live)} live ads show a salary. The middle of the advertised range is about ${pay.map((s) => `${money(s.median, s.currency)} a year (${fmt(s.n)} ${s.currency === "GBP" ? "UK" : "US"} ads)`).join(" and ")}. Ads that show a salary are not a random sample, so treat it as a rough guide.`
      : `Too few of these ads show a salary to give a fair figure. ${fmt(d.salaried)} of ${fmt(d.live)} list one.`,
  });
  if (d.top.length)
    out.push({
      q: `Which companies are hiring for ${remote}${what}${where}?`,
      a: `The most live roles right now are at ${d.top
        .slice(0, 5)
        .map((t) => `${t.name} (${t.n})`)
        .join(", ")}.`,
    });
  out.push({
    q: "When should I apply?",
    a: "As early as you can. A Chicago Booth study of 66 million applications found more than half arrive in a job's first 4 days, and employers take applications for about 9 days on average. Roles posted in the last few days are your best odds.",
  });
  return out;
}

function Related({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; n: number }[];
}) {
  if (!links.length) return null;
  return (
    <div>
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-[14px] hover:border-faint"
            >
              {l.label} <span className="text-faint">{fmt(l.n)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function JobsLanding({
  family,
  place,
}: {
  family?: RoleFamily;
  place?: Place;
}) {
  const [d, { count }] = await Promise.all([
    landing(family, place),
    liveCounts(),
  ]);
  const heading = pageHeading(family, place);
  const path = pagePath(family, place);
  const base = siteUrl();
  const faq = faqFor(d, family, place);

  const crumbs: [string, string][] = [
    ["Home", "/"],
    ["Jobs", "/jobs"],
  ];
  if (family && place)
    crumbs.push([
      `${family.noun.charAt(0).toUpperCase()}${family.noun.slice(1)} jobs`,
      pagePath(family),
    ]);
  if (path !== "/jobs") crumbs.push([heading, path]);

  // Other places for this family (or for all jobs), busiest first, same market first.
  const placeLinks = PLACES.filter((p) => p.slug !== place?.slug)
    .map((p) => ({
      p,
      n: count(family, p),
    }))
    .filter((x) => x.n >= MIN_INDEXED_ROLES)
    .sort(
      (a, b) =>
        Number(b.p.market === place?.market) -
          Number(a.p.market === place?.market) || b.n - a.n,
    )
    .slice(0, family || place ? 16 : PLACES.length)
    .map(({ p, n }) => ({
      href: pagePath(family, p),
      label:
        p.kind === "remote"
          ? `Remote, ${p.market === "GB" ? "UK" : "US"}`
          : p.kind === "country"
            ? p.market === "GB"
              ? "All UK"
              : "All US"
            : p.name,
      n,
    }));
  const familyLinks = ROLE_FAMILIES.filter((f) => f.slug !== family?.slug)
    .map((f) => ({ f, n: count(f, place) }))
    .filter((x) => x.n >= MIN_INDEXED_ROLES)
    .sort((a, b) => b.n - a.n)
    .map(({ f, n }) => ({
      href: pagePath(f, place),
      label: f.noun.charAt(0).toUpperCase() + f.noun.slice(1),
      n,
    }));

  return (
    <main className="glow flex min-h-dvh flex-col">
      <TrackView name="jobs_landing_view" props={{ path }} />
      <JsonLd data={breadcrumbs(base, crumbs)} />
      <JsonLd data={faqPage(faq)} />
      <SiteHeader />
      <Section className="max-w-3xl pt-4 pb-16">
        <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-muted">
          {crumbs.slice(1, -1).map(([name, href]) => (
            <span key={href}>
              <Link href={href} className="hover:text-text">
                {name}
              </Link>
              <span className="px-1.5 text-faint">/</span>
            </span>
          ))}
        </nav>
        <Eyebrow>Updated every hour</Eyebrow>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight">
          {heading}
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">
          {fmt(d.live)} live roles straight from {fmt(d.companies)} companies'
          own careers pages.{" "}
          {d.fresh24 > 0
            ? `${fmt(d.fresh24)} went live in the last 24 hours.`
            : `${fmt(d.fresh7)} went live in the last 7 days.`}
          Most applications arrive in a job's first few days, so the newest
          roles are at the top.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [fmt(d.live), "live roles"],
            [fmt(d.fresh24), "new in 24 hours"],
            [fmt(d.fresh7), "new this week"],
            [fmt(d.companies), "companies hiring"],
          ].map(([n, l]) => (
            <div key={l} className={cx(card, "p-4")}>
              <div className="font-mono text-[22px] font-semibold">{n}</div>
              <div className="text-[13px] text-muted">{l}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-[20px] font-semibold">Newest roles</h2>
        <ul className={cx(card, "mt-3 divide-y divide-line")}>
          {d.jobs.map((j) => {
            const pay = formatSalary(j.salaryMin, j.salaryMax, j.currency);
            return (
              <li
                key={j.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5"
              >
                <span className="min-w-0">
                  <Link
                    href="/start"
                    className="block font-medium hover:underline"
                  >
                    {j.title}
                  </Link>
                  <span className="text-[13px] text-muted">
                    <Link
                      href={`/companies/${j.companySlug}`}
                      className="hover:text-text hover:underline"
                    >
                      {j.company}
                    </Link>
                    {" · "}
                    {j.remote === "remote"
                      ? "Remote"
                      : (j.city ?? j.locationText?.split(/[;,]/)[0])}
                    {pay ? ` · ${pay}` : ""}
                  </span>
                </span>
                <TimingBadge postedAt={j.postedAt ?? j.firstSeenAt} />
              </li>
            );
          })}
          {d.jobs.length === 0 && (
            <li className="px-5 py-4 text-muted">
              No live roles here right now. New ones arrive every hour.
            </li>
          )}
        </ul>
        <div className={cx(card, "mt-4 border-violet/30 bg-violet/5 p-5")}>
          <p className="text-[15px] font-medium leading-relaxed">
            {d.live > d.jobs.length
              ? `${fmt(d.live - d.jobs.length)} more live roles here. `
              : ""}
            Get the ones that match you the hour they go live, with apply links,
            so you're one of the first to apply.
          </p>
          <CtaLink
            href="/start"
            where={`jobs:${path}`}
            className={cx(btn.primary, "mt-3")}
          >
            {BRAND.cta}
          </CtaLink>
        </div>

        {d.top.length > 0 && (
          <>
            <h2 className="mt-10 text-[20px] font-semibold">
              Who's hiring most
            </h2>
            <ul className={cx(card, "mt-3 divide-y divide-line")}>
              {d.top.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/companies/${t.slug}`}
                    className="flex justify-between px-5 py-3 hover:bg-surface-2"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-[14px] text-muted">
                      {fmt(t.n)} live
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-10 text-[20px] font-semibold">Questions</h2>
        <div className="mt-3 space-y-3">
          {faq.map((f) => (
            <div key={f.q} className={cx(card, "p-5")}>
              <h3 className="font-medium">{f.q}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                {f.a}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-8">
          <Related
            title={family ? `${pageHeading(family)} by place` : "By place"}
            links={placeLinks}
          />
          <Related
            title={place ? `Other roles in ${place.name}` : "By role"}
            links={familyLinks}
          />
        </div>

        <p className="mt-10 text-[12px] text-faint">
          Counts are live roles on companies' own careers pages (Greenhouse,
          Lever, Ashby, Workable and SmartRecruiters), checked every hour, minus
          ads with strong signs they're no longer open. Recruitment agencies are
          left out. Not affiliated with the companies shown.{" "}
          <Link href="/how-we-score" className="underline">
            How we judge timing
          </Link>
          .
        </p>
      </Section>
      <SiteFooter />
    </main>
  );
}
