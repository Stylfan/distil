import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bytea, id, now, timestamps } from "./columns";
import type { Diagram } from "@/domain/diagram";
import type { Outline } from "@/domain/outline";
import { users } from "./schema-accounts";

export * from "./schema-accounts";

/**
 * Distil's data, in Postgres. A workshop is the unit everything else hangs
 * off, and deleting it deletes what it owns. Row-level security keys every
 * workshop table on the workshop's owner (drizzle/0001_roles_rls_audit.sql),
 * so the database itself hides one account's workshops from another, and
 * an append-only audit log records every change. Instants are milliseconds
 * since the epoch.
 */

export const workshops = pgTable(
  "workshops",
  {
    id: id(),
    /** Who the workshop belongs to; only they can see or change it, and the database enforces it. */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The day it was held, yyyy-mm-dd. */
    heldOn: text("held_on").notNull(),
    ...timestamps,
  },
  (t) => [index("workshops_owner_idx").on(t.ownerId)],
);

/**
 * waiting: uploaded, not read yet. reading: at Mistral now. read: notes are
 * in, waiting for the facilitator to check them. failed: the reading did
 * not work and may be tried again. approved: checked, and the image is gone.
 */
export const PHOTO_STATUSES = ["waiting", "reading", "read", "failed", "approved"] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

/** A photo of the wall, as a record. The image itself is in photo_images until it is deleted. */
export const photos = pgTable(
  "photos",
  {
    id: id(),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    /** Order within the workshop, from 1. */
    seq: integer("seq").notNull(),
    status: text("status").$type<PhotoStatus>().notNull().default("waiting"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** A short code for why the reading failed ("ceiling", "provider", "unreadable"); never model output. */
    error: text("error"),
    readAt: bigint("read_at", { mode: "number" }),
    approvedAt: bigint("approved_at", { mode: "number" }),
    /** When the image was deleted, by approval or because its time was up. */
    imageDeletedAt: bigint("image_deleted_at", { mode: "number" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("photos_workshop_seq_uq").on(t.workshopId, t.seq)],
);

/**
 * The image of a photo, kept only until the facilitator has checked the
 * reading and never past `expires_at` (24 hours). Its own table so that
 * deleting it is one row, and so that it is not audited: the audit log
 * must not keep a copy of a picture that may show people.
 */
export const photoImages = pgTable(
  "photo_images",
  {
    photoId: text("photo_id")
      .primaryKey()
      .references(() => photos.id, { onDelete: "cascade" }),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(),
    data: bytea("data").notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  },
  (t) => [index("photo_images_expires_idx").on(t.expiresAt)],
);

/** What is on a note, or a heading, a loose line of text, or a drawing Distil describes. */
export const NOTE_KINDS = ["note", "heading", "text", "drawing"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** The colour of a post-it as Distil saw it; "none" for writing straight on the board. */
export const NOTE_COLOURS = [
  "yellow",
  "orange",
  "pink",
  "red",
  "green",
  "blue",
  "purple",
  "white",
  "none",
] as const;
export type NoteColour = (typeof NOTE_COLOURS)[number];

/** One thing read off a photo, word for word, where it was on the photo. */
export const notes = pgTable(
  "notes",
  {
    id: id(),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    kind: text("kind").$type<NoteKind>().notNull().default("note"),
    text: text("text").notNull(),
    colour: text("colour").$type<NoteColour>().notNull().default("none"),
    /** The centre of the note on the photo, in thousandths of its width and height. */
    x: integer("x").notNull().default(500),
    y: integer("y").notNull().default(500),
    /** Distil could not read it with certainty; the facilitator should look. */
    unsure: boolean("unsure").notNull().default(false),
    /** Other readings Distil considered, best first. */
    alternatives: jsonb("alternatives").$type<string[]>().notNull().default([]),
    /** Dots or ticks the participants put on it when voting. */
    votes: integer("votes").notNull().default(0),
    /** Changed or added by the facilitator, not as Distil read it. */
    edited: boolean("edited").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("notes_photo_idx").on(t.photoId, t.seq)],
);

/**
 * The outline of a workshop (src/domain/outline.ts), as one document: what
 * Distil made of the notes, as the facilitator has shaped it since. The
 * version before Distil's last change is kept, so that change can be
 * undone.
 */
export const outlines = pgTable("outlines", {
  id: id(),
  workshopId: text("workshop_id")
    .notNull()
    .unique()
    .references(() => workshops.id, { onDelete: "cascade" }),
  content: jsonb("content").$type<Outline>().notNull(),
  previous: jsonb("previous").$type<Outline>(),
  /** Raised on every save, so two windows cannot overwrite each other unseen. */
  version: integer("version").notNull().default(1),
  /** Whether the presentation ends with every note word for word, as an appendix. */
  includeTranscript: boolean("include_transcript").notNull().default(false),
  /** When Distil last made or changed it. */
  generatedAt: bigint("generated_at", { mode: "number" }).notNull(),
  ...timestamps,
});

/**
 * A drawing on a photo, redrawn as a diagram (src/domain/diagram.ts): at
 * most one per photo, made when the photo is read, then touched up by the
 * facilitator. Kept like the notes when the image is deleted.
 */
export const diagrams = pgTable("diagrams", {
  id: id(),
  workshopId: text("workshop_id")
    .notNull()
    .references(() => workshops.id, { onDelete: "cascade" }),
  photoId: text("photo_id")
    .notNull()
    .unique()
    .references(() => photos.id, { onDelete: "cascade" }),
  content: jsonb("content").$type<Diagram>().notNull(),
  /** Whether the diagram has a slide of its own in the presentation. */
  include: boolean("include").notNull().default(true),
  ...timestamps,
});

/**
 * A phone let into one workshop from a signed-in computer, by a QR code:
 * it may add photos to that workshop and answer its questions, nothing
 * else, until it expires. The id is the SHA-256 of the token in the
 * link, so a copy of the database opens nothing. Looked up before anyone
 * is known, like a session, so outside row-level security; it goes with
 * the workshop or the account.
 */
export const phoneLinks = pgTable(
  "phone_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  },
  (t) => [index("phone_links_workshop_idx").on(t.workshopId)],
);

export type Workshop = typeof workshops.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type OutlineRow = typeof outlines.$inferSelect;
export type DiagramRow = typeof diagrams.$inferSelect;

/**
 * Every change to a workshop's data, written by a database trigger
 * (drizzle/0001_roles_rls_audit.sql), never by the application. The
 * application role may only read the rows of its own workshops; nobody may
 * update or delete a row, except the account-deletion function erasing an
 * account completely. Images are never audited.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    at: bigint("at", { mode: "number" }).notNull(),
    actorUserId: text("actor_user_id"),
    tableName: text("table_name").notNull(),
    operation: text("operation").notNull(),
    rowId: text("row_id"),
    workshopId: text("workshop_id"),
    before: jsonb("before"),
    after: jsonb("after"),
  },
  (t) => [index("audit_log_workshop_idx").on(t.workshopId, t.at)],
);

export type AuditEntry = typeof auditLog.$inferSelect;
