import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { FAKE_ITEMS } from "@/ai/fake";
import { fakeOutliner } from "@/ai/outliner";
import { mistralStoryteller } from "@/ai/storyteller";
import { buildDeck, makeDeck, type DeckNote } from "@/domain/deck";
import { applyDeckEdit } from "@/domain/deck-edit";
import { storyFromOutline } from "@/domain/deck-story";
import { EMPTY_OUTLINE, type Outline } from "@/domain/outline";
import { guessIcon, type Story } from "@/domain/story";
import { parseStory } from "@/domain/story-reading";
import {
  getOutline,
  notesOfWorkshop,
  saveOutline,
  setLook,
  storeGenerated,
  storeStory,
} from "@/services/outlines";
import { addPhoto, finishReading } from "@/services/photos";
import { createWorkshop } from "@/services/workshops";
import { freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * The story of the presentation: what the model may give back (untrusted,
 * checked), how the deck tells it, how a word changed on a slide goes back
 * into it, and that it is kept, or dropped, with the outline it was told for.
 */

const outline: Outline = {
  ...EMPTY_OUTLINE,
  summary: "Rollerne er uklare. Mødet virker.",
  themes: [
    {
      id: "t1",
      title: "Roller og ansvar",
      summary: "PO og PM overlapper.",
      points: ["a"],
      noteIds: ["n1", "n2"],
    },
    { id: "t2", title: "Møder", summary: "", points: ["b"], noteIds: ["n3"] },
    { id: "t3", title: "Værktøjer", summary: "", points: [], noteIds: [] },
  ],
  patterns: [{ id: "p1", text: "Det samme overalt" }],
};

const notes: DeckNote[] = [
  { id: "n1", text: "Hvem bestemmer?", colour: "yellow", photo: 1, votes: 1 },
  { id: "n2", text: "PO ≠ PM", colour: "pink", photo: 1, votes: 5 },
  { id: "n3", text: "Demo virker", colour: "green", photo: 2 },
];

const told: Story = {
  headline: "Uklare roller bremser beslutningerne",
  tagline: "Det vi fandt",
  soWhat: "Afklar rollerne før næste kvartal.",
  keyMessages: [{ icon: "users", title: "Roller", text: "Uklart." }],
  themes: [
    {
      themeId: "t1",
      headline: "PO og PM overlapper",
      icon: "user-check",
      soWhat: "Lav en rollebeskrivelse.",
    },
  ],
  shifts: [{ from: "Hver for sig", to: "Sammen" }],
  quoteNoteId: "n2",
  closing: "Tak",
};

describe("the story from the model", () => {
  const toId = new Map([["n7", "real-7"]]);

  it("keeps only real themes and notes, and replaces unknown icons", () => {
    const story = parseStory(
      {
        headline: "  En   linje ",
        keyMessages: [{ icon: "unicorn", title: "Roller", text: "x" }, { title: "" }],
        themes: [
          { themeId: "t1", headline: "H", icon: "layers", soWhat: "S" },
          { themeId: "t1", headline: "twice" },
          { themeId: "nope", headline: "gone" },
        ],
        shifts: [{ from: "a", to: "b" }, { from: "only" }],
        quote: "n7",
      },
      outline,
      toId,
    );
    expect(story).toMatchObject({
      headline: "En linje",
      keyMessages: [{ icon: guessIcon("Roller x", 0), title: "Roller" }],
      themes: [{ themeId: "t1", headline: "H", icon: "layers" }],
      shifts: [{ from: "a", to: "b" }],
      quoteNoteId: "real-7",
    });
  });

  it("is nothing without a headline, and a quote must be one of the notes", () => {
    expect(parseStory({ keyMessages: [] }, outline, toId)).toBeNull();
    expect(parseStory("no", outline, toId)).toBeNull();
    expect(parseStory({ headline: "H", quote: "n99" }, outline, toId)!.quoteNoteId).toBeNull();
  });

  it("is asked for with the outline and the notes as lines, most dots first", async () => {
    let body: { messages: { content: string }[] } | undefined;
    const teller = mistralStoryteller({
      key: "k",
      model: "m",
      fetch: (async (_url: string, init: RequestInit) => {
        body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ headline: "H", quote: "n1" }) } }],
          }),
        );
      }) as typeof fetch,
    });
    const { story } = await teller.tell(
      outline,
      notes.map((n) => ({ ...n, kind: "note" })),
    );
    expect(body!.messages[0]!.content).toContain("action title");
    expect(body!.messages[1]!.content).toContain("id t1: Roller og ansvar");
    expect(body!.messages[1]!.content).toContain("n1 [5 votes, pink, photo 1] PO ≠ PM");
    expect(story.quoteNoteId).toBe("n2");
  });
});

