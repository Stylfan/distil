import type { NoteColour } from "@/db/schema";
import type { Diagram } from "./diagram";
import type { Outline } from "./outline";
import { storyOf, themeTelling } from "./deck-story";
import { DEFAULT_LOOK, type Icon, type Look } from "./story";

/**
 * The presentation, as slides, built from the outline and nothing else: a
 * pure function, so the deck is exactly what the facilitator approved.
 *
 * It is told the way a consultancy tells it: a cover, one slide with the
 * whole message (a headline that says something, three key messages, the
 * "so what"), then three chapters with a breaker each — what we found
 * (a map of the themes, a slide per theme with its notes from the wall, a
 * quote, the drawings), what it means (patterns, the shifts, Distil's
 * recommendations, marked), and what we do (agreed, open) — a closing
 * slide, and the transcript when asked for.
 *
 * Long lists are split over several slides rather than shrunk, so every
 * slide stays readable from the back of a room.
 */

export type DeckNote = {
  id: string;
  text: string;
  colour: NoteColour;
  photo: number;
  /** Dots from the participants' vote; 0 when they did not vote on it. */
  votes?: number;
};

export type Chapter = "found" | "means" | "do";

export type Slide =
  | { kind: "cover"; title: string; date: string; tagline: string }
  | {
      kind: "summary";
      headline: string;
      summary: string;
      cards: { index: number; icon: Icon; title: string; text: string }[];
      soWhat: string;
    }
  | { kind: "section"; number: number; chapter: Chapter; facts: Facts }
  | {
      kind: "themeMap";
      notes: number;
      themes: { id: string; title: string; icon: Icon; notes: number }[];
    }
  | {
      kind: "theme";
      /** The theme in the outline, so a word changed on the slide goes back to it. */
      themeId: string;
      number: number;
      title: string;
      /** The theme's sharp line from the story; empty when it has none yet. */
      headline: string;
      icon: Icon;
      summary: string;
      /** Each point with its place among the theme's points in the outline. */
      points: { index: number; text: string }[];
      notes: DeckNote[];
      moreNotes: number;
      soWhat: string;
      continued: boolean;
    }
  | {
      kind: "quote";
      note: DeckNote;
      /** Other notes that could stand here, most dots first, for swapping on the slide. */
      options: DeckNote[];
    }
  | {
      kind: "list";
      heading: "patterns" | "recommendations" | "open";
      items: { id: string; text: string }[];
      /** How many there are in all, over every slide of the list. */
      total: number;
      continued: boolean;
    }
  | { kind: "shifts"; rows: { index: number; from: string; to: string }[] }
  | {
      kind: "actions";
      rows: { id: string; what: string; who: string; when: string }[];
      total: number;
      continued: boolean;
    }
  | { kind: "votes"; notes: DeckNote[]; total: number }
  | { kind: "transcript"; groups: { photo: number; notes: DeckNote[] }[]; continued: boolean }
  | {
      kind: "diagram";
      title: string;
      photo: number;
      diagram: Diagram;
      width: number;
      height: number;
    }
  | { kind: "closing"; title: string; date: string; line: string };

/** What a chapter breaker counts; "of" is the whole workshop when themes are left out. */
export type Facts = {
  notes: number;
  themes: number;
  photos: number;
  items: number;
  of?: { notes: number; themes: number };
};

export type Deck = { look: Look; slides: Slide[] };

export const POINTS_PER_SLIDE = 6;
export const NOTES_ON_THEME = 6;
export const ITEMS_PER_SLIDE = 6;
export const ACTIONS_PER_SLIDE = 6;
export const NOTES_PER_TRANSCRIPT = 36;
export const VOTED_ON_SLIDE = 8;
/** Up to this many themes are drawn as a map around the workshop; more as a grid. */
export const MAP_THEMES = 8;
/** How many other notes the quote can be swapped for on the slide. */
export const QUOTE_OPTIONS = 12;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const filledItems = (items: { id: string; text: string }[]) =>
  items.map((i) => ({ id: i.id, text: i.text.trim() })).filter((i) => i.text);

export function buildDeck(input: {
  title: string;
  date: string;
  outline: Outline;
  notes: DeckNote[];
  includeTranscript: boolean;
  /** The drawings chosen for the presentation, in photo order. */
  diagrams?: { photo: number; diagram: Diagram; width: number; height: number }[];
}): Slide[] {
  return makeDeck(input).slides;
}

