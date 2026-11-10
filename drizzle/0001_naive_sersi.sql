ALTER TABLE "users" ADD COLUMN "alert_mode" text DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_alert_at" timestamp with time zone;