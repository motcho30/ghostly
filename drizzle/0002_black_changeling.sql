-- Members who had turned the daily email off keep new-role emails off.
UPDATE "users" SET "alert_mode" = 'off' WHERE "digest_enabled" = false;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "digest_enabled";
