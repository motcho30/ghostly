ALTER TABLE "jobs" ADD COLUMN "country" text DEFAULT 'GB' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "currency" text DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_market_idx" ON "jobs" USING btree ("country","closed_at");