import { z } from "zod";
import { NOTE_COLOURS, NOTE_KINDS, type NoteColour, type NoteKind } from "@/db/schema";

/**
 * What a reading of one photo is, whoever did the reading: a list of the
 * things on it, word for word. The model's answer is untrusted input. It is
 * parsed leniently (a model may say "Yellow" or put x at 0.4), then
 * clamped to what the database holds; anything that does not fit is
 * dropped rather than guessed at.
 */

export const MAX_ITEMS_PER_PHOTO = 300;
export const MAX_TEXT_LENGTH = 600;
const MAX_ALTERNATIVES = 3;

export type ReadItem = {
  kind: NoteKind;
  text: string;
  colour: NoteColour;
  /** Thousandths of the photo's width and height, 0–1000. */
  x: number;
  y: number;
  unsure: boolean;
  alternatives: string[];
};

const loose = z.object({
  kind: z.string().optional(),
  text: z.string(),
  colour: z.string().optional(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  unsure: z.boolean().optional(),
  alternatives: z.array(z.string()).optional(),
});

const answer = z.object({ items: z.array(z.unknown()) });

const COLOUR_WORDS: Record<string, NoteColour> = {
  gul: "yellow",
  orange: "orange",
  lyserød: "pink",
  pink: "pink",
  magenta: "pink",
  rød: "red",
  grøn: "green",
  lime: "green",
  blå: "blue",
  cyan: "blue",
  turquoise: "blue",
  lilla: "purple",
  violet: "purple",
  hvid: "white",
  grey: "white",
  gray: "white",
};

export function toColour(value: string | undefined): NoteColour {
  const word = (value ?? "").trim().toLowerCase();
  if ((NOTE_COLOURS as readonly string[]).includes(word)) return word as NoteColour;
  return COLOUR_WORDS[word] ?? "none";
}

function toKind(value: string | undefined): NoteKind {
  const word = (value ?? "").trim().toLowerCase();
  return (NOTE_KINDS as readonly string[]).includes(word) ? (word as NoteKind) : "note";
}

/** A position as thousandths: accepts 0–1 or 0–1000 from the model. */
function toPermille(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 500;
  const scaled = value <= 1 ? value * 1000 : value;
  return Math.round(Math.min(1000, Math.max(0, scaled)));
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

/** The items of a model's answer, or null when the answer is not one at all. */
export function parseReading(raw: unknown): ReadItem[] | null {
  const top = answer.safeParse(raw);
  if (!top.success) return null;
  const items: ReadItem[] = [];
  for (const entry of top.data.items) {
    const item = loose.safeParse(entry);
    if (!item.success) continue;
    const text = clean(item.data.text);
    if (!text) continue;
    items.push({
      kind: toKind(item.data.kind),
      text,
      colour: toColour(item.data.colour ?? item.data.color),
      x: toPermille(item.data.x),
      y: toPermille(item.data.y),
      unsure: item.data.unsure ?? false,
      alternatives: (item.data.alternatives ?? [])
        .map(clean)
        .filter((a) => a && a !== text)
        .slice(0, MAX_ALTERNATIVES),
    });
    if (items.length === MAX_ITEMS_PER_PHOTO) break;
  }
  return items;
}

/** Reading order: top to bottom in bands, left to right within a band. */
export function inReadingOrder(items: ReadItem[]): ReadItem[] {
  const band = (y: number) => Math.floor(y / 125);
  return [...items].sort((a, b) => band(a.y) - band(b.y) || a.x - b.x || a.y - b.y);
}
