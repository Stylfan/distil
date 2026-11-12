import type { Outline } from "@/domain/outline";
import { notesForModel, type NoteForOutline } from "@/domain/outline-reading";
import { guessIcon, type Story } from "@/domain/story";
import { outlineForStory, parseStory, storyForModel } from "@/domain/story-reading";
import { ReadError } from "./errors";
import { mistralFromEnv, mistralJson, type MistralOptions } from "./mistral-chat";
import { STORY_PROMPT } from "./story-prompt";

/**
 * The model's side of the story: the approved outline, the facilitator's
 * context and the notes' text as numbered lines go out (never a photo, an
 * account or a workshop's name), the story comes back and is checked
 * (domain/story-reading). With a request ("gør det til direktionen",
 * "fjern tema 7"), the story as it is now goes too, and is changed as asked.
 */

export type Telling = {
  /** The facilitator's context for the workshop, as the model reads it (domain/context). */
  context?: string;
  /** What the facilitator asked for on the presentation. */
  request?: string;
  /** The story the request is about. */
  current?: Story | null;
};

export type Told = { story: Story; reply: string };

export type Storyteller = {
  tell(outline: Outline, notes: NoteForOutline[], telling?: Telling): Promise<Told>;
};

/** Enough notes to choose a quote from, without sending a whole wall twice. */
const QUOTABLE = 150;

export function mistralStoryteller(options: MistralOptions): Storyteller {
  return {
    async tell(outline, notes, { context = "", request = "", current = null } = {}) {
      const quotable = [...notes]
        .filter((n) => n.kind === "note" && !n.unsure)
        .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
        .slice(0, QUOTABLE);
      const { lines, toId } = notesForModel(quotable);
      const revising = !!(request && current);
      const content = [
        context,
        `The approved outline:\n${outlineForStory(outline)}`,
        `The notes:\n${lines}`,
        revising && `The story as it is now:\n${JSON.stringify(storyForModel(current!, toId))}`,
        request &&
          `The facilitator's request for the presentation (follow it; keep everything it does not touch):\n${request}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const answer = await mistralJson(options, [
        { role: "system", content: STORY_PROMPT },
        { role: "user", content },
      ]);
      const story = parseStory(answer, outline, toId);
      if (!story) throw new ReadError("unreadable");
      const reply = (answer as { reply?: unknown }).reply;
      return { story, reply: typeof reply === "string" ? reply.trim().slice(0, 600) : "" };
    },
  };
}

/** A stand-in without a key (DISTIL_READER=fake): the outline's own words, plainly arranged. */
export const fakeStoryteller: Storyteller = {
  async tell(outline, notes, { request = "", current = null } = {}) {
    const themes = outline.themes.filter((t) => t.title.trim());
    if (request && current) {
      return { story: { ...current, soWhat: `${current.soWhat} (${request})` }, reply: "Rettet." };
    }
    return {
      story: {
        headline: `${themes[0]?.title ?? "Workshoppen"} fylder mest, og det skal handles på nu`,
        tagline: "Det vi fandt, og det vi gør nu",
        soWhat: outline.actions[0]?.what ?? "Aftal næste skridt på næste møde.",
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
        hidden: [],
      },
      reply: "",
    };
  },
};

export function getStoryteller(env: NodeJS.ProcessEnv = process.env): Storyteller {
  if (env.DISTIL_READER === "fake") return fakeStoryteller;
  const options = mistralFromEnv(env);
  if (!options) return { tell: () => Promise.reject(new ReadError("notConfigured")) };
  return mistralStoryteller(options);
}
