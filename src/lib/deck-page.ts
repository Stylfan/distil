import { withUser } from "@/db/client";
import type { NoteColour, Workshop } from "@/db/schema";
import { buildDeck, type Slide } from "@/domain/deck";
import { detectLanguage, type DeckLanguage } from "@/domain/deck-words";
import { formatDay } from "@/lib/dates";
import { getOutline, notesOfWorkshop } from "@/services/outlines";
import { findWorkshop } from "@/services/workshops";

/**
 * The presentation of a workshop, read as the user: its slides from the
 * outline and the notes, in the language the notes are written in. Null
 * when the workshop is not the user's; no slides before there is an
 * outline.
 */
export type DeckPage = {
  workshop: Workshop;
  slides: Slide[] | null;
  language: DeckLanguage;
  includeTranscript: boolean;
};

export async function loadDeck(userId: string, workshopId: string): Promise<DeckPage | null> {
  return withUser(userId, async (tx) => {
    const workshop = await findWorkshop(tx, userId, workshopId);
    if (!workshop) return null;
    const [outline, notes] = await Promise.all([
      getOutline(tx, userId, workshopId),
      notesOfWorkshop(tx, userId, workshopId),
    ]);
    const language = detectLanguage(notes.map((n) => n.text));
    if (!outline) return { workshop, slides: null, language, includeTranscript: false };
    const slides = buildDeck({
      title: workshop.name,
      date: formatDay(workshop.heldOn, language),
      outline: outline.content,
      notes: notes.map((n) => ({
        id: n.id,
        text: n.text,
        colour: n.colour as NoteColour,
        photo: n.photo,
      })),
      includeTranscript: outline.includeTranscript,
    });
    return { workshop, slides, language, includeTranscript: outline.includeTranscript };
  });
}
