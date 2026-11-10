import { desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { card, cx } from "@/components/ui";
import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { EXPERIMENTS } from "@/lib/experiments";
import { fmt, per100 } from "@/lib/format";
import { SCREENS } from "@/lib/quiz/config";
import { setReview } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  const db = await getDb();
  const r = (await db.execute(query)) as unknown as { rows?: T[] } | T[];
  return Array.isArray(r) ? r : (r.rows ?? []);
}

const FUNNEL = [
  ["landing_view", "Saw the landing page"],
  ["quiz_start", "Started the quiz"],
  ["quiz_complete", "Finished the quiz"],
  ["email_submit", "Gave an email"],
  ["paywall_view", "Saw the paywall"],
  ["checkout_start", "Started checkout"],
  ["paid", "Paid"],
] as const;

export default async function Admin() {
  if (!(await isAdmin())) notFound();
  const db = await getDb();
  const since = sql`now() - interval '30 days'`;

  const funnel = await rows<{ name: string; n: number }>(sql`
    select name, count(distinct coalesce(anon_id, user_id::text))::int as n
    from events where created_at > ${since} group by name`);
  const fn = new Map(funnel.map((f) => [f.name, f.n]));
  const screens = await rows<{ id: string; n: number }>(sql`
    select props->>'id' as id, count(distinct anon_id)::int as n
    from events where name = 'screen_view' and created_at > ${since} group by 1`);
  const segments = await rows<{
    segment: string;
    leads: number;
    paid: number;
  }>(sql`
    select l.segment, count(distinct l.id)::int as leads, count(distinct s.id)::int as paid
    from leads l left join users u on u.lead_id = l.id left join subscriptions s on s.user_id = u.id
    where l.created_at > ${since} group by 1 order by 2 desc`);
  const arms = await rows<{
    exp: string;
    arm: string;
    leads: number;
    paid: number;
  }>(sql`
    select a.key as exp, a.value as arm, count(distinct l.id)::int as leads, count(distinct s.id)::int as paid
    from leads l cross join lateral jsonb_each_text(l.arms) a
    left join users u on u.lead_id = l.id left join subscriptions s on s.user_id = u.id
    where l.created_at > ${since} group by 1, 2 order by 1, 2`);
  const plans = await rows<{ plan: string; status: string; n: number }>(
    sql`select plan, status, count(*)::int as n from subscriptions group by 1, 2 order by 1, 2`,
  );
  const viral = await rows<{
    name: string;
    channel: string | null;
    n: number;
  }>(sql`
    select name, props->>'channel' as channel, count(*)::int as n from events
    where name in ('ghost_check','check_share','ghostcard_share','ghostcard_view','referral_share','index_share') and created_at > ${since}
    group by 1, 2 order by 3 desc`);
  const cancels = await rows<{ reason: string; n: number }>(
    sql`select coalesce(cancel_reason,'none') as reason, count(*)::int as n from subscriptions where status = 'cancelled' group by 1`,
  );
  const [refs] = await rows<{ n: number }>(
    sql`select count(*)::int as n from referrals`,
  );
  const pending = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.verified, false))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(20);
  const live = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.verified, true))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(50);
  const [run] = await db
    .select()
    .from(schema.ingestRuns)
    .where(isNotNull(schema.ingestRuns.finishedAt))
    .orderBy(desc(schema.ingestRuns.id))
    .limit(1);
  const bySource = await rows<{
    source: string;
    open: number;
    new24: number;
  }>(sql`
    select source, count(*)::int as open,
      count(*) filter (where first_seen_at > now() - interval '24 hours')::int as new24
    from jobs where closed_at is null group by 1 order by 2 desc`);
  const boardMix = await rows<{
    ats: string;
    origin: string;
    active: number;
    today: number;
  }>(sql`
    select ats, origin, count(*) filter (where active)::int as active,
      count(*) filter (where created_at > now() - interval '24 hours')::int as today
    from boards group by 1, 2 order by 1, 2`);
  const [workableFull] = await db
    .select()
    .from(schema.sourceState)
    .where(eq(schema.sourceState.key, "workable_full"))
    .limit(1);

  const top = fn.get("landing_view") || fn.get("quiz_start") || 1;
  const Box = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className={cx(card, "p-5")}>
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 text-[14px]">{children}</div>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <h1 className="text-[26px] font-semibold">Admin · last 30 days</h1>
      <p className="text-[13px] text-muted">
        Last import: {run?.finishedAt?.toLocaleString("en-GB") ?? "never"} ·{" "}
        {run
          ? `${run.boardsOk} boards, ${fmt(run.jobsSeen)} roles, ${run.jobsNew} new, ${run.jobsClosed} closed, ${run.boardsFailed} boards failed`
          : ""}
      </p>

      <Box title="Funnel (unique visitors)">
        <table className="w-full">
          <tbody>
            {FUNNEL.map(([k, label]) => (
              <tr key={k} className="border-b border-line/60 last:border-0">
                <td className="py-2">{label}</td>
                <td className="py-2 text-right font-mono">
                  {fmt(fn.get(k) ?? 0)}
                </td>
                <td className="w-24 py-2 text-right font-mono text-muted">
                  {per100(fn.get(k) ?? 0, top)} in 100
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <div className="grid gap-4 sm:grid-cols-2">
        <Box title="Quiz drop-off by screen">
          {screens.length === 0 && (
            <p className="text-muted">No quiz traffic yet.</p>
          )}
          {SCREENS.map((s) => {
            const n = screens.find((x) => x.id === s.id)?.n ?? 0;
            return (
              <div key={s.id} className="flex justify-between py-1">
                <span className="text-muted">{s.id}</span>
                <span className="font-mono">{n}</span>
              </div>
            );
          })}
        </Box>
        <div className="space-y-4">
          <Box title="Paid by segment">
            {segments.map((s) => (
              <div key={s.segment} className="flex justify-between py-1">
                <span>{s.segment}</span>
                <span className="font-mono">
                  {s.paid} of {s.leads} · {per100(s.paid, s.leads)} in 100
                </span>
              </div>
            ))}
            {segments.length === 0 && (
              <p className="text-muted">No leads yet.</p>
            )}
          </Box>
          <Box title="A/B arms (paid of leads)">
            {Object.keys(EXPERIMENTS).map((exp) => (
              <div key={exp} className="py-1">
                <p className="text-[12px] uppercase tracking-wider text-faint">
                  {exp}
                </p>
                {arms
                  .filter((a) => a.exp === exp)
                  .map((a) => (
                    <div key={a.arm} className="flex justify-between">
                      <span>{a.arm}</span>
                      <span className="font-mono">
                        {a.paid} of {a.leads} · {per100(a.paid, a.leads)} in 100
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </Box>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Box title="Viral loops">
          {viral.map((v) => (
            <div
              key={`${v.name}-${v.channel}`}
              className="flex justify-between py-0.5"
            >
              <span className="text-muted">
                {v.name}
                {v.channel ? ` · ${v.channel}` : ""}
              </span>
              <span className="font-mono">{v.n}</span>
            </div>
          ))}
          <div className="flex justify-between py-0.5">
            <span className="text-muted">referrals that joined</span>
            <span className="font-mono">{refs?.n ?? 0}</span>
          </div>
        </Box>
        <Box title="Sources">
          {bySource.map((s) => (
            <div key={s.source} className="flex justify-between py-0.5">
              <span>{s.source}</span>
              <span className="font-mono">
                {fmt(s.open)} live · {fmt(s.new24)} new today
              </span>
            </div>
          ))}
          <p className="mt-2 text-[12px] uppercase tracking-wider text-faint">
            Boards
          </p>
          {boardMix.map((b) => (
            <div
              key={`${b.ats}-${b.origin}`}
              className="flex justify-between py-0.5"
            >
              <span className="text-muted">
                {b.ats} · {b.origin}
              </span>
              <span className="font-mono">
                {b.active}
                {b.today ? ` (+${b.today} today)` : ""}
              </span>
            </div>
          ))}
          <p className="mt-2 text-[12px] text-faint">
            Last full Workable scan:{" "}
            {workableFull
              ? workableFull.updatedAt.toLocaleString("en-GB")
              : "not yet"}
          </p>
        </Box>
        <Box title="Plans">
          {plans.map((p) => (
            <div
              key={`${p.plan}-${p.status}`}
              className="flex justify-between py-0.5"
            >
              <span>
                {p.plan} · {p.status}
              </span>
              <span className="font-mono">{p.n}</span>
            </div>
          ))}
          {plans.length === 0 && <p className="text-muted">No plans yet.</p>}
        </Box>
        <Box title="Cancel reasons">
          {cancels.map((c) => (
            <div key={c.reason} className="flex justify-between py-0.5">
              <span>{c.reason}</span>
              <span className="font-mono">{c.n}</span>
            </div>
          ))}
          {cancels.length === 0 && <p className="text-muted">None yet.</p>}
        </Box>
      </div>

      <Box title={`Reviews waiting for a check (${pending.length})`}>
        {pending.map((r) => (
          <div
            key={r.id}
            className="border-b border-line/60 py-3 last:border-0"
          >
            <p>
              {"★".repeat(r.rating)} · {r.name}, {r.role}
              {r.city ? `, ${r.city}` : ""}
            </p>
            <p className="mt-1 text-muted">{r.body}</p>
            <div className="mt-2 flex gap-2">
              <form action={setReview.bind(null, r.id, true)}>
                <button
                  type="submit"
                  className="rounded-full border border-mint px-3 py-1 text-[13px] text-mint"
                >
                  Approve
                </button>
              </form>
              <form action={setReview.bind(null, r.id, false)}>
                <button
                  type="submit"
                  className="rounded-full border border-line px-3 py-1 text-[13px] text-muted"
                >
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <p className="text-muted">Nothing to check.</p>
        )}
      </Box>

      <Box title={`Published reviews (${live.length})`}>
        {live.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-3 border-b border-line/60 py-3 last:border-0"
          >
            <p>
              {r.name}, {r.role}: <span className="text-muted">{r.body}</span>
            </p>
            <form action={setReview.bind(null, r.id, false)}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-line px-3 py-1 text-[13px] text-muted hover:text-coral"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
        {live.length === 0 && (
          <p className="text-muted">
            None yet. The landing page says so honestly.
          </p>
        )}
      </Box>
    </main>
  );
}
