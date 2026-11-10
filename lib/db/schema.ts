import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type Remote = "remote" | "hybrid" | "on_site" | "unknown";
export type Level = "entry" | "mid" | "senior" | "lead" | "director";
export type WorkType = "full_time" | "part_time" | "contract" | "internship";
export type GhostBand = "low" | "medium" | "high";
export type GhostReason = {
  key: string;
  label: string;
  points: number;
};
export type AlertMode = "instant" | "daily" | "off";
export type PlanId = "weekly" | "monthly" | "lifetime";
export type SubStatus =
  | "trialing"
  | "active"
  | "paused"
  | "cancelled"
  | "lifetime";
export type AppStatus =
  | "applied"
  | "heard_back"
  | "interviewing"
  | "offer"
  | "rejected"
  | "ghosted";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ats: text("ats").notNull(),
  boardSlug: text("board_slug").notNull(),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    normTitle: text("norm_title").notNull(),
    family: text("family").notNull(),
    level: text("level").$type<Level>().notNull(),
    workType: text("work_type").$type<WorkType>().notNull(),
    locationText: text("location_text"),
    city: text("city"),
    remote: text("remote").$type<Remote>().notNull(),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryText: text("salary_text"),
    descriptionText: text("description_text").notNull(),
    applyUrl: text("apply_url").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    repostCount: integer("repost_count").notNull().default(0),
    ghostScore: integer("ghost_score").notNull().default(0),
    ghostBand: text("ghost_band").$type<GhostBand>().notNull().default("low"),
    ghostReasons: jsonb("ghost_reasons")
      .$type<GhostReason[]>()
      .notNull()
      .default([]),
  },
  (t) => [
    uniqueIndex("jobs_source_uq").on(t.source, t.sourceId),
    index("jobs_company_idx").on(t.companyId),
    index("jobs_open_idx").on(t.closedAt, t.family),
  ],
);

/** Someone who started the quiz. Becomes a user when they pay. */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anonId: text("anon_id").notNull(),
    name: text("name"),
    email: text("email"),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    segment: text("segment").notNull(),
    arms: jsonb("arms").$type<Record<string, string>>().notNull(),
    matchCount: integer("match_count").notNull().default(0),
    /** The intro price is held for this lead until this time, on the server. */
    introExpiresAt: timestamp("intro_expires_at", { withTimezone: true }),
    /** The one-time "Maybe later" discount, held until this time. */
    laterOfferExpiresAt: timestamp("later_offer_expires_at", {
      withTimezone: true,
    }),
    referredBy: text("referred_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // One lead per visitor: a retried or doubled quiz submit updates it instead of adding another.
  (t) => [uniqueIndex("leads_anon_uq").on(t.anonId)],
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  leadId: uuid("lead_id"),
  referralCode: text("referral_code").notNull().unique(),
  freeWeeks: integer("free_weeks").notNull().default(0),
  /** New-role emails: "instant" (within the hour), "daily" or "off". */
  alertMode: text("alert_mode").$type<AlertMode>().notNull().default("instant"),
  lastAlertAt: timestamp("last_alert_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  plan: text("plan").$type<PlanId>().notNull(),
  status: text("status").$type<SubStatus>().notNull(),
  pricePence: integer("price_pence").notNull(),
  firstChargePence: integer("first_charge_pence").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  pausedUntil: timestamp("paused_until", { withTimezone: true }),
  nextDiscountPct: integer("next_discount_pct").notNull().default(0),
  cancelReason: text("cancel_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref"),
  reminderSentFor: timestamp("reminder_sent_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const magicLinks = pgTable("magic_links", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const savedJobs = pgTable(
  "saved_jobs",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] })],
);

/** The tracker. Every status change also feeds company reply rates. */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    jobId: integer("job_id").references(() => jobs.id),
    companyId: integer("company_id").references(() => companies.id),
    companyName: text("company_name").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<AppStatus>().notNull().default("applied"),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("applications_user_idx").on(t.userId),
    index("applications_company_idx").on(t.companyId),
  ],
);

/** A free "Is it worth applying?" check, public at /check/[id]. */
export const checks = pgTable("checks", {
  id: text("id").primaryKey(),
  anonId: text("anon_id"),
  inputKind: text("input_kind").notNull(),
  inputUrl: text("input_url"),
  title: text("title"),
  companyName: text("company_name"),
  score: integer("score").notNull(),
  band: text("band").$type<GhostBand>().notNull(),
  reasons: jsonb("reasons").$type<GhostReason[]>().notNull(),
  facts: jsonb("facts").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    anonId: text("anon_id"),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    props: jsonb("props").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("events_name_idx").on(t.name, t.createdAt)],
);

/** Every email we send. With no email provider set, this is the dev mailbox. */
export const outbox = pgTable("outbox", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  kind: text("kind").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerUserId: uuid("referrer_user_id")
    .notNull()
    .references(() => users.id),
  referredUserId: uuid("referred_user_id").references(() => users.id),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Only real, verified member reviews. Nothing is seeded here on purpose. */
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  city: text("city"),
  hiredAt: timestamp("hired_at", { withTimezone: true }),
  body: text("body").notNull(),
  rating: integer("rating").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  boardsOk: integer("boards_ok").notNull().default(0),
  boardsFailed: integer("boards_failed").notNull().default(0),
  jobsSeen: integer("jobs_seen").notNull().default(0),
  jobsNew: integer("jobs_new").notNull().default(0),
  jobsClosed: integer("jobs_closed").notNull().default(0),
});

/**
 * Every employer careers board we read. Seeds come from data/boards.json; the
 * daily discovery job adds the rest, so the list grows without code changes.
 */
export const boards = pgTable(
  "boards",
  {
    id: serial("id").primaryKey(),
    ats: text("ats").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    origin: text("origin").notNull(),
    active: boolean("active").notNull().default(true),
    ukRoles: integer("uk_roles").notNull().default(0),
    failCount: integer("fail_count").notNull().default(0),
    lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("boards_ats_slug_uq").on(t.ats, t.slug)],
);

/** Small bits of job state, such as when the last full Workable scan finished. */
export const sourceState = pgTable("source_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
