import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { diagrams, photos, workshops, type DiagramRow } from "@/db/schema";
import { diagramSchema, type Diagram } from "@/domain/diagram";
import { NotFound } from "./errors";
import { requireWorkshop } from "./workshops";

/**
 * The drawings of a workshop, redrawn: one per photo at most. Stored when
 * the photo is read (replacing an earlier one, or removing it when the new
 * reading found none), touched up by the facilitator, and chosen in or out
 * of the presentation.
 */

async function ownedPhoto(db: Db, userId: string, photoId: string) {
  const [row] = await db
    .select({ workshopId: photos.workshopId })
    .from(photos)
    .innerJoin(workshops, eq(workshops.id, photos.workshopId))
    .where(and(eq(photos.id, photoId), eq(workshops.ownerId, userId)));
  if (!row) throw new NotFound();
  return row;
}

export async function storeDiagram(
  db: Db,
  userId: string,
  photoId: string,
  diagram: Diagram | null,
): Promise<void> {
  const { workshopId } = await ownedPhoto(db, userId, photoId);
  if (!diagram) {
    await db.delete(diagrams).where(eq(diagrams.photoId, photoId));
    return;
  }
  const content = diagramSchema.parse(diagram);
  await db
    .insert(diagrams)
    .values({ workshopId, photoId, content })
    .onConflictDoUpdate({ target: diagrams.photoId, set: { content } });
}

export async function getDiagram(
  db: Db,
  userId: string,
  photoId: string,
): Promise<DiagramRow | null> {
  await ownedPhoto(db, userId, photoId);
  const [row] = await db.select().from(diagrams).where(eq(diagrams.photoId, photoId));
  return row ?? null;
}

/** The facilitator's corrections: new words, a shape or a line removed. */
export async function saveDiagram(
  db: Db,
  userId: string,
  photoId: string,
  diagram: Diagram,
): Promise<void> {
  await ownedPhoto(db, userId, photoId);
  const content = diagramSchema.parse(diagram);
  const saved = await db
    .update(diagrams)
    .set({ content })
    .where(eq(diagrams.photoId, photoId))
    .returning({ id: diagrams.id });
  if (saved.length === 0) throw new NotFound();
}

export async function setDiagramIncluded(
  db: Db,
  userId: string,
  photoId: string,
  include: boolean,
): Promise<void> {
  await ownedPhoto(db, userId, photoId);
  await db.update(diagrams).set({ include }).where(eq(diagrams.photoId, photoId));
}

/** The workshop's diagrams in photo order, with the photo's number. */
export async function listDiagrams(
  db: Db,
  userId: string,
  workshopId: string,
): Promise<(DiagramRow & { photo: number })[]> {
  await requireWorkshop(db, userId, workshopId);
  const rows = await db
    .select({ diagram: diagrams, photo: photos.seq })
    .from(diagrams)
    .innerJoin(photos, eq(photos.id, diagrams.photoId))
    .where(eq(diagrams.workshopId, workshopId))
    .orderBy(asc(photos.seq));
  return rows.map((r) => ({ ...r.diagram, photo: r.photo }));
}