describe("the deck with a story", () => {
  const deck = (o: Outline) =>
    buildDeck({ title: "W", date: "d", outline: o, notes, includeTranscript: false });

  it("puts the headlines, the quote, the shifts and a map of three themes on the slides", () => {
    const slides = deck({ ...outline, story: told });
    const kinds = slides.map((s) => s.kind);
    expect(slides[0]).toMatchObject({ kind: "cover", tagline: "Det vi fandt" });
    expect(slides[1]).toMatchObject({
      kind: "summary",
      headline: told.headline,
      soWhat: told.soWhat,
    });
    expect(kinds).toContain("themeMap");
    const first = slides.find((s) => s.kind === "theme");
    expect(first).toMatchObject({
      headline: "PO og PM overlapper",
      icon: "user-check",
      soWhat: "Lav en rollebeskrivelse.",
    });
    if (first?.kind !== "theme") throw new Error();
    expect(first.notes.map((n) => n.id)).toEqual(["n2", "n1"]); // most dots first
    expect(slides.find((s) => s.kind === "quote")).toMatchObject({ note: { id: "n2" } });
    expect(kinds.indexOf("shifts")).toBeGreaterThan(kinds.indexOf("list"));
    expect(slides.at(-1)).toMatchObject({ kind: "closing", line: "Tak" });
  });

  it("wears the outline's colour theme, kobolt by default", () => {
    const base = { title: "W", date: "d", notes, includeTranscript: false };
    expect(makeDeck({ ...base, outline }).look).toBe("kobolt");
    expect(makeDeck({ ...base, outline: { ...outline, look: "skov" } }).look).toBe("skov");
  });
});

describe("a word changed on a slide", () => {
  it("starts the story from the one told by rule, and keeps the rest", () => {
    const o = applyDeckEdit(outline, { kind: "story", field: "soWhat" }, " Gør det ");
    expect(o.story).toEqual({ ...storyFromOutline(outline), soWhat: "Gør det" });
    const t = applyDeckEdit(
      o,
      { kind: "themeStory", themeId: "t2", field: "headline" },
      "Møderne virker",
    );
    expect(t.story!.themes).toEqual([
      { themeId: "t2", headline: "Møderne virker", icon: guessIcon("Møder", 1), soWhat: "" },
    ]);
  });

  it("removes a key message or a shift when emptied, and never empties the headline", () => {
    let o: Outline = { ...outline, story: told };
    o = applyDeckEdit(o, { kind: "keyMessage", index: 0, field: "title" }, "");
    o = applyDeckEdit(o, { kind: "shift", index: 0, field: "to" }, " ");
    o = applyDeckEdit(o, { kind: "story", field: "headline" }, "");
    expect(o.story).toMatchObject({ keyMessages: [], shifts: [], headline: told.headline });
  });
});

describe("the stored story", () => {
  let db: Db;
  let alice: string;
  let workshopId: string;

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
    workshopId = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
    const photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
    await finishReading(db, alice, photoId, FAKE_ITEMS);
    await storeGenerated(
      db,
      alice,
      workshopId,
      await fakeOutliner.make(await notesOfWorkshop(db, alice, workshopId), []),
    );
  });

  it("is kept through the facilitator's edits, and dropped when Distil remakes the outline", async () => {
    const row = await getOutline(db, alice, workshopId);
    const story = { ...told, themes: [], quoteNoteId: null };
    await storeStory(db, alice, workshopId, story);
    await setLook(db, alice, workshopId, "petrol");
    const stored = await getOutline(db, alice, workshopId);
    expect(stored!.version).toBe(row!.version + 1);
    expect(stored!.content).toMatchObject({ story, look: "petrol" });

    // An editor that does not send the story leaves it as it was.
    const plain = { ...stored!.content, story: undefined, look: undefined };
    await saveOutline(db, alice, workshopId, { ...plain, summary: "Ny" }, stored!.version);
    expect((await getOutline(db, alice, workshopId))!.content).toMatchObject({
      story,
      look: "petrol",
      summary: "Ny",
    });

    await storeGenerated(db, alice, workshopId, { ...plain, summary: "Igen" });
    const remade = await getOutline(db, alice, workshopId);
    expect(remade!.content.story).toBeNull();
    expect(remade!.content.look).toBe("petrol");
  });

  it("belongs to its owner only", async () => {
    const bob = await seedUser(db, "bob@example.com");
    await expect(storeStory(db, bob, workshopId, told)).rejects.toThrow("notFound");
    await expect(setLook(db, bob, workshopId, "sand")).rejects.toThrow("notFound");
  });
});
