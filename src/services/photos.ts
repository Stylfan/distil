import { and, count, eq, gt, max, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { notes, photoImages, photos, workshops, type Photo } from "@/db/schema";
import { checkImage } from "@/domain/image";
import { IMAGE_HOURS, MAX_IMAGES_WAITING, PHOTOS_PER_WORKSHOP } from "@/domain/limits";
import { inReadingOrder, type ReadItem } from "@/domain/reading";
import { BadPhoto, LimitReached, NotFound, type LimitKind } from "./errors";
import { releasePhoto, reservePhoto } from "./limits";
import { countPhotos, requireWorkshop } from "./workshops";

/**
 * Photos of a workshop, from upload to the moment the image is gone. The
 * image waits in photo_images until the facilitator approves the reading,
 * and never longer than IMAGE_HOURS. Reading is split in two around the
 * call to the model, so no transaction is held open while Mistral works:
 * startReading() counts the photo and hands out the image; finishReading()
 * or failReading() stores the outcome.
 */

async function ownedPhoto(db: Db, userId: string, photoId: string): Promise<Photo> {
  const [row] = await db
    .select({ photo: photos })
    .from(photos)
    .innerJoin(workshops, eq(workshops.id, photos.workshopId))
    .where(and(eq(photos.id, photoId), eq(workshops.ownerId, userId)));
  if (!row) throw new NotFound();
  return row.photo;
}

/** Keeps an uploaded photo for reading. Returns its id. */
export async function addPhoto(
  db: Db,
  userId: string,
  workshopId: string,
  bytes: Buffer,
  now = Date.now(),
): Promise<string> {
  await requireWorkshop(db, userId, workshopId);
  const check = checkImage(bytes);
  if (!check.ok) throw new BadPhoto(check.reason);
  // Serialises uploads to one workshop, so the count and the next number hold.
  await db.execute(sql`select id from workshops where id = ${workshopId} for update`);
  if ((await countPhotos(db, workshopId)) >= PHOTOS_PER_WORKSHOP) {
    throw new LimitReached("workshopFull");
  }
  // Images of the account's own workshops only: the join keeps to the owner.
  const [waiting] = await db
    .select({ n: count() })
    .from(photoImages)
    .innerJoin(workshops, eq(workshops.id, photoImages.workshopId))
    .where(eq(workshops.ownerId, userId));
  if ((waiting?.n ?? 0) >= MAX_IMAGES_WAITING) throw new LimitReached("stored");
  const [last] = await db
    .select({ seq: max(photos.seq) })
    .from(photos)
    .where(eq(photos.workshopId, workshopId));
  const [photo] = await db
    .insert(photos)
    .values({
      workshopId,
      seq: (last?.seq ?? 0) + 1,
      width: check.width,
      height: check.height,
    })
    .returning({ id: photos.id });
  await db.insert(photoImages).values({
    photoId: photo!.id,
    workshopId,
    mime: check.mime,
    data: bytes,
    expiresAt: now + IMAGE_HOURS * 3_600_000,
  });
  return photo!.id;
}

/** The image of a photo, while it is still kept; null once it is deleted. */
export async function getImage(
  db: Db,
  userId: string,
  photoId: string,
  now = Date.now(),
): Promise<{ mime: string; data: Buffer } | null> {
  await ownedPhoto(db, userId, photoId);
  // Past its time it is as good as gone, even before the purge has run.
  const [row] = await db
    .select({ mime: photoImages.mime, data: photoImages.data })
    .from(photoImages)
    .where(and(eq(photoImages.photoId, photoId), gt(photoImages.expiresAt, now)));
  return row ?? null;
}

/** A reading still "reading" after this long is taken to have died. */
const STUCK_AFTER_MS = 5 * 60 * 1000;

export type ReadStart =
  | { kind: "image"; mime: string; data: Buffer }
  | { kind: "nothing" }
  | { kind: "limit"; limit: LimitKind };

/**
 * Marks the photo as being read and counts it against the limits. Returns
 * the image to send to the model; nothing when there is nothing to read
 * (already read, approved, or the image is gone); or the limit that
 * stopped it, which is then also on the photo. Never throws for a limit,
 * so the photo's new state is not rolled back with the transaction.
 */
export async function startReading(
  db: Db,
  userId: string,
  photoId: string,
  now = Date.now(),
): Promise<ReadStart> {
  const photo = await ownedPhoto(db, userId, photoId);
  // A reading that never came back (the server stopped half-way) may be
  // taken up again; it was counted already.
  const stuck = photo.status === "reading" && photo.updatedAt < now - STUCK_AFTER_MS;
  if (photo.status !== "waiting" && photo.status !== "failed" && !stuck) return { kind: "nothing" };
  const image = await getImage(db, userId, photoId, now);
  if (!image) return { kind: "nothing" };
  const claimed = await db
    .update(photos)
    .set({ status: "reading", error: null })
    .where(and(eq(photos.id, photoId), eq(photos.status, photo.status)))
    .returning({ id: photos.id });
  if (claimed.length === 0) return { kind: "nothing" };
  if (stuck) return { kind: "image", ...image };
  try {
    await reservePhoto(db, userId, now);
  } catch (error) {
    if (!(error instanceof LimitReached)) throw error;
    await db
      .update(photos)
      .set({ status: "failed", error: error.kind })
      .where(eq(photos.id, photoId));
    return { kind: "limit", limit: error.kind };
  }
  return { kind: "image", ...image };
}

/** Stores what was read, in reading order, in place of anything read before. */
export async function finishReading(
  db: Db,
  userId: string,
  photoId: string,
  items: ReadItem[],
  now = Date.now(),
): Promise<void> {
  const photo = await ownedPhoto(db, userId, photoId);
  await db.delete(notes).where(eq(notes.photoId, photoId));
  const ordered = inReadingOrder(items);
  if (ordered.length > 0) {
    await db.insert(notes).values(
      ordered.map((item, i) => ({
        workshopId: photo.workshopId,
        photoId,
        seq: i + 1,
        kind: item.kind,
        text: item.text,
        colour: item.colour,
        x: item.x,
        y: item.y,
        unsure: item.unsure,
        alternatives: item.alternatives,
      })),
    );
  }
  await db
    .update(photos)
    .set({ status: "read", error: null, readAt: now })
    .where(eq(photos.id, photoId));
}

/** The reading did not happen: the photo can be tried again, and its place is given back. */
export async function failReading(
  db: Db,
  userId: string,
  photoId: string,
  code: string,
  now = Date.now(),
): Promise<void> {
  await ownedPhoto(db, userId, photoId);
  await db.update(photos).set({ status: "failed", error: code }).where(eq(photos.id, photoId));
  await releasePhoto(db, userId, now);
}

/** The facilitator has checked the reading: the image is deleted now. */
export async function approvePhoto(
  db: Db,
  userId: string,
  photoId: string,
  now = Date.now(),
): Promise<void> {
  const photo = await ownedPhoto(db, userId, photoId);
  if (photo.status !== "read") throw new NotFound();
  await db.delete(photoImages).where(eq(photoImages.photoId, photoId));
  await db
    .update(photos)
    .set({ status: "approved", approvedAt: now, imageDeletedAt: photo.imageDeletedAt ?? now })
    .where(eq(photos.id, photoId));
}

/** Deletes the photo, its image and its notes. */
export async function deletePhoto(db: Db, userId: string, photoId: string): Promise<void> {
  await ownedPhoto(db, userId, photoId);
  await db.delete(photos).where(eq(photos.id, photoId));
}

let lastPurge = 0;
const PURGE_EVERY_MS = 10 * 60 * 1000;

/** Deletes every image whose time is up, whoever it belongs to. Returns how many. */
export async function purgeExpiredImages(db: Db, now = Date.now()): Promise<number> {
  const { rows } = await db.execute<{ n: number }>(sql`select purge_expired_images(${now}) as n`);
  return Number(rows[0]?.n ?? 0);
}

/**
 * Purges at most every ten minutes, from wherever the app is in use, so no
 * scheduler is needed. An image past its time is never served or read
 * meanwhile: getImage() leaves it out.
 */
export async function maybePurgeImages(db: Db, now = Date.now()): Promise<void> {
  if (now - lastPurge < PURGE_EVERY_MS) return;
  lastPurge = now;
  await purgeExpiredImages(db, now);
}
