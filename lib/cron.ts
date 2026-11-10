import { and, desc, eq, gt, lt, ne, sql } from "drizzle-orm";

import { BRAND, siteUrl } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";
import { button, esc, layout, p, sendEmail } from "@/lib/email";
import { formatSalary } from "@/lib/jobs/normalize";
import { matchWhere } from "@/lib/match";
import { pounds } from "@/lib/pricing";
import type { Answers } from "@/lib/quiz/types";
import { timingOf } from "@/lib/timing";

const { users, subscriptions, leads, jobs, companies } = schema;

/**
 * New-role emails. Runs after every hourly import. "instant" members hear about
 * new matches within the hour we find them, "daily" members once a day, and
 * nobody gets an email on a quiet day.
 */
const MAX_LISTED = 10;

export async function sendAlerts() {
  const db = await getDb();
  const rows = await db
    .select({
      user: users,
      answers: leads.answers,
      subCreated: subscriptions.createdAt,
    })
    .from(users)
    .innerJoin(subscriptions, eq(subscriptions.userId, users.id))
    .leftJoin(leads, eq(leads.id, users.leadId))
    .where(
      and(
        ne(users.alertMode, "off"),
        sql`(${subscriptions.status} in ('active','trialing','lifetime') or (${subscriptions.status} = 'cancelled' and ${subscriptions.currentPeriodEnd} > now()))`,
      ),
    );
  const members = [...new Map(rows.map((r) => [r.user.id, r])).values()];
  const now = new Date();
  let sent = 0;
  for (const m of members) {
    const since = m.user.lastAlertAt ?? m.subCreated;
    if (
      m.user.alertMode === "daily" &&
      m.user.lastAlertAt &&
      now.getTime() - m.user.lastAlertAt.getTime() < 23 * 3_600_000
    )
      continue;
    const a = (m.answers ?? {}) as Answers;
    const fresh = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        company: companies.name,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        postedAt: jobs.postedAt,
        firstSeenAt: jobs.firstSeenAt,
      })
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(and(matchWhere(a), gt(jobs.firstSeenAt, since)))
      .orderBy(desc(jobs.firstSeenAt))
      .limit(MAX_LISTED + 1);
    if (!fresh.length) continue;
    const more = fresh.length > MAX_LISTED;
    const shown = fresh.slice(0, MAX_LISTED);
    const list = shown
      .map((r) => {
        const pay = formatSalary(r.salaryMin, r.salaryMax);
        const when = timingOf(
          r.postedAt ?? r.firstSeenAt,
          now,
        ).when.toLowerCase();
        return `<li style="margin:0 0 10px"><a style="color:#6cf7b0" href="${siteUrl()}/app/jobs/${r.id}">${esc(r.title)}</a><br><span style="color:#a0a0b8">${esc(r.company)}${pay ? ` · ${pay}` : ""} · ${when}</span></li>`;
      })
      .join("");
    const n = more ? `${MAX_LISTED}+` : String(shown.length);
    const plural = shown.length === 1 && !more ? "" : "s";
    await sendEmail({
      to: m.user.email,
      kind: "alert",
      subject:
        m.user.alertMode === "instant"
          ? `${n} new role${plural} just went live. Be one of the first`
          : `${n} new role${plural} for you today`,
      html: layout(
        `${n} new role${plural} for you`,
        `${p("Straight from the companies' own careers pages. Most people apply in a job's first few days, so the earlier you get in, the better.")}<ul style="padding-left:18px;color:#d6d6e4">${list}</ul>${button(`${siteUrl()}/app?posted=1`, "See them now")}`,
      ),
    });
    await db
      .update(users)
      .set({ lastAlertAt: now })
      .where(eq(users.id, m.user.id));
    sent++;
  }
  return { members: members.length, sent };
}

/**
 * Reminder two days before an intro week or any paid period renews, as the UK
 * subscription rules will require. Test-checkout plans also roll forward here,
 * so local renewals behave like real ones.
 */
export async function sendRenewalReminders() {
  const db = await getDb();
  const soon = new Date(Date.now() + 2 * 86_400_000);
  const due = await db
    .select({ sub: subscriptions, user: users })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .where(
      and(
        sql`${subscriptions.status} in ('active','trialing')`,
        lt(subscriptions.currentPeriodEnd, soon),
        gt(subscriptions.currentPeriodEnd, new Date()),
        sql`${subscriptions.reminderSentFor} is distinct from ${subscriptions.currentPeriodEnd}`,
      ),
    );
  for (const { sub, user } of due) {
    if (!sub.currentPeriodEnd) continue;
    const price = Math.round(
      (sub.pricePence * (100 - sub.nextDiscountPct)) / 100,
    );
    const when = sub.currentPeriodEnd.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    await sendEmail({
      to: user.email,
      kind: "renewal_reminder",
      subject: `Your ${BRAND.name} plan renews on ${when}`,
      html: layout(
        `Heads up: ${pounds(price)} on ${when}`,
        `${p(`Your ${sub.plan} plan renews on ${when} at ${pounds(price)}. Nothing to do if you want to keep going.`)}${p("Want to stop? Cancel in two clicks. You keep access until the end of the period you paid for.")}${button(`${siteUrl()}/app/account`, "Manage my plan")}`,
      ),
    });
    await db
      .update(subscriptions)
      .set({ reminderSentFor: sub.currentPeriodEnd })
      .where(eq(subscriptions.id, sub.id));
  }

  // Test plans have no billing provider, so roll their periods here.
  const rolled = await db
    .update(subscriptions)
    .set({
      status: "active",
      nextDiscountPct: 0,
      // Catch up to the next period end after now, however many periods were missed.
      currentPeriodEnd: sql`case when ${subscriptions.plan} = 'weekly'
        then ${subscriptions.currentPeriodEnd} + (floor(extract(epoch from now() - ${subscriptions.currentPeriodEnd}) / 604800) + 1) * interval '7 days'
        else ${subscriptions.currentPeriodEnd} + ((extract(year from age(now(), ${subscriptions.currentPeriodEnd})) * 12 + extract(month from age(now(), ${subscriptions.currentPeriodEnd})) + 1) * interval '1 month') end`,
    })
    .where(
      and(
        eq(subscriptions.provider, "dev"),
        sql`${subscriptions.status} in ('active','trialing')`,
        lt(subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .returning({ id: subscriptions.id });

  // Paused plans come back after their month.
  await db
    .update(subscriptions)
    .set({ status: "active", pausedUntil: null })
    .where(
      and(
        eq(subscriptions.status, "paused"),
        lt(subscriptions.pausedUntil, new Date()),
      ),
    );

  return { reminded: due.length, rolledTestPlans: rolled.length };
}
