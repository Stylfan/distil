import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { workshops } from "@/db/schema";
import { withUser, type Db } from "@/db/client";
import { createExampleWorkshop, type ExampleWorkshop } from "@/demo/example";
import { EMPTY_CONTEXT } from "@/domain/context";
import { EMPTY_OUTLINE } from "@/domain/outline";
import { getOutline, notesOfWorkshop } from "@/services/outlines";
import { deleteAccount } from "@/services/users";
import { findWorkshop, getWorkshop } from "@/services/workshops";
import { appDb, freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * Every demo visit gets its own copy of the example workshop: photos read
 * and waiting to be checked, the notes, the outline and its story, with
 * every reference pointing at the copy's own notes. It belongs to the
 * visit only, and goes with it.
 */

const example: ExampleWorkshop = {
  name: "Workshop om tre initiativer",
  heldOn: "2026-11-12",
  context: { ...EMPTY_CONTEXT, audience: "Direktionen" },
  photos: [{ seq: 1 }, { seq: 2 }],
  notes: [
    {
      key: "n1",
      photo: 1,
      seq: 1,
      kind: "note",
      text: "Kunder",
      colour: "yellow",
      x: 100,
      y: 100,
      unsure: false,
      alternatives: [],
      votes: 3,
      edited: false,
    },
    {
      key: "n2",
      photo: 2,
      seq: 1,
      kind: "note",
      text: "Azure",
      colour: "blue",
      x: 500,
      y: 500,
      unsure: true,
      alternatives: ["Azur"],
      votes: 0,
      edited: false,
    },
  ],
  diagrams: [],
  outline: {
    content: {
      ...EMPTY_OUTLINE,
      summary: "S",
      themes: [
        { id: "t1", title: "Kunder", summary: "", points: ["a"], noteIds: ["n1", "n2", "gone"] },
      ],
      story: {
        headline: "H",
        tagline: "",
        soWhat: "",
        keyMessages: [],
        themes: [],
        shifts: [],
        quoteNoteId: "n1",
        closing: "",
      },
    },
    includeTranscript: true,
  },
};
const images = new Map([
  [1, fakeJpeg()],
  [2, fakeJpeg()],
]);

describe("the example workshop of a demo visit", () => {
  let db: Db;
  let visit: string;

  beforeEach(async () => {
    db = await freshDb();
    visit = await seedUser(db, "demo-x@demo.invalid");
  });

  const asVisit = <T>(fn: (tx: Db) => Promise<T>) =>
    withUser(visit, fn as never, appDb()) as Promise<T>;

  it("is a full copy in the visit's own account, with references to its own notes", async () => {
    const id = await asVisit((tx) =>
      createExampleWorkshop(tx, visit, { workshop: example, images }),
    );
    const full = await asVisit((tx) => getWorkshop(tx, visit, id!));
    expect(full!.workshop).toMatchObject({ name: example.name, context: example.context });
    expect(full!.photos.map((p) => p.status)).toEqual(["read", "read"]);
    const read = await asVisit((tx) => notesOfWorkshop(tx, visit, id!));
    expect(read.map((n) => n.text)).toEqual(["Kunder", "Azure"]);
    const outline = (await asVisit((tx) => getOutline(tx, visit, id!)))!;
    expect(outline.content.themes[0]!.noteIds).toEqual(read.map((n) => n.id));
    expect(outline.content.story!.quoteNoteId).toBe(read[0]!.id);
    expect(outline.includeTranscript).toBe(true);
  });

  it("is nothing without the example's files, and belongs to the visit only", async () => {
    expect(await asVisit((tx) => createExampleWorkshop(tx, visit, null))).toBeNull();
    const id = await asVisit((tx) =>
      createExampleWorkshop(tx, visit, { workshop: example, images }),
    );
    const bob = await seedUser(db, "bob@example.com");
    expect(await withUser(bob, (tx) => findWorkshop(tx, bob, id!), appDb())).toBeNull();
    await asVisit((tx) => deleteAccount(tx, visit));
    expect(await db.select().from(workshops).where(eq(workshops.id, id!))).toEqual([]);
  });
});
