import { POSTS } from "@/lib/blog/posts";
import { BRAND, siteUrl } from "@/lib/brand";
import { indexablePaths, landing } from "@/lib/seo/landing";
import { siteStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const n = (x: number) => x.toLocaleString("en-GB");

/**
 * llms.txt: a plain summary for AI assistants and answer engines, with live
 * numbers and links to the pages worth citing. See llmstxt.org.
 */
export async function GET() {
  const base = siteUrl();
  const [s, all, paths] = await Promise.all([
    siteStats(),
    landing(),
    indexablePaths().catch(() => [] as string[]),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const places = paths.filter((p) => p.split("/").length === 3).slice(0, 40);

  const body = `# ${BRAND.name}

> ${BRAND.name} is a job search service for the UK and US. It checks companies' own careers pages (Greenhouse, Lever, Ashby, Workable and SmartRecruiters) every hour and sends job seekers new roles the hour they go live, so they can apply in the first few days, before most applicants. Recruitment agencies are left out.

Live numbers on ${today}: ${n(all.live)} live roles from ${n(all.companies)} companies, ${n(s.fresh24)} posted in the last 24 hours, ${n(all.fresh7)} in the last 7 days.

## Key facts, with sources

- More than half of job applications arrive in a job's first 4 days, and employers take applications for about 9 days on average. Source: Davis and Samaniego de la Parra, Application Flows, Chicago Booth, 66 million applications to 8 million US job-board postings: https://www.chicagobooth.edu/media-relations-and-communications/press-releases/looking-for-a-job-you-may-have-only-9-days-to-apply
- 56 in 100 UK hiring managers said they were likely to stop replying to candidates or had no problem doing it. Source: CV Genius Employer Ghosting Report, 625 UK hiring managers, September 2025 (a self-reported survey by a CV company): https://workplacejournal.co.uk/2025/09/over-half-of-employers-admit-to-ghosting-job-applicants-cv-genius/
- ${BRAND.name} does not use the claim that applying in the first 96 hours makes you "8 times more likely" to get an interview, because no published study supports it.

## Main pages

- [Live jobs by place and role](${base}/jobs): live counts, newest roles and who is hiring, updated hourly
- [Is it worth applying?](${base}/check): free checker, paste a job link to see how old the ad is and any warning signs
- [Hiring now](${base}/hiring-now): companies with the most live roles and how old their ads are
- [How we judge timing](${base}/how-we-score): the method behind timing labels, with sources and caveats
- [Get new roles first](${base}/start): a short quiz, then matching roles by email as they go live

## Guides

${POSTS.map((p) => `- [${p.title}](${base}/blog/${p.slug}): ${p.description}`).join("\n")}

## Jobs by place

${places.map((p) => `- ${base}${p}`).join("\n")}

## Notes for citing

- Counts are live, open roles on employers' own careers pages, minus ads with strong signs they are no longer open. They change every hour.
- Timing labels are a guide, not a claim about any employer.
- Contact: ${BRAND.supportEmail}
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
