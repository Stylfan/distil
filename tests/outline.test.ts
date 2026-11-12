import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { FAKE_ITEMS } from "@/ai/fake";
import { fakeOutliner, mistralOutliner } from "@/ai/outliner";
import { users } from "@/db/schema";
import {
  COLOUR_QUESTION_ID,
  EMPTY_OUTLINE,
  colourQuestion,
  keepAnswers,
  type Outline,
} from "@/domain/outline";
import { notesForModel, outlineForModel, parseOutline } from "@/domain/outline-reading";
import { releaseOutline, reserveOutline } from "@/services/limits";
import {
  answerQuestion,
  getOutline,
  notesOfWorkshop,
  saveOutline,
  storeGenerated,
  undoGenerated,
} from "@/services/outlines";
import { addPhoto, finishReading } from "@/services/photos";
import { createWorkshop } from "@/services/workshops";
import { freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * The outline: what goes to the model and what comes back (untrusted,
 * mapped back to real notes, clamped), how the facilitator's answers and
 * edits survive Distil's next pass, and the limits on how often Distil may
 * be asked.
 */

const note = (id: string, text: string, colour = "yellow") => ({
  id,
  text,
  colour,
  kind: "note",
  photo: 1,
});

describe("what goes to the model", () => {
  it("is numbered lines, never a database id", () => {
    const { lines, toId } = notesForModel([
      note("uuid-a", "For mange\nsystemer"),
      note("uuid-b", "VPN", "none"),
    ]);
    expect(lines).toBe("n1 [yellow, photo 1] For mange systemer\nn2 [photo 1] VPN");
    expect(lines).not.toContain("uuid");
    expect(toId.get("n2")).toBe("uuid-b");
  });

  it("sends an outline back with references, not ids", () => {
    const { toId } = notesForModel([note("uuid-a", "x")]);
    const sent = outlineForModel(
      {
        ...EMPTY_OUTLINE,
        themes: [{ id: "t1", title: "T", summary: "", points: [], noteIds: ["uuid-a"] }],
      },
      toId,
    );
    expect(JSON.stringify(sent)).toContain('"notes":["n1"]');
    expect(JSON.stringify(sent)).not.toContain("uuid-a");
  });
});

describe("what comes back", () => {
  const { toId } = notesForModel([note("id-1", "a"), note("id-2", "b")]);

  it("becomes an outline with real note ids, dropping unknown references", () => {
    const outline = parseOutline(
      {
        summary: " Godt møde ",
        themes: [
          {
            id: "t1",
            title: "Onboarding",
            summary: "s",
            points: ["p", 4],
            notes: ["n1", "n9", "n1"],
          },
        ],
        patterns: ["Et mønster"],
        recommendations: [{ id: "r1", text: "Gør det" }],
        actions: [{ what: "Makker", who: "Anna", when: "", notes: ["n2"] }],
        openPoints: ["Hvem ejer det?"],
        questions: [{ id: "q1", text: "Aftalt?", options: ["Ja", "Nej"] }],
      },
      toId,
    );
    expect(outline).not.toBeNull();
    expect(outline!.summary).toBe("Godt møde");
    expect(outline!.themes[0]).toMatchObject({
      title: "Onboarding",
      points: ["p"],
      noteIds: ["id-1"],
    });
    expect(outline!.patterns[0]!.text).toBe("Et mønster");
    expect(outline!.recommendations[0]).toMatchObject({ id: "r1", kept: false });
    expect(outline!.actions[0]).toMatchObject({ what: "Makker", who: "Anna", noteIds: ["id-2"] });
    expect(outline!.questions[0]).toMatchObject({ options: ["Ja", "Nej"], answer: null });
  });

  it("is refused when it is not an outline, and survives missing parts", () => {
    expect(parseOutline("tekst", toId)).toBeNull();
    expect(parseOutline(null, toId)).toBeNull();
    const bare = parseOutline({ summary: "Kun det" }, toId);
    expect(bare).toEqual({ ...EMPTY_OUTLINE, summary: "Kun det" });
  });

  it("keeps a recommendation the facilitator kept, when it comes back the same", () => {
    const previous: Outline = {
      ...EMPTY_OUTLINE,
      recommendations: [{ id: "r1", text: "Gør det", kept: true }],
    };
    const next = parseOutline({ recommendations: ["Gør det", "Noget nyt"] }, toId, previous);
    expect(next!.recommendations.map((r) => r.kept)).toEqual([true, false]);
  });
});

describe("Distil's questions", () => {
  it("ask about the colours only when there are two or more", () => {
    const words = { ask: (c: string[]) => c.join("+"), none: "Nej" };
    expect(colourQuestion(["yellow", "yellow", "none", "white"], words)).toBeNull();
    expect(colourQuestion(["yellow", "pink", "yellow"], words)).toEqual({
      id: COLOUR_QUESTION_ID,
      text: "yellow+pink",
      options: ["Nej"],
      answer: null,
    });
  });

  it("keep their answers through a new outline, also when not asked again", () => {
    const previous: Outline = {
      ...EMPTY_OUTLINE,
      questions: [
        { id: "colours", text: "Farver?", options: [], answer: "Gul er idéer" },
        { id: "q1", text: "Aftalt?", options: [], answer: "Ja" },
        { id: "q2", text: "Ubesvaret?", options: [], answer: null },
      ],
    };
    const next = keepAnswers(
      {
        ...EMPTY_OUTLINE,
        questions: [{ id: "colours", text: "Farver?", options: [], answer: null }],
      },
      previous,
    );
    expect(next.questions.map((q) => [q.id, q.answer])).toEqual([
      ["colours", "Gul er idéer"],
      ["q1", "Ja"],
    ]);
  });
});

describe("Mistral for the outline", () => {
  it("is sent the notes as lines and the answers, and its answer is parsed", async () => {
    let body: { messages: { content: string }[] } | undefined;
    const outliner = mistralOutliner({
      key: "k",
      model: "m",
      fetch: (async (_url: string, init: RequestInit) => {
        body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: "S",
                    themes: [{ title: "T", notes: ["n1"] }],
                  }),
                },
              },
            ],
          }),
        );
      }) as typeof fetch,
    });
    const outline = await outliner.make(
      [note("id-1", "Hej")],
      [{ question: "Farver?", answer: "Nej" }],
    );
    expect(outline.themes[0]!.noteIds).toEqual(["id-1"]);
    expect(body!.messages[1]!.content).toContain("n1 [yellow, photo 1] Hej");
    expect(body!.messages[1]!.content).toContain("Farver? → Nej");
  });
});

