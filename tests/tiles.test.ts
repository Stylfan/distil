import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { mistralReader } from "@/ai/mistral";
import type { ReadItem } from "@/domain/reading";
import { TILE_FROM_EDGE, likeness, mergeTiles, tileRects } from "@/domain/tiles";
import { addPhoto, getImage, startReading } from "@/services/photos";
import { createWorkshop } from "@/services/workshops";
import { freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * Reading a large photo in parts: where the parts lie, how a note read in
 * two parts becomes one, and that the parts are kept with the photo and
 * handed out for reading, but never shown or counted as photos of their own.
 */

const note = (text: string, x: number, y: number): ReadItem => ({
  kind: "note",
  text,
  colour: "yellow",
  x,
  y,
  unsure: false,
  alternatives: [],
  votes: 0,
});

describe("the parts of a photo", () => {
  it("are none for a small photo, and four overlapping ones covering a large photo", () => {
    expect(tileRects(1600, 1200)).toEqual([]);
    const rects = tileRects(4032, 3024);
    expect(rects).toHaveLength(4);
    expect(rects[0]).toEqual({ x: 0, y: 0, w: 550, h: 550 });
    expect(rects[3]).toEqual({ x: 450, y: 450, w: 550, h: 550 });
    // Together they cover every point, and the middle is in all four.
    expect(
      rects.every((r) => r.x <= 500 && r.x + r.w >= 500 && r.y <= 500 && r.y + r.h >= 500),
    ).toBe(true);
    expect(tileRects(TILE_FROM_EDGE, 100)).toHaveLength(4);
  });
});

describe("merging the parts' readings", () => {
  it("places each note on the whole photo", () => {
    const merged = mergeTiles([
      { rect: { x: 450, y: 0, w: 550, h: 550 }, items: [note("Proces", 500, 500)] },
    ]);
    expect(merged).toEqual([note("Proces", 725, 275)]);
  });

  it("makes one note of two readings in the overlap, keeping the one seen further from an edge", () => {
    const merged = mergeTiles([
      { rect: { x: 0, y: 0, w: 550, h: 550 }, items: [note("Demo fungerer godt", 950, 400)] },
      { rect: { x: 450, y: 0, w: 550, h: 550 }, items: [note("Demo fungerer got", 80, 400)] },
    ]);
    expect(merged).toHaveLength(1);
    // 80 from the edge beats 50 from the edge.
    expect(merged[0]!.text).toBe("Demo fungerer got");
  });

  it("keeps notes apart that only look alike, or only lie close", () => {
    const merged = mergeTiles([
      {
        rect: { x: 0, y: 0, w: 550, h: 550 },
        items: [note("12:00", 100, 100), note("Strategi", 900, 900)],
      },
      {
        rect: { x: 0, y: 450, w: 550, h: 550 },
        items: [note("12:00", 100, 900), note("Governance", 900, 90)],
      },
    ]);
    expect(merged.map((m) => m.text).sort()).toEqual(["12:00", "12:00", "Governance", "Strategi"]);
  });

  it("judges likeness of texts by their letters, not case or punctuation", () => {
    expect(likeness("PO/PM møde", "po pm møde")).toBe(1);
    expect(likeness("Frustration", "Fustration")).toBeGreaterThan(0.85);
    expect(likeness("Strategi", "Governance")).toBeLessThan(0.3);
  });
});

describe("a photo with parts", () => {
  let db: Db;
  let alice: string;
  let workshopId: string;

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
    workshopId = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
  });

  const parts = () => tileRects(4032, 3024).map((rect) => ({ bytes: fakeJpeg(2000, 1500), rect }));

  it("keeps its parts, shows only the whole, and hands the parts out for reading", async () => {
    const photoId = await addPhoto(
      db,
      alice,
      workshopId,
      fakeJpeg(2000, 1500),
      Date.now(),
      parts(),
    );
    const shown = await getImage(db, alice, photoId);
    expect(shown?.data.length).toBe(fakeJpeg(2000, 1500).length);
    const start = await startReading(db, alice, photoId);
    expect(start.kind).toBe("image");
    if (start.kind === "image")
      expect(start.parts.map((p) => p.rect)).toEqual(tileRects(4032, 3024));
  });

  it("refuses parts that are not JPEGs or lie outside the photo", async () => {
    await expect(
      addPhoto(db, alice, workshopId, fakeJpeg(), Date.now(), [
        { bytes: Buffer.from("x"), rect: { x: 0, y: 0, w: 500, h: 500 } },
      ]),
    ).rejects.toThrow("type");
    await expect(
      addPhoto(db, alice, workshopId, fakeJpeg(), Date.now(), [
        { bytes: fakeJpeg(), rect: { x: 600, y: 0, w: 500, h: 500 } },
      ]),
    ).rejects.toThrow("dimensions");
    const tooMany = [...parts(), ...parts()];
    await expect(addPhoto(db, alice, workshopId, fakeJpeg(), Date.now(), tooMany)).rejects.toThrow(
      "size",
    );
  });
});

describe("Mistral reading a part", () => {
  it("is asked for the notes of that part only, and its answer is parsed", async () => {
    let prompt = "";
    const reader = mistralReader({
      key: "k",
      model: "m",
      fetch: (async (_url: string, init: RequestInit) => {
        prompt = JSON.parse(String(init.body)).messages[0].content;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ items: [{ text: "Proces", x: 0.5, y: 0.5 }] }),
                },
              },
            ],
          }),
        );
      }) as typeof fetch,
    });
    const items = await reader.readPart(Buffer.from([1]), "image/jpeg");
    expect(items).toMatchObject([{ text: "Proces", x: 500, y: 500 }]);
    expect(prompt).toContain("one part of a photo");
    expect(prompt).toContain("never invent text");
  });
});
