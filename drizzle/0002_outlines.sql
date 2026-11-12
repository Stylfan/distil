CREATE TABLE "outlines" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"content" jsonb NOT NULL,
	"previous" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "outlines_workshop_id_unique" UNIQUE("workshop_id")
);
--> statement-breakpoint
ALTER TABLE "usage_days" ADD COLUMN "outlines" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "outline_day" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "outlines_on_day" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "outlines" ADD CONSTRAINT "outlines_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;