import type { NoteColour } from "@/db/schema";
import type { Outline } from "./outline";

/**
 * The presentation, as slides, built from the outline and nothing else: a
 * pure function, so the deck is exactly what the facilitator approved.
 * The overview comes first and can travel alone; the themes follow, laid
 * out like the wall; then what Distil saw across them, what is
 * recommended (only what the facilitator kept), what was agreed and what
 * is open; and, when asked for, every note word for word.
 *
 * Long lists are split over several slides rather than shrunk, so every
 * slide stays readable from the back of a room.
 */

export type DeckNote = { id: string; text: string; colour: NoteColour; photo: number };

export type Slide =
  | { kind: "title"; title: string; date: string }
  | {
      kind: "overview";
      summary: string;
      found: string[];
      recommend: string[];
      agreed: string[];
      open: string[];
    }
  | {
      kind: "theme";
      number: number;
      title: string;
      summary: string;
      points: string[];
      notes: DeckNote[];
      moreNotes: number;
      continued: boolean;
    }
  | {
      kind: "list";
      heading: "patterns" | "recommendations" | "open";
      items: string[];
      continued: boolean;
    }
  | { kind: "actions"; rows: { what: string; who: string; when: string }[]; continued: boolean }
  | { kind: "transcript"; groups: { photo: number; notes: DeckNote[] }[]; continued: boolean };

export const POINTS_PER_SLIDE = 7;
export const NOTES_ON_THEME = 12;
export const ITEMS_PER_SLIDE = 7;
export const ACTIONS_PER_SLIDE = 8;
export const NOTES_PER_TRANSCRIPT = 36;
const OVERVIEW_ITEMS = 5;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const filled = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

export function buildDeck(input: {
  title: string;
  date: string;
  outline: Outline;
  notes: DeckNote[];
  includeTranscript: boolean;
}): Slide[] {
  const { outline } = input;
  const byId = new Map(input.notes.map((n) => [n.id, n]));
  const kept = filled(outline.recommendations.filter((r) => r.kept).map((r) => r.text));
  const actions = outline.actions
    .map((a) => ({ what: a.what.trim(), who: a.who.trim(), when: a.when.trim() }))
    .filter((a) => a.what);
  const open = filled(outline.openPoints.map((o) => o.text));
  const themes = outline.themes.filter((t) => t.title.trim());

  const slides: Slide[] = [{ kind: "title", title: input.title, date: input.date }];

  slides.push({
    kind: "overview",
    summary: outline.summary.trim(),
    found: themes.map((t) => t.title.trim()).slice(0, OVERVIEW_ITEMS),
    recommend: kept.slice(0, OVERVIEW_ITEMS),
    agreed: actions.map((a) => a.what).slice(0, OVERVIEW_ITEMS),
    open: open.slice(0, Math.max(0, OVERVIEW_ITEMS - Math.min(actions.length, OVERVIEW_ITEMS))),
  });

  themes.forEach((theme, i) => {
    const notes = theme.noteIds.map((id) => byId.get(id)).filter((n): n is DeckNote => !!n);
    const parts = chunks(filled(theme.points), POINTS_PER_SLIDE);
    (parts.length ? parts : [[]]).forEach((points, part) =>
      slides.push({
        kind: "theme",
        number: i + 1,
        title: theme.title.trim(),
        summary: part === 0 ? theme.summary.trim() : "",
        points,
        notes: part === 0 ? notes.slice(0, NOTES_ON_THEME) : [],
        moreNotes: part === 0 ? Math.max(0, notes.length - NOTES_ON_THEME) : 0,
        continued: part > 0,
      }),
    );
  });

  const lists: [Extract<Slide, { kind: "list" }>["heading"], string[]][] = [
    ["patterns", filled(outline.patterns.map((p) => p.text))],
    ["recommendations", kept],
  ];
  for (const [heading, items] of lists) {
    chunks(items, ITEMS_PER_SLIDE).forEach((part, j) =>
      slides.push({ kind: "list", heading, items: part, continued: j > 0 }),
    );
  }
  chunks(actions, ACTIONS_PER_SLIDE).forEach((rows, j) =>
    slides.push({ kind: "actions", rows, continued: j > 0 }),
  );
  chunks(open, ITEMS_PER_SLIDE).forEach((items, j) =>
    slides.push({ kind: "list", heading: "open", items, continued: j > 0 }),
  );

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
  return slides;
}
