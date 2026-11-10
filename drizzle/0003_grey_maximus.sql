CREATE TABLE "boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"ats" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"origin" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"uk_roles" integer DEFAULT 0 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"last_ok_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "boards_ats_slug_uq" ON "boards" USING btree ("ats","slug");