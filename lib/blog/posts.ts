/**
 * The blog. Each post targets one question people type into Google when a job
 * search goes quiet. Only two outside facts are used, both with their caveats
 * (see /how-we-score): the Chicago Booth application-flow study and the CV
 * Genius employer survey. Everything else is plain advice or our own method.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "cta"; text: string; href: string; label: string };

export type Post = {
  slug: string;
  title: string;
  /** The search result snippet. Under about 155 characters. */
  description: string;
  keywords: string[];
  published: string;
  readMinutes: number;
  body: Block[];
};

export const SOURCES = {
  booth: {
    name: "Chicago Booth study of 66 million applications",
    href: "https://www.chicagobooth.edu/media-relations-and-communications/press-releases/looking-for-a-job-you-may-have-only-9-days-to-apply",
  },
  cvGenius: {
    name: "CV Genius Employer Ghosting Report, September 2025",
    href: "https://workplacejournal.co.uk/2025/09/over-half-of-employers-admit-to-ghosting-job-applicants-cv-genius/",
  },
} as const;

export const POSTS: Post[] = [
  {
    slug: "why-am-i-not-hearing-back-from-job-applications",
    title: "Why am I not hearing back from job applications?",
    description:
      "Sent dozens of applications and heard nothing? The most common reasons, which ones you can fix, and the one most people miss: timing.",
    keywords: [
      "not hearing back from job applications",
      "no response to job applications",
      "why no reply after applying",
    ],
    published: "2026-11-14",
    readMinutes: 6,
    body: [
      {
        type: "p",
        text: "You've sent 30, 50, maybe 100 applications. A few automatic emails came back. Everything else is silence. It's easy to decide your CV is the problem. Sometimes it is. Often it isn't.",
      },
      {
        type: "p",
        text: "Here are the real reasons applications go unanswered, roughly in the order they cost you replies.",
      },
      { type: "h2", text: "1. You applied after the crowd" },
      {
        type: "p",
        text: "A study from Chicago Booth looked at 66 million applications to 8 million job ads. More than half of all applications arrived in a job's first 4 days, and employers took applications for about 9 days on average. By the time you see an ad that has been up for three weeks, the hiring team may already have a shortlist.",
      },
      {
        type: "p",
        text: "Being late doesn't say anything about you. But it means your CV is read, if at all, by someone who is already busy with the people who applied first.",
      },
      {
        type: "cta",
        text: "We send new roles from company careers pages the hour they go live, so you're in the first wave.",
        href: "/start",
        label: "Get new roles first",
      },
      { type: "h2", text: "2. The employer simply doesn't reply" },
      {
        type: "p",
        text: "In a September 2025 survey of 625 UK hiring managers by CV Genius, 56 in 100 said they were likely to stop replying to candidates or had no problem doing it. That's what managers said, not a count of what they did, and the survey was run by a CV company. Still, it matches what most job seekers live through: silence is often policy, not a verdict on you.",
      },
      { type: "h2", text: "3. The role isn't really open any more" },
      {
        type: "p",
        text: "Some ads stay up after the job is filled or paused. Others are 'talent pool' ads that collect CVs for later. Warning signs: phrases like 'always looking' or 'future opportunities', no salary, a very short description, or an ad that has been live for months.",
      },
      { type: "h2", text: "4. Your CV doesn't match the ad's words" },
      {
        type: "p",
        text: "Screeners, human or software, look for the skills the ad names. If the ad says 'stakeholder management' and your CV says 'worked with teams across the business', you may be passed over. Mirror the ad's key terms where they're true for you.",
      },
      {
        type: "h2",
        text: "5. You're applying to roles a level too high or too low",
      },
      {
        type: "p",
        text: "Senior roles get senior applicants. Junior roles flag overqualified ones. Aim for roles where you meet most of the must-haves, not all of the nice-to-haves.",
      },
      { type: "h2", text: "What to do this week" },
      {
        type: "list",
        items: [
          "Only apply to roles posted in the last 4 days, unless you're a near-perfect fit.",
          "Check an ad before you spend an evening on it: when was it posted, is there a salary, any talent-pool wording?",
          "Tailor the top third of your CV to the ad's key terms.",
          "Track where you applied and when, so you know which companies never reply.",
        ],
      },
      {
        type: "cta",
        text: "Not sure an ad is worth it? Paste the link and we'll tell you how old it is and what to watch for.",
        href: "/check",
        label: "Check a job",
      },
    ],
  },
  {
    slug: "how-long-to-hear-back-after-applying-for-a-job",
    title: "How long does it take to hear back after applying for a job?",
    description:
      "How long employers take to reply, when silence means no, and when it's worth following up. Plain answers, with the evidence behind them.",
    keywords: [
      "how long to hear back after applying",
      "how long does it take to hear back from a job",
      "when to follow up on a job application",
    ],
    published: "2026-11-14",
    readMinutes: 5,
    body: [
      {
        type: "p",
        text: "There's no single answer, because every company hires differently. But there are patterns that tell you when to keep waiting and when to move on.",
      },
      { type: "h2", text: "The short version" },
      {
        type: "list",
        items: [
          "Most hiring teams review applications while the ad is still open, usually within the first one to two weeks.",
          "If you hear nothing within two weeks of the ad closing, treat it as a no and keep going.",
          "After three weeks of silence, it's very unlikely to change. We mark an application as ghosted at 21 days for that reason.",
        ],
      },
      { type: "h2", text: "Why the first two weeks matter most" },
      {
        type: "p",
        text: "Chicago Booth researchers studied 66 million applications and found that employers took applications for about 9 days on average, with more than half arriving in the first 4 days. Shortlists form fast. If your application landed in that first wave, you're most likely to hear back in the same couple of weeks.",
      },
      {
        type: "p",
        text: "If you applied late, the timeline is less predictable. The team may be interviewing people who applied before you and only look at later CVs if the first round falls through.",
      },
      { type: "h2", text: "When silence means no" },
      {
        type: "p",
        text: "In a 2025 CV Genius survey of 625 UK hiring managers, 56 in 100 said they were likely to stop replying to candidates or had no problem doing it. So a lack of a rejection email doesn't mean you're still in the running. It often just means nobody sent one.",
      },
      { type: "h2", text: "Should you follow up?" },
      {
        type: "p",
        text: "Yes, once, if you can find a named person. A short note 7 to 10 days after applying is fine:",
      },
      {
        type: "list",
        items: [
          "Say which role you applied for and when.",
          "Add one line on why you're a strong fit.",
          "Ask if there's a timeline for next steps.",
        ],
      },
      {
        type: "p",
        text: "Don't chase more than once. If there's no reply, put your energy into the next new role instead.",
      },
      {
        type: "cta",
        text: "The fastest way to hear back is to apply early. We send you new roles the hour they go live.",
        href: "/start",
        label: "Get new roles first",
      },
    ],
  },
  {
    slug: "best-time-to-apply-for-a-job",
    title: "The best time to apply for a job (it's sooner than you think)",
    description:
      "More than half of applications arrive in a job's first 4 days. Why applying early matters, and how to be one of the first to apply.",
    keywords: [
      "best time to apply for a job",
      "should I apply for a job early",
      "how soon to apply after job is posted",
    ],
    published: "2026-11-14",
    readMinutes: 5,
    body: [
      {
        type: "p",
        text: "Forget the advice about applying on a Tuesday morning. The time that matters is how many days the ad has been live.",
      },
      { type: "h2", text: "What the evidence says" },
      {
        type: "p",
        text: "A Chicago Booth study of 66 million applications to 8 million job ads found that more than half of applications arrived in the first 4 days after a job was posted. Employers took applications for about 9 days on average before the flow dried up.",
      },
      {
        type: "p",
        text: "The study used US job boards, mostly tech and finance roles, and it measures when applications arrive, not who gets the interview. But the logic carries: a hiring manager reading the first 30 CVs is in a very different mood from one reading CV number 400.",
      },
      {
        type: "p",
        text: "You'll see claims that applying in the first 96 hours makes you '8 times more likely' to get an interview. We don't repeat that number, because there's no published study behind it. The safe takeaway is simpler: the window is short, and most people apply early.",
      },
      { type: "h2", text: "A simple rule of thumb" },
      {
        type: "list",
        items: [
          "Under 24 hours: the best moment. Apply today.",
          "Up to 4 days: still in the first wave. Apply today.",
          "5 to 9 days: inside the usual window, but closing. Apply now.",
          "10 to 30 days: most applications are in. Only if you're a strong fit.",
          "Over 30 days: the role may be filled or paused. Check it first.",
        ],
      },
      { type: "h2", text: "Why job boards make you late" },
      {
        type: "p",
        text: "Job boards and aggregators can pick up a role after it appears on the company's own careers page, and some show a 'posted' date that resets when an ad is reposted. Either way, you can end up seeing it after the first wave has applied.",
      },
      {
        type: "p",
        text: "The fix is to go to the source. Companies post new roles on their own careers pages first, usually through systems like Greenhouse, Lever, Ashby, Workable and SmartRecruiters.",
      },
      {
        type: "cta",
        text: "We check company careers pages every hour across the UK and US, and send you the new roles that match.",
        href: "/start",
        label: "Get new roles first",
      },
      { type: "h2", text: "How to apply fast without applying badly" },
      {
        type: "list",
        items: [
          "Keep a master CV and a 3-line summary you can tailor in 10 minutes.",
          "Save answers to common questions (why this company, salary expectations, notice period).",
          "Set alerts for the job titles and cities you actually want, so you're not scrolling.",
        ],
      },
    ],
  },
  {
    slug: "ghosted-by-employer-after-applying",
    title: "Ghosted by an employer? What it means and what to do next",
    description:
      "Applied, interviewed, then silence. Why employers ghost candidates, how long to wait, what to send, and how to stop it costing you time.",
    keywords: [
      "ghosted by employer",
      "ghosted after interview",
      "employer stopped responding",
    ],
    published: "2026-11-14",
    readMinutes: 6,
    body: [
      {
        type: "p",
        text: "Being ghosted by an employer is when they stop replying without telling you where you stand. It can happen after you apply, after a phone screen, or even after a final interview. It's frustrating, and it's common.",
      },
      { type: "h2", text: "How common is it?" },
      {
        type: "p",
        text: "In a September 2025 survey of 625 UK hiring managers by CV Genius, 56 in 100 said they were likely to stop replying to candidates or had no problem doing it. It's a self-reported survey run by a CV company, so treat it as a sign of attitude rather than an exact rate. But it tells you this: being ghosted is usually about how the company runs hiring, not about you.",
      },
      { type: "h2", text: "Why employers go quiet" },
      {
        type: "list",
        items: [
          "They picked someone who applied earlier and never closed the loop with everyone else.",
          "The role was paused, re-scoped or lost its budget.",
          "The hiring manager is waiting on someone else to decide.",
          "They get hundreds of applications and don't reply to any that aren't moving forward.",
        ],
      },
      { type: "h2", text: "How long to wait" },
      {
        type: "p",
        text: "After applying: two weeks. After an interview: a week past the date they said they'd come back to you. After that, send one follow-up. If there's still nothing after three weeks in total, treat it as a no.",
      },
      { type: "h2", text: "What to send" },
      {
        type: "p",
        text: "Keep it short and easy to answer:",
      },
      {
        type: "list",
        items: [
          "Thank them for their time and name the role.",
          "Say you're still interested.",
          "Ask if there's an update or a timeline.",
        ],
      },
      {
        type: "p",
        text: "One message is enough. A second chaser rarely gets a different result, and it takes energy you could put into a new application.",
      },
      { type: "h2", text: "How to stop it costing you weeks" },
      {
        type: "list",
        items: [
          "Never pause your search while you wait on one company.",
          "Track every application with a date, so silence has a deadline.",
          "Put more of your time into roles posted in the last few days, where hiring teams are still actively reading.",
        ],
      },
      {
        type: "cta",
        text: "Track your applications and we'll flag the ones that have gone quiet for 21 days, so you can stop waiting and move on.",
        href: "/start",
        label: "Get new roles first",
      },
    ],
  },
  {
    slug: "is-it-worth-applying-to-old-job-postings",
    title: "Is a job posted 30 days ago still worth applying to?",
    description:
      "Old job ads aren't always dead, but most applications arrive in the first few days. How to tell if an older posting is still worth your time.",
    keywords: [
      "is it worth applying to old job postings",
      "job posted 30 days ago",
      "apply to job posted a month ago",
    ],
    published: "2026-11-14",
    readMinutes: 5,
    body: [
      {
        type: "p",
        text: "You find a role that fits perfectly, then you see it was posted a month ago. Is it worth an evening of tailoring your CV? Sometimes. Here's how to decide.",
      },
      { type: "h2", text: "Why age matters" },
      {
        type: "p",
        text: "Chicago Booth researchers looked at 66 million applications and found more than half arrived in a job's first 4 days. Employers took applications for about 9 days on average. A 30-day-old ad is well past that window, so the team has likely seen most of its candidates.",
      },
      {
        type: "p",
        text: "But an old ad isn't always a dead one. Some roles are genuinely hard to fill. Some companies leave ads up because they hire for the same job all year.",
      },
      { type: "h2", text: "Signs an older ad is still live" },
      {
        type: "list",
        items: [
          "It's a specialist role with a short list of must-have skills you actually have.",
          "The company has only a few ads up, and most are recent.",
          "The ad has a salary, a named team and a clear description of the work.",
          "It's still on the company's own careers page, not just a job board.",
        ],
      },
      { type: "h2", text: "Signs it probably isn't" },
      {
        type: "list",
        items: [
          "Wording like 'always looking', 'talent pool' or 'future opportunities'.",
          "No salary and a very short description.",
          "Most of the company's other ads are also months old.",
          "It disappeared and came back with the same title.",
        ],
      },
      {
        type: "cta",
        text: "Paste any job link and we'll show how long it has been up and any warning signs, in seconds.",
        href: "/check",
        label: "Check a job",
      },
      { type: "h2", text: "If you still want to apply" },
      {
        type: "list",
        items: [
          "Only do it if you meet nearly every must-have.",
          "Find the hiring manager or team lead and send a short note with your application.",
          "Don't spend more than 20 minutes on it. Put the rest of your time into newer roles.",
        ],
      },
      { type: "h2", text: "The better habit" },
      {
        type: "p",
        text: "Old ads feel like a big pool of options, but the best odds sit in the newest ones. Make the first few days your main target, and treat older ads as a bonus.",
      },
      {
        type: "cta",
        text: "See which companies are posting new roles right now.",
        href: "/hiring-now",
        label: "Who's hiring now",
      },
    ],
  },
];

export function postBySlug(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
