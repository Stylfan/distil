import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { FAKE_DIAGRAM } from "@/ai/fake";
import { buildDeck, VOTED_ON_SLIDE, type DeckNote } from "@/domain/deck";
import { applyDeckEdit } from "@/domain/deck-edit";
import { DECK_WORDS } from "@/domain/deck-words";
import { notesForModel } from "@/domain/outline-reading";
import { EMPTY_OUTLINE, type Outline } from "@/domain/outline";
import { parseReading } from "@/domain/reading";
import { buildPptx } from "@/lib/pptx/build";

/**
 * Three things on top of the deck: the dots the participants voted with,
 * read and counted; a word changed on a slide going back to the outline;
 * and the same slides as a PowerPoint file with real text in it.
 */

describe("dot votes", () => {
  it("are read as a whole count from 0, never more than a note can hold", () => {
    const items = parseReading({
      items: [
        { text: "A", votes: 3 },
        { text: "B", votes: 2.6 },
        { text: "C", votes: -1 },
        { text: "D" },
        { text: "E", votes: 400 },
      ],
    });
    expect(items!.map((i) => i.votes)).toEqual([3, 3, 0, 0, 99]);
  });

  it("go to the model with the notes, so the room's priorities weigh", () => {
    const { lines } = notesForModel([
      { id: "a", text: "Makker", colour: "yellow", kind: "note", photo: 1, votes: 4 },
      { id: "b", text: "VPN", colour: "yellow", kind: "note", photo: 1, votes: 0 },
    ]);
    expect(lines).toBe("n1 [4 votes, yellow, photo 1] Makker\nn2 [yellow, photo 1] VPN");
  });

  it("give a slide of the most voted notes, most dots first, after the overview", () => {
    const notes: DeckNote[] = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      text: `Seddel ${i}`,
      colour: "yellow",
      photo: 1,
      votes: i % 3,
    }));
    const slides = buildDeck({
      title: "W",
      date: "d",
      outline: EMPTY_OUTLINE,
      notes,
      includeTranscript: false,
    });
    expect(slides.map((s) => s.kind)).toEqual(["title", "overview", "votes"]);
    const votes = slides[2] as Extract<(typeof slides)[number], { kind: "votes" }>;
    expect(votes.notes).toHaveLength(VOTED_ON_SLIDE);
    expect(votes.notes.map((n) => n.votes)).toEqual([2, 2, 2, 2, 1, 1, 1, 1]);
    expect(votes.total).toBe(12);
  });

  it("give no votes slide when nobody voted", () => {
    const slides = buildDeck({
      title: "W",
      date: "d",
      outline: EMPTY_OUTLINE,
      notes: [{ id: "n", text: "x", colour: "none", photo: 1, votes: 0 }],
      includeTranscript: false,
    });
    expect(slides.some((s) => s.kind === "votes")).toBe(false);
  });
});

describe("editing on a slide", () => {
  const outline: Outline = {
    ...EMPTY_OUTLINE,
    summary: "Før",
    themes: [{ id: "t1", title: "Tema", summary: "", points: ["a", "b", "c"], noteIds: [] }],
    patterns: [{ id: "p1", text: "Mønster" }],
    recommendations: [{ id: "r1", text: "Gør det", kept: true }],
    actions: [{ id: "a1", what: "Makker", who: "", when: "", noteIds: [] }],
    openPoints: [{ id: "o1", text: "Hvem?", noteIds: [] }],
  };

  it("changes the outline in the place the words came from", () => {
    let o = applyDeckEdit(outline, { kind: "summary" }, " Efter ");
    o = applyDeckEdit(o, { kind: "themeTitle", themeId: "t1" }, "Nyt  navn");
    o = applyDeckEdit(o, { kind: "point", themeId: "t1", index: 1 }, "B");
    o = applyDeckEdit(o, { kind: "item", list: "recommendations", id: "r1" }, "Gør det nu");
    o = applyDeckEdit(o, { kind: "action", id: "a1", field: "who" }, "Anna");
    expect(o.summary).toBe("Efter");
    expect(o.themes[0]).toMatchObject({ title: "Nyt navn", points: ["a", "B", "c"] });
    expect(o.recommendations[0]).toEqual({ id: "r1", text: "Gør det nu", kept: true });
    expect(o.actions[0]!.who).toBe("Anna");
  });

  it("removes a point, an item or an agreement emptied, but never a theme's name", () => {
    let o = applyDeckEdit(outline, { kind: "point", themeId: "t1", index: 0 }, "  ");
    o = applyDeckEdit(o, { kind: "item", list: "openPoints", id: "o1" }, "");
    o = applyDeckEdit(o, { kind: "action", id: "a1", field: "what" }, "");
    o = applyDeckEdit(o, { kind: "themeTitle", themeId: "t1" }, "");
    expect(o.themes[0]).toMatchObject({ title: "Tema", points: ["b", "c"] });
    expect(o.openPoints).toEqual([]);
    expect(o.actions).toEqual([]);
    expect(o.patterns).toEqual(outline.patterns);
  });
});

/** The text of every file in a ZIP, read from its central directory. */
function unzip(buffer: Buffer): Map<string, string> {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extra = buffer.readUInt16LE(at + 30);
    const comment = buffer.readUInt16LE(at + 32);
    const local = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + size);
    files.set(name, (method === 8 ? inflateRawSync(raw) : raw).toString("utf8"));
    at += 46 + nameLength + extra + comment;
  }
  return files;
}

describe("the PowerPoint file", () => {
  it("has one slide per slide of the deck, with the words as text, not pictures", async () => {
    const outline: Outline = {
      ...EMPTY_OUTLINE,
      summary: "Vi talte om onboarding.",
      themes: [
        { id: "t1", title: "Onboarding", summary: "", points: ["Dag 1 er tung"], noteIds: ["n1"] },
      ],
      actions: [{ id: "a1", what: "Makkerordning", who: "Anna", when: "", noteIds: [] }],
    };
    const slides = buildDeck({
      title: "Kundeworkshop",
      date: "12. november 2026",
      outline,
      notes: [{ id: "n1", text: "Mangler makker", colour: "yellow", photo: 1, votes: 3 }],
      includeTranscript: true,
      diagrams: [{ photo: 1, diagram: FAKE_DIAGRAM, width: 1600, height: 1000 }],
    });
    const file = await buildPptx({ slides, words: DECK_WORDS.da, title: "Kundeworkshop" });
    expect(file.subarray(0, 2).toString()).toBe("PK");
    const files = unzip(file);
    const slideFiles = [...files.keys()].filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slideFiles).toHaveLength(slides.length);
    const text = slideFiles.map((n) => files.get(n)).join("");
    for (const word of [
      "Kundeworkshop",
      "Onboarding",
      "Dag 1 er tung",
      "Makkerordning",
      "Anna",
      "Sælger",
      "Mangler makker",
    ]) {
      expect(text, word).toContain(word);
    }
    // pptxgenjs always writes an empty media folder; no picture may be in it.
    expect([...files.keys()].filter((n) => n.startsWith("ppt/media/") && !n.endsWith("/"))).toEqual(
      [],
    );
  });
});
