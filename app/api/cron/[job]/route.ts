import { sendAlerts, sendRenewalReminders } from "@/lib/cron";
import { discoverBoards } from "@/lib/ingest/discover";
import { rescoreOpenJobs, runIngest } from "@/lib/ingest/run";
import { clearStatsCache } from "@/lib/stats";

export const maxDuration = 800;

/**
 * Scheduled jobs. Vercel Cron calls these with GET and the CRON_SECRET bearer;
 * `pnpm job <name>` calls them with POST against the local dev server.
 */
async function run(req: Request, { params }: RouteContext<"/api/cron/[job]">) {
  const secret =
    process.env.CRON_SECRET ||
    (process.env.NODE_ENV === "production" ? null : "dev-cron-secret");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  const only = new URL(req.url).searchParams
    .get("only")
    ?.split(",")
    .filter(Boolean);
  let result: unknown;
  // Every import is followed by alerts, so a new role reaches members within the hour.
  if (job === "ingest") {
    const full = new URL(req.url).searchParams.get("full") === "1";
    const ingest = await runIngest({ only, full });
    clearStatsCache();
    result = { ingest, alerts: await sendAlerts() };
  } else if (job === "rescore") result = { rescored: await rescoreOpenJobs() };
  else if (job === "alerts" || job === "digest") result = await sendAlerts();
  else if (job === "reminders") result = await sendRenewalReminders();
  else if (job === "discover") result = await discoverBoards();
  else return new Response("Not found", { status: 404 });
  clearStatsCache();
  return Response.json(result);
}

export const GET = run;
export const POST = run;
