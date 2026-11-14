/**
 * pnpm job <ingest|full|discover|rescore|alerts|reminders|indexnow> [board slugs...]
 * full = ingest with a complete Workable scan (daily). discover = find new employer boards (daily).
 * ingest also sends new-role alerts afterwards when it runs through the server.
 *
 * PGlite lets one process open the database, so when the dev server is up this
 * asks it to do the work. When it is not, the work runs here instead.
 */
import { request } from "node:http";

const [job = "ingest", ...rest] = process.argv.slice(2);
const port = process.env.PORT || "3007";
const secret = process.env.CRON_SECRET || "dev-cron-secret";

/**
 * Uses node:http rather than fetch: fetch gives up after 5 minutes without a
 * response, and a full import can take longer than that.
 * Resolves "down" only when nothing is listening, so a slow job never falls back
 * to opening the database a second time.
 */
function viaServer(): Promise<"done" | "down"> {
  const path =
    job === "full"
      ? "/api/cron/ingest?full=1"
      : `/api/cron/${job}${rest.length ? `?only=${rest.join(",")}` : ""}`;
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "localhost",
        port: Number(port),
        path,
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          if (res.statusCode === 404)
            return reject(new Error(`Unknown job "${job}"`));
          try {
            console.log(JSON.stringify(JSON.parse(body), null, 2));
          } catch {
            console.log(body);
          }
          resolve("done");
        });
      },
    );
    req.setTimeout(0);
    req.on("error", (e: NodeJS.ErrnoException) =>
      e.code === "ECONNREFUSED" ? resolve("down") : reject(e),
    );
    req.end();
  });
}

async function inProcess() {
  if (job === "ingest" || job === "full") {
    const { runIngest } = await import("../lib/ingest/run");
    const { sendAlerts } = await import("../lib/cron");
    // Same as the server route: every import is followed by alerts.
    const ingest = await runIngest({ only: rest, full: job === "full" });
    console.log(
      JSON.stringify({ ingest, alerts: await sendAlerts() }, null, 2),
    );
  } else if (job === "discover") {
    const { discoverBoards } = await import("../lib/ingest/discover");
    console.log(JSON.stringify(await discoverBoards(), null, 2));
    // Once a day, tell Bing and other IndexNow engines the job pages changed.
    const { submitIndexNow } = await import("../lib/seo/indexnow");
    console.log(
      JSON.stringify(
        await submitIndexNow().catch((e) => ({ error: String(e) })),
      ),
    );
  } else if (job === "indexnow") {
    const { submitIndexNow } = await import("../lib/seo/indexnow");
    console.log(JSON.stringify(await submitIndexNow(), null, 2));
  } else if (job === "rescore") {
    const { rescoreOpenJobs } = await import("../lib/ingest/run");
    console.log(`rescored ${await rescoreOpenJobs()} open jobs`);
  } else if (job === "alerts" || job === "reminders") {
    const m = await import("../lib/cron");
    console.log(
      JSON.stringify(
        job === "alerts"
          ? await m.sendAlerts()
          : await m.sendRenewalReminders(),
        null,
        2,
      ),
    );
  } else {
    throw new Error(`Unknown job "${job}"`);
  }
}

(async () => {
  if ((await viaServer()) === "down") await inProcess();
  process.exit(0);
})();
