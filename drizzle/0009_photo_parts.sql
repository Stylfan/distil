-- A photo's image may come with parts cut out at full resolution for
-- reading (src/domain/tiles.ts): part 0 is the whole photo, 1 and up the
-- parts, each with where it lies on the whole. Same table, same rules:
-- row-level security, never audited, gone with the photo or after 24 hours.
ALTER TABLE "photo_images" DROP CONSTRAINT "photo_images_pkey";--> statement-breakpoint
ALTER TABLE "photo_images" ADD COLUMN "part" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_images" ADD COLUMN "left" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_images" ADD COLUMN "top" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_images" ADD COLUMN "width" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_images" ADD COLUMN "height" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_images" ADD CONSTRAINT "photo_images_photo_id_part_pk" PRIMARY KEY("photo_id","part");
