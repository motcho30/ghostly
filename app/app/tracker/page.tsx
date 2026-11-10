import { and, desc, eq, lt } from "drizzle-orm";
import type { Metadata } from "next";

import { ShareButtons } from "@/components/client";
import { GhostIcon } from "@/components/ghost";
import { StatusSelect } from "@/components/member";
import { btn, card, cx, input } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { BRAND, siteUrl } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";
import { daysSince, fmt } from "@/lib/format";
import {
  addManualApplication,
  removeApplication,
  submitReview,
} from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tracker" };

const { applications, reviews } = schema;

export default async function Tracker() {
  const { user } = await requireMember();
  const db = await getDb();
  // Silence for 21 days counts as ghosted. This is what feeds company reply rates.
  await db
    .update(applications)
    .set({ status: "ghosted", statusChangedAt: new Date() })
    .where(
      and(
        eq(applications.userId, user.id),
        eq(applications.status, "applied"),
        lt(
          applications.appliedAt,
          new Date(Date.now() - BRAND.ghostAfterDays * 86_400_000),
        ),
      ),
    );
  const apps = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, user.id))
    .orderBy(desc(applications.appliedAt));
  const [myReview] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.userId, user.id))
    .limit(1);

  const replied = apps.filter((a) =>
    ["heard_back", "interviewing", "offer", "rejected"].includes(a.status),
  ).length;
  const ghosted = apps.filter((a) => a.status === "ghosted").length;
  const waiting = apps.filter((a) => a.status === "applied").length;
  const hasOffer = apps.some((a) => a.status === "offer");
  const weeks = apps.length
    ? Math.max(1, Math.round((daysSince(apps.at(-1)?.appliedAt) ?? 0) / 7))
    : 0;
  const cardPath = `/ghosted/${apps.length}-${ghosted}-${weeks}w?ref=${user.referralCode}`;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[26px] font-semibold tracking-tight">
        Your applications
      </h1>
      <p className="text-[14px] text-muted">
        No reply in {BRAND.ghostAfterDays} days and we mark it ghosted. Your
        updates help everyone see who replies.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { n: apps.length, l: "Applied" },
          { n: replied, l: "Heard back" },
          { n: waiting, l: "Waiting" },
          { n: ghosted, l: "Ghosted" },
        ].map((s) => (
          <div key={s.l} className={cx(card, "p-4")}>
            <div className="font-mono text-[28px] font-semibold tabular-nums">
              {fmt(s.n)}
            </div>
            <div className="text-[13px] text-muted">{s.l}</div>
          </div>
        ))}
      </div>

      {apps.length > 0 && (
        <div
          className={cx(
            card,
            "mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center",
          )}
        >
          <GhostIcon className="h-10 w-10 shrink-0 text-violet" />
          <div className="flex-1">
            <p className="font-semibold">Share your Ghost Report</p>
            <p className="text-[14px] text-muted">
              Friends who join from your card get their first week free. You get
              a free week.
            </p>
          </div>
          <ShareButtons
            url={`${siteUrl()}${cardPath}`}
            text={`${apps.length} applications, ${ghosted} ghosted. What's your Ghost Count?`}
            event="ghostcard_share"
          />
        </div>
      )}

      {hasOffer && !myReview && (
        <form
          action={submitReview}
          className={cx(card, "mt-4 border-mint/40 p-5")}
        >
          <p className="font-semibold">
            🎉 An offer! Would you leave a short review?
          </p>
          <p className="text-[13px] text-muted">
            It shows on our site with your first name and role, after we check
            it's real.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              name="role"
              required
              placeholder="Your new role"
              className={input}
            />
            <input
              name="city"
              placeholder="City (optional)"
              className={input}
            />
          </div>
          <textarea
            name="body"
            required
            minLength={10}
            maxLength={600}
            placeholder="What helped?"
            className={cx(input, "mt-2 min-h-24")}
          />
          <div className="mt-2 flex items-center gap-3">
            <select
              name="rating"
              defaultValue="5"
              className="rounded-full border border-line bg-surface-2 px-3 py-2 text-[13px]"
              aria-label="Rating"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={cx(btn.white, "px-4 py-2 text-[13px]")}
            >
              Send review
            </button>
          </div>
        </form>
      )}

      <form
        action={addManualApplication}
        className="mt-6 flex flex-col gap-2 sm:flex-row"
      >
        <input
          name="company"
          required
          placeholder="Company"
          className={input}
          aria-label="Company"
        />
        <input
          name="title"
          required
          placeholder="Role"
          className={input}
          aria-label="Role"
        />
        <button type="submit" className={cx(btn.ghost, "shrink-0")}>
          Add an application
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {apps.map((a) => (
          <li
            key={a.id}
            className={cx(
              card,
              "flex flex-wrap items-center justify-between gap-3 p-4",
            )}
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{a.title}</p>
              <p className="text-[13px] text-muted">
                {a.companyName} · applied{" "}
                {daysSince(a.appliedAt) === 0
                  ? "today"
                  : `${daysSince(a.appliedAt)} days ago`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect id={a.id} status={a.status} />
              <form action={removeApplication.bind(null, a.id)}>
                <button
                  type="submit"
                  className="px-2 text-[13px] text-faint hover:text-coral"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {apps.length === 0 && (
        <p className="mt-8 text-center text-muted">
          Nothing tracked yet. Hit "Apply" on a role and say yes when we ask.
        </p>
      )}
    </div>
  );
}
