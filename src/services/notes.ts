import { and, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import { notes, photos, workshops, type NoteColour, type NoteKind } from "@/db/schema";
import { NotFound } from "./errors";

/**
 * The facilitator's corrections to a reading: change what a note says or
 * its colour, add one Distil missed, delete one that is not there. A note
 * the facilitator has touched is marked as edited and no longer unsure.
 */

async function ownedNote(db: Db, userId: string, noteId: string) {
  const [row] = await db
    .select({ id: notes.id, photoId: notes.photoId })
    .from(notes)
    .innerJoin(workshops, eq(workshops.id, notes.workshopId))
    .where(and(eq(notes.id, noteId), eq(workshops.ownerId, userId)));
  if (!row) throw new NotFound();
  return row;
}

export async function updateNote(
  db: Db,
  userId: string,
  noteId: string,
  input: { text?: string; colour?: NoteColour; kind?: NoteKind; votes?: number },
): Promise<void> {
  await ownedNote(db, userId, noteId);
  await db
    .update(notes)
    .set({
      ...(input.text !== undefined && { text: input.text.trim() }),
      ...(input.colour !== undefined && { colour: input.colour }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.votes !== undefined && { votes: input.votes }),
      // Changing the words or the colour settles a doubt about them; a count of dots does not.
      ...((input.text !== undefined || input.colour !== undefined) && { unsure: false }),
      edited: true,
    })
    .where(eq(notes.id, noteId));
}

/** Adds a note Distil missed, at the end of the photo's notes, where it hangs if placed. Returns its id. */
export async function addNote(
  db: Db,
  userId: string,
  photoId: string,
  input: { text: string; colour: NoteColour; x?: number; y?: number },
): Promise<string> {
  const [photo] = await db
    .select({ workshopId: photos.workshopId })
    .from(photos)
    .innerJoin(workshops, eq(workshops.id, photos.workshopId))
    .where(and(eq(photos.id, photoId), eq(workshops.ownerId, userId)));
  if (!photo) throw new NotFound();
  const [last] = await db
    .select({ seq: max(notes.seq) })
    .from(notes)
    .where(eq(notes.photoId, photoId));
  const [row] = await db
    .insert(notes)
    .values({
      workshopId: photo.workshopId,
      photoId,
      seq: (last?.seq ?? 0) + 1,
      text: input.text.trim(),
      colour: input.colour,
      // Where the facilitator clicked on the photo, when the note was placed there.
      ...(input.x !== undefined && { x: input.x }),
      ...(input.y !== undefined && { y: input.y }),
      edited: true,
    })
    .returning({ id: notes.id });
  return row!.id;
}

export async function deleteNote(db: Db, userId: string, noteId: string): Promise<void> {
  await ownedNote(db, userId, noteId);
  await db.delete(notes).where(eq(notes.id, noteId));
}
