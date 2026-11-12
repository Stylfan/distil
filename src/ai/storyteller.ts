import type { Outline } from "@/domain/outline";
import { notesForModel, type NoteForOutline } from "@/domain/outline-reading";
import { guessIcon, type Story } from "@/domain/story";
import { outlineForStory, parseStory } from "@/domain/story-reading";
import { ReadError } from "./errors";
import { mistralFromEnv, mistralJson, type MistralOptions } from "./mistral-chat";
import { STORY_PROMPT } from "./story-prompt";

/**
 * The model's side of the story: the approved outline and the notes' text
 * as numbered lines go out (never a photo, an account or a workshop's
 * name), the story comes back and is checked (domain/story-reading).
 */
export type Storyteller = { tell(outline: Outline, notes: NoteForOutline[]): Promise<Story> };

/** Enough notes to choose a quote from, without sending a whole wall twice. */
const QUOTABLE = 150;

export function mistralStoryteller(options: MistralOptions): Storyteller {
  return {
    async tell(outline, notes) {
      const quotable = [...notes]
        .filter((n) => n.kind === "note")
        .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
        .slice(0, QUOTABLE);
      const { lines, toId } = notesForModel(quotable);
      const answer = await mistralJson(options, [
        { role: "system", content: STORY_PROMPT },
        {
          role: "user",
          content: `The approved outline:\n${outlineForStory(outline)}\n\nThe notes:\n${lines}`,
        },
      ]);
      const story = parseStory(answer, outline, toId);
      if (!story) throw new ReadError("unreadable");
      return story;
    },
  };
}

/** A stand-in without a key (DISTIL_READER=fake): the outline's own words, plainly arranged. */
export const fakeStoryteller: Storyteller = {
  async tell(outline, notes) {
    const themes = outline.themes.filter((t) => t.title.trim());
    return {
      headline: `${themes[0]?.title ?? "Workshoppen"} fylder mest, og det skal handles på nu`,
      tagline: "Det vi fandt, og det vi gør nu",
      soWhat: outline.actions[0]?.what ?? "Næste skridt aftales på næste møde.",
      keyMessages: themes.slice(0, 3).map((t, i) => ({
        icon: guessIcon(t.title, i),
        title: t.title,
        text: t.summary || t.points[0] || "",
      })),
      themes: themes.map((t, i) => ({
        themeId: t.id,
        headline: `${t.title} kræver en beslutning`,
        icon: guessIcon(t.title, i),
        soWhat: t.points[0] ?? "",
      })),
      shifts: [{ from: "Hver for sig", to: "Sammen om det samme" }],
      quoteNoteId: notes.find((n) => n.kind === "note")?.id ?? null,
      closing: "Tak for i dag",
    };
  },
};

export function getStoryteller(env: NodeJS.ProcessEnv = process.env): Storyteller {
  if (env.DISTIL_READER === "fake") return fakeStoryteller;
  const options = mistralFromEnv(env);
  if (!options) return { tell: () => Promise.reject(new ReadError("notConfigured")) };
  return mistralStoryteller(options);
}
