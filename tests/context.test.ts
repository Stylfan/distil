import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { mistralOutliner } from "@/ai/outliner";
import { mistralStoryteller } from "@/ai/storyteller";
import { mistralTranscriber } from "@/ai/transcribe";
import { buildDeck } from "@/domain/deck";
import { EMPTY_CONTEXT, contextForModel, hasContext } from "@/domain/context";
import { EMPTY_OUTLINE, type Outline } from "@/domain/outline";
import type { Story } from "@/domain/story";
import { parseStory } from "@/domain/story-reading";
import { exportAccount } from "@/services/export";
import { createWorkshop, findWorkshop, setContext } from "@/services/workshops";
import { withUser } from "@/db/client";
import { appDb, freshDb } from "./db";
import { seedUser } from "./helpers";

/**
 * The facilitator's context for a workshop (why, who, for whom, the
 * agenda): what goes to the model with the outline and the story, that it
 * belongs to its owner and is exported, and the conversation on the
 * presentation that changes the story as asked.
 */

const answering = (content: object, seen: { body?: { messages: { content: unknown }[] } }) =>
  (async (_url: string, init: RequestInit) => {
    seen.body = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    );
  }) as typeof fetch;

const outline: Outline = {
  ...EMPTY_OUTLINE,
  summary: "S",
  themes: [
    { id: "t1", title: "Kunder", summary: "", points: ["a"], noteIds: [] },
    { id: "t2", title: "Værktøjer", summary: "", points: ["b"], noteIds: [] },
  ],
};

describe("the context for the model", () => {
  it("is nothing when empty, and the facilitator's own words when given", () => {
    expect(hasContext(EMPTY_CONTEXT)).toBe(false);
    expect(contextForModel(null)).toBe("");
    const text = contextForModel({
      ...EMPTY_CONTEXT,
      audience: "Direktionen",
      agenda: "09.00 Velkomst",
    });
    expect(text).toContain("Who the presentation is for: Direktionen");
    expect(text).toContain("The workshop's agenda:\n09.00 Velkomst");
    expect(text).not.toContain("Why the workshop");
  });

  it("goes before the notes when an outline is made", async () => {
    const seen: { body?: { messages: { content: unknown }[] } } = {};
    await mistralOutliner({
      key: "k",
      model: "m",
      fetch: answering({ summary: "S", themes: [] }, seen),
    }).make([{ id: "n", text: "Hej", colour: "yellow", kind: "note", photo: 1 }], [], "CONTEXT");
    expect(String(seen.body!.messages[1]!.content)).toMatch(/^CONTEXT\n\nThe notes:/);
    expect(String(seen.body!.messages[0]!.content)).toContain("The facilitator may give context");
  });
});

describe("the conversation on the presentation", () => {
  const current: Story = {
    headline: "Gammel",
    tagline: "",
    soWhat: "",
    keyMessages: [],
    themes: [],
    shifts: [],
    quoteNoteId: "real-1",
    closing: "",
  };

  it("sends the story as it is and the request, and brings back the changed story and a reply", async () => {
    const seen: { body?: { messages: { content: unknown }[] } } = {};
    const teller = mistralStoryteller({
      key: "k",
      model: "m",
      fetch: answering(
        { headline: "Ny", hidden: ["t2", "nope"], quote: "n1", reply: "Tema 2 er taget ud." },
        seen,
      ),
    });
    const told = await teller.tell(
      outline,
      [{ id: "real-1", text: "Citat", colour: "yellow", kind: "note", photo: 1 }],
      {
        context: "CONTEXT",
        request: "Fjern værktøjer",
        current,
      },
    );
    const sent = String(seen.body!.messages[1]!.content);
    expect(sent).toContain("CONTEXT");
    expect(sent).toContain('"quote":"n1"');
    expect(sent).toContain("The facilitator's request for the presentation");
    expect(told).toMatchObject({
      reply: "Tema 2 er taget ud.",
      story: { headline: "Ny", hidden: ["t2"], quoteNoteId: "real-1" },
    });
  });

  it("leaves hidden themes out of the deck, but not out of the outline", () => {
    const slides = buildDeck({
      title: "W",
      date: "d",
      outline: { ...outline, story: { ...current, hidden: ["t2"] } },
      notes: [],
      includeTranscript: false,
    });
    expect(
      slides.filter((s) => s.kind === "theme").map((s) => s.kind === "theme" && s.title),
    ).toEqual(["Kunder"]);
    expect(parseStory({ headline: "H", hidden: "t1" }, outline, new Map())!.hidden).toEqual([]);
  });
});

describe("a photo of the agenda", () => {
  it("comes back as text, and an answer without text is refused", async () => {
    const seen: { body?: { messages: { content: unknown }[] } } = {};
    const text = await mistralTranscriber({
      key: "k",
      model: "m",
      fetch: answering({ text: " 09.00 Velkomst \n" }, seen),
    }).transcribe(Buffer.from([1, 2, 3]), "image/jpeg");
    expect(text).toBe("09.00 Velkomst");
    expect(String(seen.body!.messages[0]!.content)).toContain("Never invent text");
    await expect(
      mistralTranscriber({ key: "k", model: "m", fetch: answering({ nope: 1 }, {}) }).transcribe(
        Buffer.from([1]),
        "image/jpeg",
      ),
    ).rejects.toThrow();
  });
});

describe("the stored context", () => {
  let db: Db;
  let alice: string;
  let workshopId: string;

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
    workshopId = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
  });

  it("is kept with the workshop, exported, and only its owner may set it", async () => {
    const context = { ...EMPTY_CONTEXT, purpose: "Retning for næste år", audience: "Direktionen" };
    await setContext(db, alice, workshopId, context);
    expect((await findWorkshop(db, alice, workshopId))!.context).toEqual(context);
    const exported = await withUser(alice, (tx) => exportAccount(tx, alice), appDb());
    expect(JSON.stringify(exported.workshops)).toContain("Retning for næste år");
    const bob = await seedUser(db, "bob@example.com");
    await expect(setContext(db, bob, workshopId, context)).rejects.toThrow("notFound");
    await expect(
      setContext(db, alice, workshopId, { ...context, purpose: "x".repeat(2000) }),
    ).rejects.toThrow();
  });
});