describe("the stored outline", () => {
  let db: Db;
  let alice: string;
  let workshopId: string;

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
    workshopId = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
    const photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
    await finishReading(db, alice, photoId, FAKE_ITEMS);
  });

  const made = async () => fakeOutliner.make(await notesOfWorkshop(db, alice, workshopId), []);

  it("is made from the read notes, and Distil's next pass can be undone", async () => {
    expect(await notesOfWorkshop(db, alice, workshopId)).toHaveLength(FAKE_ITEMS.length);
    await storeGenerated(db, alice, workshopId, await made());
    const first = await getOutline(db, alice, workshopId);
    await storeGenerated(db, alice, workshopId, { ...first!.content, summary: "Anden udgave" });
    expect((await getOutline(db, alice, workshopId))!.content.summary).toBe("Anden udgave");
    await undoGenerated(db, alice, workshopId);
    expect((await getOutline(db, alice, workshopId))!.content.summary).toBe(first!.content.summary);
  });

  it("refuses an edit based on an old version, but not an answer given meanwhile", async () => {
    await storeGenerated(db, alice, workshopId, await made());
    const row = (await getOutline(db, alice, workshopId))!;
    const question = row.content.questions[0]!;
    // The phone answers while the computer edits: the answer does not move the version.
    await answerQuestion(db, alice, workshopId, question.id, "Aftalt");
    const v = await saveOutline(
      db,
      alice,
      workshopId,
      { ...row.content, summary: "Min" },
      row.version,
    );
    const saved = (await getOutline(db, alice, workshopId))!;
    expect(saved.content.summary).toBe("Min");
    // The edit carried the old, unanswered question, and the answer still stands.
    expect(saved.content.questions[0]!.answer).toBe("Aftalt");
    await expect(
      saveOutline(db, alice, workshopId, { ...row.content, summary: "Gammel" }, row.version),
    ).rejects.toThrow("conflict");
    expect(v).toBe(row.version + 1);
  });

  it("is not reachable for another account", async () => {
    const bob = await seedUser(db, "bob@example.com");
    await storeGenerated(db, alice, workshopId, await made());
    await expect(getOutline(db, bob, workshopId)).rejects.toThrow("notFound");
    await expect(answerQuestion(db, bob, workshopId, "q1", "x")).rejects.toThrow("notFound");
    await expect(saveOutline(db, bob, workshopId, EMPTY_OUTLINE, 1)).rejects.toThrow("notFound");
    await expect(undoGenerated(db, bob, workshopId)).rejects.toThrow("notFound");
  });

  it("may be made a limited number of times per account and day", async () => {
    const day = Date.UTC(2026, 10, 12, 10);
    const config = {
      allowance: 10,
      approvedAllowance: 100,
      dailyCeiling: 300,
      outlinesPerAccount: 2,
      outlineCeiling: 500,
    };
    await reserveOutline(db, alice, day, config);
    await reserveOutline(db, alice, day, config);
    await expect(reserveOutline(db, alice, day, config)).rejects.toThrow("outlines");
    await releaseOutline(db, alice, day);
    await reserveOutline(db, alice, day, config);
    // A new day starts the count again.
    await reserveOutline(db, alice, day + 86_400_000, config);
    const [row] = await db.select().from(users).where(eq(users.id, alice));
    expect(row).toMatchObject({ outlineDay: "2026-11-13", outlinesOnDay: 1 });
  });
});
