import { withUser } from "@/db/client";
import type { DiagramRow, Note, OutlineRow } from "@/db/schema";
import { getDiagram } from "@/services/diagrams";
import { getOutline } from "@/services/outlines";
import { getWorkshop, listNotes, type WorkshopFull } from "@/services/workshops";

/**
 * What the workshop page needs, read in one transaction in which the
 * database knows who is asking: the workshop, its photos, and the chosen
 * photo with its notes. The chosen photo is the one asked for, else the
 * first that still needs checking, else the first. Null when the workshop
 * is not the user's, exactly like one that does not exist.
 */
export type Desk = {
  full: WorkshopFull;
  chosen: (WorkshopFull["photos"][number] & { imageExpiresIn: number | null }) | undefined;
  notes: Note[];
  outline: OutlineRow | null;
  diagram: DiagramRow | null;
};

export async function loadDesk(
  userId: string,
  workshopId: string,
  wanted: string | undefined,
  now = Date.now(),
): Promise<Desk | null> {
  return withUser(userId, async (tx) => {
    const full = await getWorkshop(tx, userId, workshopId, now);
    if (!full) return null;
    const photo =
      full.photos.find((p) => p.id === wanted) ??
      full.photos.find((p) => p.status === "read") ??
      full.photos[0];
    const notes = photo ? await listNotes(tx, userId, photo.id) : [];
    const chosen = photo && {
      ...photo,
      imageExpiresIn: photo.imageExpiresAt === null ? null : photo.imageExpiresAt - now,
    };
    const outline = await getOutline(tx, userId, workshopId);
    const diagram = photo ? await getDiagram(tx, userId, photo.id) : null;
    return { full, chosen, notes, outline, diagram };
  });
}
