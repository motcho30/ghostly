import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelFlow } from "@/components/cancel-flow";
import { ShareButtons } from "@/components/client";
import { btn, card, cx } from "@/components/ui";
import { currentUser, hasAccess } from "@/lib/auth";
import { siteUrl } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";
import { pounds } from "@/lib/pricing";
import { logOut } from "../../login/actions";
import { resume, setAlertMode } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

const statusLabel: Record<string, string> = {
  trialing: "Intro week",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  lifetime: "Lifetime",
};

export default async function Account({
  searchParams,
}: PageProps<"/app/account">) {
  const me = await currentUser();
  if (!me) redirect("/login");
  const { user, sub } = me;
  const locked = (await searchParams).locked === "1" && !hasAccess(sub);
  const db = await getDb();
  const [{ n: referred }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.referrals)
    .where(eq(schema.referrals.referrerUserId, user.id));
  const link = `${siteUrl()}/r/${user.referralCode}`;
  const nextPrice = sub
    ? Math.round((sub.pricePence * (100 - sub.nextDiscountPct)) / 100)
    : 0;
  const date = (d: Date | null) =>
    d?.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-[26px] font-semibold tracking-tight">Account</h1>
      {locked && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 text-[14px] text-amber">
          {sub?.status === "paused"
            ? "Your plan is paused, so your feed is locked until you resume."
            : "You don't have an active plan right now."}{" "}
          {!sub || sub.status === "cancelled" ? (
            <Link href="/plan" className="underline">
              See plans
            </Link>
          ) : null}
        </div>
      )}

      <div className={cx(card, "p-5")}>
        <p className="text-[13px] text-muted">Signed in as</p>
        <p className="font-medium">{user.email}</p>
      </div>

      <div className={cx(card, "p-5")}>
        <h2 className="font-semibold">Your plan</h2>
        {sub ? (
          <dl className="mt-3 space-y-2 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-muted">Plan</dt>
              <dd className="capitalize">
                {sub.plan} · {statusLabel[sub.status]}
              </dd>
            </div>
            {sub.status !== "lifetime" && sub.currentPeriodEnd && (
              <div className="flex justify-between">
                <dt className="text-muted">
                  {sub.status === "cancelled" ? "Access until" : "Next payment"}
                </dt>
                <dd>
                  {date(sub.currentPeriodEnd)}
                  {sub.status !== "cancelled" &&
                    ` · ${pounds(nextPrice)}${sub.nextDiscountPct ? ` (${sub.nextDiscountPct}% off)` : ""}`}
                </dd>
              </div>
            )}
            {sub.status === "paused" && sub.pausedUntil && (
              <div className="flex justify-between">
                <dt className="text-muted">Paused until</dt>
                <dd>{date(sub.pausedUntil)}</dd>
              </div>
            )}
            {sub.provider === "dev" && (
              <p className="pt-1 text-[12px] text-amber">
                Test plan: no real payments are taken.
              </p>
            )}
          </dl>
        ) : (
          <p className="mt-2 text-[14px] text-muted">No plan yet.</p>
        )}
        <div className="mt-4">
          {sub?.status === "paused" && (
            <form action={resume}>
              <button type="submit" className={btn.white}>
                Resume now
              </button>
            </form>
          )}
          {sub && (sub.status === "active" || sub.status === "trialing") && (
            <CancelFlow
              plan={sub.plan}
              periodEnd={sub.currentPeriodEnd?.toISOString() ?? null}
            />
          )}
        </div>
      </div>

      <div className={cx(card, "p-5")}>
        <h2 className="font-semibold">Give a week, get a week</h2>
        <p className="mt-1 text-[14px] text-muted">
          Friends who join from your link get their first week free. You get a
          free week each time. So far: {referred} joined, {user.freeWeeks} free
          week{user.freeWeeks === 1 ? "" : "s"} earned.
        </p>
        <p className="mt-3 truncate rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] text-muted">
          {link}
        </p>
        <div className="mt-3">
          <ShareButtons
            url={link}
            text="Stop getting ghosted. This sends you new UK roles the hour they go live:"
            event="referral_share"
          />
        </div>
      </div>

      <div className={cx(card, "p-5")}>
        <h2 className="font-semibold">New-role emails</h2>
        <p className="text-[14px] text-muted">
          We check every company page each hour. Nothing is sent on quiet days.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["instant", "Within the hour"],
              ["daily", "Once a day"],
              ["off", "Off"],
            ] as const
          ).map(([mode, label]) => (
            <form key={mode} action={setAlertMode.bind(null, mode)}>
              <button
                type="submit"
                aria-pressed={user.alertMode === mode}
                className={cx(
                  "rounded-full border px-4 py-2 text-[14px]",
                  user.alertMode === mode
                    ? "border-mint bg-mint/10 text-text"
                    : "border-line text-muted hover:text-text",
                )}
              >
                {label}
              </button>
            </form>
          ))}
        </div>
      </div>

      <form action={logOut}>
        <button type="submit" className={cx(btn.link, "text-[14px]")}>
          Log out
        </button>
      </form>
    </div>
  );
}