export function makeDeck(input: Parameters<typeof buildDeck>[0]): Deck {
  const { outline } = input;
  const story = storyOf(outline);
  const byId = new Map(input.notes.map((n) => [n.id, n]));
  const kept = filledItems(outline.recommendations.filter((r) => r.kept));
  const actions = outline.actions
    .map((a) => ({ id: a.id, what: a.what.trim(), who: a.who.trim(), when: a.when.trim() }))
    .filter((a) => a.what);
  const open = filledItems(outline.openPoints);
  const patterns = filledItems(outline.patterns);
  const shifts = story.shifts
    .map((s, index) => ({ index, from: s.from.trim(), to: s.to.trim() }))
    .filter((s) => s.from && s.to);
  const hidden = new Set(story.hidden ?? []);
  const themes = outline.themes.filter((t) => t.title.trim() && !hidden.has(t.id));
  const photos = new Set(input.notes.map((n) => n.photo)).size;
  const allThemes = outline.themes.filter((t) => t.title.trim());
  // The notes the presentation is about: all of them, or those of the themes that are in it.
  const shownNotes =
    hidden.size === 0
      ? input.notes.length
      : new Set(themes.flatMap((t) => t.noteIds).filter((id) => byId.has(id))).size;
  const of =
    themes.length < allThemes.length
      ? { notes: input.notes.length, themes: allThemes.length }
      : undefined;

  const slides: Slide[] = [
    { kind: "cover", title: input.title, date: input.date, tagline: story.tagline.trim() },
    {
      kind: "summary",
      headline: story.headline.trim() || input.title,
      summary: outline.summary.trim(),
      cards: story.keyMessages
        .map((m, index) => ({ index, icon: m.icon, title: m.title.trim(), text: m.text.trim() }))
        .filter((m) => m.title),
      soWhat: story.soWhat.trim(),
    },
  ];

  // What the room voted for, most dots first, right after the message: it is their priority.
  const voted = input.notes
    .filter((n) => (n.votes ?? 0) > 0)
    .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  if (voted.length > 0) {
    slides.push({
      kind: "votes",
      notes: voted.slice(0, VOTED_ON_SLIDE),
      total: voted.reduce((sum, n) => sum + (n.votes ?? 0), 0),
    });
  }

  // The chapters, each opened by a breaker when the deck has more than one of them.
  const means = patterns.length + shifts.length + kept.length;
  const todo = actions.length + open.length;
  const chapters = [themes.length > 0, means > 0, todo > 0].filter(Boolean).length;
  let chapter = 0;
  const breaker = (kind: Chapter, items: number) => {
    if (chapters < 2) return;
    chapter += 1;
    slides.push({
      kind: "section",
      number: chapter,
      chapter: kind,
      facts: { notes: shownNotes, themes: themes.length, photos, items, of },
    });
  };

  if (themes.length > 0) {
    breaker("found", themes.length);
    if (themes.length >= 3) {
      slides.push({
        kind: "themeMap",
        notes: shownNotes,
        themes: themes.map((t, i) => ({
          id: t.id,
          title: t.title.trim(),
          icon: themeTelling(story, t, i).icon,
          notes: t.noteIds.length,
        })),
      });
    }
    themes.forEach((theme, i) => {
      const told = themeTelling(story, theme, i);
      const notes = theme.noteIds.map((id) => byId.get(id)).filter((n): n is DeckNote => !!n);
      // The notes with the most dots first, so the wall's priority shows on the slide.
      notes.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
      const points = theme.points
        .map((text, index) => ({ index, text: text.trim() }))
        .filter((p) => p.text);
      const parts = chunks(points, POINTS_PER_SLIDE);
      (parts.length ? parts : [[]]).forEach((points, part) =>
        slides.push({
          kind: "theme",
          themeId: theme.id,
          number: i + 1,
          title: theme.title.trim(),
          headline: told.headline,
          icon: told.icon,
          summary: part === 0 ? theme.summary.trim() : "",
          points,
          notes: part === 0 ? notes.slice(0, NOTES_ON_THEME) : [],
          moreNotes: part === 0 ? Math.max(0, notes.length - NOTES_ON_THEME) : 0,
          soWhat: part === parts.length - 1 || parts.length === 0 ? told.soWhat : "",
          continued: part > 0,
        }),
      );
    });
    const quoted = story.quoteNoteId ? byId.get(story.quoteNoteId) : undefined;
    if (quoted) {
      const options = input.notes
        .filter((n) => n.id !== quoted.id && n.text.trim().split(/\s+/).length >= 3)
        .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0) || b.text.length - a.text.length)
        .slice(0, QUOTE_OPTIONS);
      slides.push({ kind: "quote", note: quoted, options });
    }
    // The drawings come after the themes: they are the participants' own pictures of the work.
    for (const d of input.diagrams ?? []) {
      slides.push({ kind: "diagram", title: d.diagram.title.trim(), ...d });
    }
  }

  if (means > 0) {
    breaker("means", means);
    chunks(patterns, ITEMS_PER_SLIDE).forEach((items, j) =>
      slides.push({
        kind: "list",
        heading: "patterns",
        items,
        total: patterns.length,
        continued: j > 0,
      }),
    );
    if (shifts.length > 0) slides.push({ kind: "shifts", rows: shifts });
    chunks(kept, ITEMS_PER_SLIDE).forEach((items, j) =>
      slides.push({
        kind: "list",
        heading: "recommendations",
        items,
        total: kept.length,
        continued: j > 0,
      }),
    );
  }

  if (todo > 0) {
    breaker("do", todo);
    chunks(actions, ACTIONS_PER_SLIDE).forEach((rows, j) =>
      slides.push({ kind: "actions", rows, total: actions.length, continued: j > 0 }),
    );
    chunks(open, ITEMS_PER_SLIDE).forEach((items, j) =>
      slides.push({ kind: "list", heading: "open", items, total: open.length, continued: j > 0 }),
    );
  }

  slides.push({
    kind: "closing",
    title: input.title,
    date: input.date,
    line: story.closing.trim(),
  });

  if (input.includeTranscript && input.notes.length > 0) {
    chunks(input.notes, NOTES_PER_TRANSCRIPT).forEach((part, j) => {
      const groups: { photo: number; notes: DeckNote[] }[] = [];
      for (const n of part) {
        const last = groups.at(-1);
        if (last?.photo === n.photo) last.notes.push(n);
        else groups.push({ photo: n.photo, notes: [n] });
      }
      slides.push({ kind: "transcript", groups, continued: j > 0 });
    });
  }
  return { look: outline.look ?? DEFAULT_LOOK, slides };
}
