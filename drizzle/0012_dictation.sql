ALTER TABLE "usage_days" ADD COLUMN "dictations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dictation_day" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dictations_on_day" integer DEFAULT 0 NOT NULL;