# Ghostless

Stop getting ghosted.

A UK job board for people who apply and never hear back. Most applications land in a job's first few days, so by the time a role reaches the big boards you're at the back of the pile. Ghostless reads roles straight from company careers pages every hour and emails members new matches within the hour, so they're among the first to apply. Every role says when it was really posted and whether it's worth applying. It copies the shape of the DirectRoles funnel (villain landing page, chaptered quiz, personal result, stacked paywall, save offers) and replaces their tricks with things that are true.

Working name. Rename it in `lib/brand.ts`.

## Run it

```bash
pnpm install
pnpm dev              # http://localhost:3007
pnpm ingest           # pulls live UK roles from data/boards.json (about 20 seconds), then sends alerts
```

Nothing else is needed locally. The database is PGlite in `.data/pglite`, checkout is a test page with no card, and emails land in the dev mailbox at `/dev/mail`. Copy `.env.example` to `.env.local` to switch on Stripe, Resend or hosted Postgres.

PGlite allows one process at a time, so `pnpm job <name>` asks the running dev server to do the work, and only runs it itself when the server is down.

```bash
pnpm job ingest       # hourly: every board, Workable's last 2 days, close vanished ads, rescore, send alerts
pnpm job full         # daily: the same, with a full 30-day Workable scan that can close Workable ads
pnpm job discover     # daily: find new UK employers on SmartRecruiters and add their boards
pnpm job rescore      # rescore open roles only
pnpm job alerts       # new-role emails on their own (instant members within the hour, daily members once a day)
pnpm job reminders    # renewal reminders, roll test plans forward, end pauses
pnpm test             # scoring and salary tests
pnpm check            # types and Biome
```

## Pages

| Path | What it is |
| --- | --- |
| `/` | Landing page with live counts, real job cards and no invented reviews |
| `/check`, `/check/[id]` | Free "Is it worth applying?": paste a link or the ad, get a shareable verdict |
| `/start` | The quiz: six chapters, live match counter, Ghost Count, matching screen, result, name, email |
| `/plan` | Paywall with intro price held 24 hours on the server and a one-time 20% "Maybe later" offer |
| `/checkout/dev` | Test checkout used until `STRIPE_SECRET_KEY` is set |
| `/welcome` | After paying: sign-in done, referral link |
| `/app` | Member feed, filters, saved roles |
| `/app/jobs/[id]` | Role with its verdict and warning signs, company numbers, apply and "Did you apply?" |
| `/app/tracker` | Application tracker, auto-ghosting after 21 days, Ghost Report share, review ask after an offer |
| `/app/account` | Plan, renewal date, two-click cancel with pause or 50% off offer, referrals, alert setting (within the hour, daily, off) |
| `/ghosted/[stats]` | Shareable Ghost Count card, with a 1200x630 preview and a 9:16 story image |
| `/companies/[slug]` | "Does X reply?" company page |
| `/hiring-now` | Every employer ranked by new roles this week, freshest or oldest ads |
| `/how-we-score`, `/legal/*` | How timing and verdicts work, with sources, and first-draft legal pages |
| `/admin` | Funnel, quiz drop-off, segments, A/B arms, viral loops, reviews to approve. Enter with `/admin/enter?token=dev-admin` locally |
| `/dev/mail` | Dev mailbox (off in production) |

## Where the roles come from

About 18,000 live UK roles, all straight from employers:

- **Employer boards** in the `boards` table: Greenhouse, Lever, Ashby and SmartRecruiters. `data/boards.json` holds the seed list; `pnpm job discover` adds new SmartRecruiters employers every day, and boards that are gone 5 runs in a row stop being read.
- **Workable**, read whole through its public UK search (every employer on Workable at once). It rate-limits heavy use, so the reader is slow and polite and stops cleanly when refused. For steady volume, ask Workable for their official jobs XML feed.
- **Rules every source follows:** UK only, no recruitment agencies (name filter plus `data/excluded-employers.json`), nothing older than 180 days, and an ad leaves when the employer takes it down.

`/admin` shows live roles per source, new today, and boards added each day.

## How it fits together

- `lib/ingest` reads Greenhouse, Lever and Ashby boards, keeps UK roles, closes ads that vanished, marks re-opened titles as reposts and rescores everything.
- `lib/timing.ts` turns a posting date into a timing label and a verdict ("Apply today", "Long shot", "Probably too late"). `lib/ghost/score.ts` finds the warning signs (reposts, talent-pool wording and so on). Both are pure and tested.
- `lib/match.ts` turns quiz answers into SQL filters. The quiz counter, result, paywall, feed and daily email all use it, so counts agree everywhere.
- `lib/quiz/config.ts` holds the quiz script. Change copy there, not in the component.
- `lib/pricing.ts` and `lib/leads.ts` work out every price on the server from the lead's own state.
- `lib/payments.ts` talks to Stripe over HTTPS (no SDK). `fulfil()` turns a payment into an account and is safe to call twice.
- `lib/experiments.ts` holds the A/B tests. Arms come from a hash of the anonymous id and are saved on each lead.

## Before launch

- A UK consumer lawyer should review the paywall, the subscription page and the cancel flow (DMCCA subscription rules start January 2027).
- Decide whether to keep the 7-day money-back promise in `lib/brand.ts`.
- Stripe code has not run against a real account yet. Test it in Stripe test mode end to end, including the webhook.
- Put the job checker's fetcher behind an egress proxy before high traffic (see `lib/check/fetch.ts`).
- The "within the hour" promise needs the hourly cron in `vercel.json` running. Locally, run `pnpm job ingest`.
- Growth plan: `docs/growth-playbook.md`.
