"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { currentUser, requireMember } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { AppStatus } from "@/lib/db/schema";
import { track } from "@/lib/events";
import {
  cancelPlan,
  discountNextPayment,
  pausePlan,
  resumePlan,
} from "@/lib/payments";

const { savedJobs, applications, jobs, companies, users, reviews } = schema;

export async function toggleSave(jobId: number) {
  const { user } = await requireMember();
  const db = await getDb();
  const where = and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId));
  const [hit] = await db.select().from(savedJobs).where(where).limit(1);
  if (hit) await db.delete(savedJobs).where(where);
  else await db.insert(savedJobs).values({ userId: user.id, jobId });
  revalidatePath("/app");
  return !hit;
}

/** "Yes, I applied" after opening a role's apply link. */
export async function logApplication(jobId: number) {
  const { user } = await requireMember();
  const db = await getDb();
  const [row] = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!row) return;
  const [dupe] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, user.id), eq(applications.jobId, jobId)))
    .limit(1);
  if (!dupe) {
    await db.insert(applications).values({
      userId: user.id,
      jobId,
      companyId: row.company.id,
      companyName: row.company.name,
      title: row.job.title,
    });
    await track("application_logged", { source: "feed" }, { userId: user.id });
  }
  revalidatePath("/app/tracker");
}

/** An application to a role we don't list. Matched to a company we know when the name fits. */
export async function addManualApplication(form: FormData) {
  const { user } = await requireMember();
  const companyName = String(form.get("company") ?? "")
    .trim()
    .slice(0, 120);
  const title = String(form.get("title") ?? "")
    .trim()
    .slice(0, 160);
  if (!companyName || !title) return;
  const db = await getDb();
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.name, companyName))
    .limit(1);
  await db.insert(applications).values({
    userId: user.id,
    companyId: company?.id ?? null,
    companyName: company?.name ?? companyName,
    title,
  });
  await track("application_logged", { source: "manual" }, { userId: user.id });
  revalidatePath("/app/tracker");
}

const Status = z.enum([
  "applied",
  "heard_back",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
]);

export async function setApplicationStatus(id: string, status: AppStatus) {
  const { user } = await requireMember();
  const parsed = Status.parse(status);
  const db = await getDb();
  await db
    .update(applications)
    .set({ status: parsed, statusChangedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  await track("application_status", { status: parsed }, { userId: user.id });
  revalidatePath("/app/tracker");
}

export async function removeApplication(id: string) {
  const { user } = await requireMember();
  const db = await getDb();
  await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  revalidatePath("/app/tracker");
}

/** Post-hire review. Stays hidden until someone on the team checks it is real. */
export async function submitReview(form: FormData) {
  const { user } = await requireMember();
  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 600);
  const role = String(form.get("role") ?? "")
    .trim()
    .slice(0, 80);
  const rating = Math.min(5, Math.max(1, Number(form.get("rating") ?? 5)));
  if (body.length < 10 || !role) return;
  const db = await getDb();
  await db.insert(reviews).values({
    userId: user.id,
    name: user.name ?? "Member",
    role,
    city: String(form.get("city") ?? "").slice(0, 60) || null,
    body,
    rating,
    hiredAt: new Date(),
  });
  await track("review_submitted", { rating }, { userId: user.id });
  revalidatePath("/app/tracker");
}

// ---------- Account ----------

const reasons = [
  "found_job",
  "too_expensive",
  "not_enough_roles",
  "not_useful",
  "taking_break",
  "other",
] as const;

export async function cancelWithReason(reason: string) {
  const { sub, user } = await requireMember();
  const r = (reasons as readonly string[]).includes(reason) ? reason : "other";
  await cancelPlan(sub, r);
  await track("cancelled", { reason: r, plan: sub.plan }, { userId: user.id });
  revalidatePath("/app/account");
}

export async function acceptSaveOffer(kind: "pause" | "discount") {
  const { sub, user } = await requireMember();
  if (kind === "pause") await pausePlan(sub);
  else await discountNextPayment(sub, 50);
  await track(
    "save_offer_accepted",
    { kind, plan: sub.plan },
    { userId: user.id },
  );
  revalidatePath("/app/account");
}

/** Paused members have no access, so this checks the session itself rather than requireMember. */
export async function resume() {
  const me = await currentUser();
  if (!me?.sub || me.sub.status !== "paused") redirect("/login");
  await resumePlan(me.sub);
  revalidatePath("/app/account");
}

export async function setAlertMode(mode: "instant" | "daily" | "off") {
  const { user } = await requireMember();
  const clean = mode === "daily" || mode === "off" ? mode : "instant";
  const db = await getDb();
  await db.update(users).set({ alertMode: clean }).where(eq(users.id, user.id));
  revalidatePath("/app/account");
}
