import { describe, expect, it } from "vitest";
import { buildDeck, type DeckNote } from "@/domain/deck";
import { applyDeckEdit } from "@/domain/deck-edit";
import { DECK_WORDS } from "@/domain/deck-words";
import { EMPTY_OUTLINE, type Outline } from "@/domain/outline";
import { outlineForModel, parseOutline, withoutRefs } from "@/domain/outline-reading";
import type { Story } from "@/domain/story";

/**
 * What the review against the guide changed: questions without codes and
 * with their notes, exact numbers when themes are left out, small headings
 * that count instead of repeating, and a quote that can be swapped.
 */

const notes: DeckNote[] = [
  { id: "a", text: "Hvem bestemmer her egentlig?", colour: "yellow", photo: 1, votes: 2 },
  { id: "b", text: "PO PM", colour: "pink", photo: 1 },
  { id: "c", text: "Vi mangler en fælles plan", colour: "green", photo: 2 },
];
const story: Story = {
  headline: "H",
  tagline: "",
  soWhat: "",
  keyMessages: [],
  themes: [],
  shifts: [],
  quoteNoteId: "a",
  closing: "",
  hidden: ["t2"],
};
const outline: Outline = {
  ...EMPTY_OUTLINE,
  themes: [
    { id: "t1", title: "Roller", summary: "", points: ["p"], noteIds: ["a", "b"] },
    { id: "t2", title: "Plan", summary: "", points: ["q"], noteIds: ["c"] },
  ],
  patterns: [{ id: "p1", text: "Mønster" }],
  openPoints: [{ id: "o1", text: "Hvem?", noteIds: [] }],
  story,
};

describe("Distil's questions", () => {
  it("never carry note codes in their text, and keep the notes they are about", () => {
    expect(withoutRefs("Hvad betyder 'VLY', 'RSP' og 'LPA' (n38, n39, n40)?")).toBe(
      "Hvad betyder 'VLY', 'RSP' og 'LPA'?",
    );
    expect(withoutRefs("Hvor (fx Azure) bruges det?")).toBe("Hvor (fx Azure) bruges det?");
    const toId = new Map([["n7", "real-7"]]);
    const parsed = parseOutline(
      {
        summary: "S",
        themes: [],
        questions: [{ text: "Hvad betyder X (n7)?", notes: ["n7", "n99"] }],
      },
      toId,
    )!;
    expect(parsed.questions[0]).toMatchObject({ text: "Hvad betyder X?", noteIds: ["real-7"] });
    const sent = outlineForModel(parsed, toId) as { questions: { notes: string[] }[] };
    expect(sent.questions[0]!.notes).toEqual(["n7"]);
  });
});

describe("the deck after the review", () => {
  const slides = buildDeck({ title: "W", date: "d", outline, notes, includeTranscript: false });

  it("says how many of the notes and themes are in it when themes are left out", () => {
    const found = slides.find((s) => s.kind === "section" && s.chapter === "found");
    if (found?.kind !== "section") throw new Error("no breaker");
    expect(found.facts).toMatchObject({ notes: 2, themes: 1, of: { notes: 3, themes: 2 } });
    expect(DECK_WORDS.da.facts(found.facts, "found")).toBe(
      "2 af 3 sedler · 1 af 2 temaer · 2 billeder",
    );
  });

  it("counts in the small heading of a list instead of repeating the chapter", () => {
    const list = slides.find((s) => s.kind === "list" && s.heading === "open");
    if (list?.kind !== "list") throw new Error("no list");
    expect(DECK_WORDS.da.count(list.total, list.heading)).toBe("1 spørgsmål til afklaring");
    expect(DECK_WORDS.da.count(3, "actions")).toBe("3 aftaler");
  });

  it("offers other notes for the quote, and lets it be swapped or removed", () => {
    const quote = slides.find((s) => s.kind === "quote");
    if (quote?.kind !== "quote") throw new Error("no quote");
    expect(quote.options.map((n) => n.id)).toEqual(["c"]); // "PO PM" is too short to quote
    expect(applyDeckEdit(outline, { kind: "quote" }, "c").story!.quoteNoteId).toBe("c");
    expect(applyDeckEdit(outline, { kind: "quote" }, "").story!.quoteNoteId).toBeNull();
  });
});
