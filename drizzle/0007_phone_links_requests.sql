CREATE TABLE "phone_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workshop_id" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "more_requested_at" bigint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "more_request_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "phone_links" ADD CONSTRAINT "phone_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_links" ADD CONSTRAINT "phone_links_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "phone_links_workshop_idx" ON "phone_links" USING btree ("workshop_id");--> statement-breakpoint
-- Phone links are looked up before anyone is signed in, like sessions.
GRANT SELECT, INSERT, UPDATE, DELETE ON "phone_links" TO distil_app;
