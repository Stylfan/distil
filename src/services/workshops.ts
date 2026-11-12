import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { notes, photos, workshops, type Note, type Photo, type Workshop } from "@/db/schema";
import { NotFound } from "./errors";

/**
 * Workshops: the unit everything else hangs off. Every function takes the
 * acting user and reaches a workshop only through one that user owns, on
 * top of the row-level security the database applies anyway.
 */

export type WorkshopSummary = Workshop & { photoCount: number; noteCount: number };

export type WorkshopFull = {
  workshop: Workshop;
  photos: (Photo & {
    noteCount: number;
    unsureCount: number;
    /** When the kept image is deleted anyway; null when there is none (any more). */
    imageExpiresAt: number | null;
  })[];
};

export async function createWorkshop(
  db: Db,
  userId: string,
  input: { name: string; heldOn: string },
): Promise<string> {
  const [row] = await db
    .insert(workshops)
    .values({ ownerId: userId, name: input.name.trim(), heldOn: input.heldOn })
    .returning({ id: workshops.id });
  return row!.id;
}

export async function listWorkshops(db: Db, userId: string): Promise<WorkshopSummary[]> {
  const rows = await db
    .select({
      workshop: workshops,
      photoCount: sql<number>`(select count(*)::int from photos p where p.workshop_id = "workshops"."id")`,
      noteCount: sql<number>`(select count(*)::int from notes n where n.workshop_id = "workshops"."id")`,
    })
    .from(workshops)
    .where(eq(workshops.ownerId, userId))
    .orderBy(desc(workshops.heldOn), desc(workshops.createdAt));
  return rows.map((r) => ({ ...r.workshop, photoCount: r.photoCount, noteCount: r.noteCount }));
}

/** The workshop if it is the user's, or null; exactly the same answer when it does not exist. */
export async function findWorkshop(db: Db, userId: string, id: string): Promise<Workshop | null> {
  const [row] = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.id, id), eq(workshops.ownerId, userId)));
  return row ?? null;
}

export async function requireWorkshop(db: Db, userId: string, id: string): Promise<Workshop> {
  const workshop = await findWorkshop(db, userId, id);
  if (!workshop) throw new NotFound();
  return workshop;
}

export async function getWorkshop(
  db: Db,
  userId: string,
  id: string,
  now = Date.now(),
): Promise<WorkshopFull | null> {
  const workshop = await findWorkshop(db, userId, id);
  if (!workshop) return null;
  const rows = await db
    .select({
      photo: photos,
      noteCount: sql<number>`(select count(*)::int from notes n where n.photo_id = "photos"."id")`,
      unsureCount: sql<number>`(select count(*)::int from notes n where n.photo_id = "photos"."id" and n.unsure)`,
      imageExpiresAt: sql<
        string | null
      >`(select i.expires_at from photo_images i where i.photo_id = "photos"."id" and i.part = 0 and i.expires_at > ${now})`,
    })
    .from(photos)
    .where(eq(photos.workshopId, id))
    .orderBy(asc(photos.seq));
  return {
    workshop,
    photos: rows.map((r) => ({
      ...r.photo,
      noteCount: r.noteCount,
      unsureCount: r.unsureCount,
      imageExpiresAt: r.imageExpiresAt === null ? null : Number(r.imageExpiresAt),
    })),
  };
}

export async function renameWorkshop(
  db: Db,
  userId: string,
  id: string,
  input: { name: string; heldOn: string },
): Promise<void> {
  await requireWorkshop(db, userId, id);
  await db
    .update(workshops)
    .set({ name: input.name.trim(), heldOn: input.heldOn })
    .where(eq(workshops.id, id));
}

/** Deletes the workshop with its photos, images and notes. */
export async function deleteWorkshop(db: Db, userId: string, id: string): Promise<void> {
  await requireWorkshop(db, userId, id);
  await db.delete(workshops).where(eq(workshops.id, id));
}

/** The notes of one photo, in reading order. */
export async function listNotes(db: Db, userId: string, photoId: string): Promise<Note[]> {
  const [photo] = await db
    .select({ workshopId: photos.workshopId })
    .from(photos)
    .innerJoin(workshops, eq(workshops.id, photos.workshopId))
    .where(and(eq(photos.id, photoId), eq(workshops.ownerId, userId)));
  if (!photo) throw new NotFound();
  return db.select().from(notes).where(eq(notes.photoId, photoId)).orderBy(asc(notes.seq));
}

export async function countPhotos(db: Db, workshopId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(photos)
    .where(eq(photos.workshopId, workshopId));
  return row?.n ?? 0;
}
