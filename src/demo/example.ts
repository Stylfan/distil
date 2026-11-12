import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { diagrams, notes, outlines, photos, type NoteColour, type NoteKind } from "@/db/schema";
import type { WorkshopContext } from "@/domain/context";
import type { Diagram } from "@/domain/diagram";
import { outlineSchema, type Outline } from "@/domain/outline";
import { addPhoto } from "@/services/photos";
import { createWorkshop, setContext } from "@/services/workshops";

/**
 * The example workshop every demo visit gets, so a visitor sees at once
 * what Distil makes of a real wall: the photos beside what was read, the
 * outline, and the presentation. It lives in `demo-workshop/` (the photos
 * and one JSON file) and is copied into the visit's own account, where it
 * is kept like any other workshop: the photos for at most a day, and all
 * of it deleted with the visit. Without the folder, a visit starts empty.
 */

type ExampleNote = {
  key: string;
  photo: number;
  seq: number;
  kind: NoteKind;
  text: string;
  colour: NoteColour;
  x: number;
  y: number;
  unsure: boolean;
  alternatives: string[];
  votes: number;
  edited: boolean;
};

export type ExampleWorkshop = {
  name: string;
  heldOn: string;
  context: WorkshopContext | null;
  photos: { seq: number }[];
  notes: ExampleNote[];
  diagrams: { photo: number; content: Diagram; include: boolean }[];
  outline: { content: Outline; includeTranscript: boolean } | null;
};

export const EXAMPLE_DIR = path.join(process.cwd(), "demo-workshop");

export function loadExample(
  dir = EXAMPLE_DIR,
): { workshop: ExampleWorkshop; images: Map<number, Buffer> } | null {
  try {
    const workshop = JSON.parse(
      fs.readFileSync(path.join(dir, "workshop.json"), "utf8"),
    ) as ExampleWorkshop;
    const images = new Map(
      workshop.photos.map((p) => [p.seq, fs.readFileSync(path.join(dir, `photo-${p.seq}.jpg`))]),
    );
    return { workshop, images };
  } catch {
    return null;
  }
}

/** Copies the example into the user's account; returns the new workshop's id, or null without one. */
export async function createExampleWorkshop(
  db: Db,
  userId: string,
  example = loadExample(),
  now = Date.now(),
): Promise<string | null> {
  if (!example) return null;
  const { workshop: ex, images } = example;
  const workshopId = await createWorkshop(db, userId, { name: ex.name, heldOn: ex.heldOn });
  if (ex.context) await setContext(db, userId, workshopId, ex.context);

  const photoIds = new Map<number, string>();
  for (const p of ex.photos) {
    const id = await addPhoto(db, userId, workshopId, images.get(p.seq)!, now);
    // Read already: the visitor sees what Distil made of it, and can check it and approve it.
    await db
      .update(photos)
      .set({ status: "read", readAt: now })
      .where(and(eq(photos.id, id), eq(photos.workshopId, workshopId)));
    photoIds.set(p.seq, id);
  }

  const noteIds = new Map<string, string>();
  if (ex.notes.length > 0) {
    const inserted = await db
      .insert(notes)
      .values(
        ex.notes.map((n) => ({
          workshopId,
          photoId: photoIds.get(n.photo)!,
          seq: n.seq,
          kind: n.kind,
          text: n.text,
          colour: n.colour,
          x: n.x,
          y: n.y,
          unsure: n.unsure,
          alternatives: n.alternatives,
          votes: n.votes,
          edited: n.edited,
        })),
      )
      .returning({ id: notes.id });
    ex.notes.forEach((n, i) => noteIds.set(n.key, inserted[i]!.id));
  }

  for (const d of ex.diagrams) {
    await db.insert(diagrams).values({
      workshopId,
      photoId: photoIds.get(d.photo)!,
      content: d.content,
      include: d.include,
    });
  }

  if (ex.outline) {
    const map = (keys: string[]) =>
      keys.map((k) => noteIds.get(k)).filter((id): id is string => !!id);
    const o = ex.outline.content;
    const content = outlineSchema.parse({
      ...o,
      themes: o.themes.map((t) => ({ ...t, noteIds: map(t.noteIds) })),
      actions: o.actions.map((a) => ({ ...a, noteIds: map(a.noteIds) })),
      openPoints: o.openPoints.map((p) => ({ ...p, noteIds: map(p.noteIds) })),
      story: o.story
        ? {
            ...o.story,
            quoteNoteId: (o.story.quoteNoteId && noteIds.get(o.story.quoteNoteId)) || null,
          }
        : o.story,
    });
    await db.insert(outlines).values({
      workshopId,
      content,
      includeTranscript: ex.outline.includeTranscript,
      generatedAt: now,
    });
  }
  return workshopId;
}
