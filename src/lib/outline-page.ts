import { withUser } from "@/db/client";
import type { OutlineRow, Workshop } from "@/db/schema";
import type { NoteChip } from "@/components/outline/theme-card";
import { getOutline, notesOfWorkshop } from "@/services/outlines";
import { findWorkshop } from "@/services/workshops";

/**
 * What the outline page needs, in one transaction as the user: the
 * workshop, its outline if there is one, and its notes as small chips for
 * the themes. Null when the workshop is not the user's.
 */
export async function loadOutlinePage(
  userId: string,
  workshopId: string,
): Promise<{
  workshop: Workshop;
  outline: OutlineRow | null;
  notes: Record<string, NoteChip>;
} | null> {
  return withUser(userId, async (tx) => {
    const workshop = await findWorkshop(tx, userId, workshopId);
    if (!workshop) return null;
    const [outline, notes] = await Promise.all([
      getOutline(tx, userId, workshopId),
      notesOfWorkshop(tx, userId, workshopId),
    ]);
    return {
      workshop,
      outline,
      notes: Object.fromEntries(
        notes.map((n) => [n.id, { text: n.text, colour: n.colour as NoteChip["colour"] }]),
      ),
    };
  });
}
