import { withUser } from "@/db/client";
import type { NoteColour, Workshop } from "@/db/schema";
import { makeDeck, type Slide } from "@/domain/deck";
import { detectLanguage, type DeckLanguage } from "@/domain/deck-words";
import type { Outline } from "@/domain/outline";
import { DEFAULT_LOOK, type Look } from "@/domain/story";
import { formatDay } from "@/lib/dates";
import { getOutline, notesOfWorkshop } from "@/services/outlines";
import { listDiagrams } from "@/services/diagrams";
import { findWorkshop, getWorkshop } from "@/services/workshops";

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
  look: Look;
  /** Whether Distil has told the story, or the deck is made from the outline by rule. */
  told: boolean;
  /** The outline the slides were built from, for editing them where they stand. */
  outline: { content: Outline; version: number } | null;
};

export async function loadDeck(userId: string, workshopId: string): Promise<DeckPage | null> {
  return withUser(userId, async (tx) => {
    const workshop = await findWorkshop(tx, userId, workshopId);
    if (!workshop) return null;
    const [outline, notes, drawings, full] = await Promise.all([
      getOutline(tx, userId, workshopId),
      notesOfWorkshop(tx, userId, workshopId),
      listDiagrams(tx, userId, workshopId),
      getWorkshop(tx, userId, workshopId),
    ]);
    const sizes = new Map(full?.photos.map((ph) => [ph.seq, ph]) ?? []);
    const language = detectLanguage(notes.map((n) => n.text));
    if (!outline) {
      return {
        workshop,
        slides: null,
        language,
        includeTranscript: false,
        look: DEFAULT_LOOK,
        told: false,
        outline: null,
      };
    }
    const deck = makeDeck({
      title: workshop.name,
      date: formatDay(workshop.heldOn, language),
      outline: outline.content,
      notes: notes.map((n) => ({
        id: n.id,
        text: n.text,
        colour: n.colour as NoteColour,
        photo: n.photo,
        votes: n.votes,
      })),
      includeTranscript: outline.includeTranscript,
      diagrams: drawings
        .filter((d) => d.include)
        .map((d) => ({
          photo: d.photo,
          diagram: d.content,
          width: sizes.get(d.photo)?.width ?? 1600,
          height: sizes.get(d.photo)?.height ?? 1000,
        })),
    });
    return {
      workshop,
      slides: deck.slides,
      language,
      includeTranscript: outline.includeTranscript,
      look: deck.look,
      told: !!outline.content.story,
      outline: { content: outline.content, version: outline.version },
    };
  });
}
