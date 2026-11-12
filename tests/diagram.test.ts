import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { FAKE_DIAGRAM } from "@/ai/fake";
import { buildDeck } from "@/domain/deck";
import { edgeEnds, parseDiagram, toBox, withoutNode } from "@/domain/diagram";
import { EMPTY_OUTLINE } from "@/domain/outline";
import { parsePhotoAnswer } from "@/domain/reading";
import {
  getDiagram,
  listDiagrams,
  saveDiagram,
  setDiagramIncluded,
  storeDiagram,
} from "@/services/diagrams";
import { addPhoto } from "@/services/photos";
import { createWorkshop } from "@/services/workshops";
import { freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * Drawings from the board, redrawn: what the model's answer is turned
 * into (leniently, and only when it holds together), where the lines meet
 * the shapes, how a drawing is stored with its photo and corrected, and
 * that it gets a slide only when chosen.
 */

describe("a drawing from the model", () => {
  it("becomes shapes and lines, with words for shapes and fractions for places", () => {
    const d = parseDiagram({
      title: " Salgsflowet ",
      nodes: [
        { id: "a", label: "Kunde", shape: "Actor", x: 0.1, y: 0.5, w: 0.1, h: 0.2 },
        { id: "b", label: "Sælger", shape: "rectangle", x: 400, y: 500 },
        { id: "c", text: "Lager", shape: "oval" },
        { id: "d", label: "", shape: "box" },
      ],
      edges: [
        { from: "a", to: "b", label: "bestiller", arrow: "end" },
        { from: "b", to: "c", arrow: "both", dashed: true },
        { from: "b", to: "x" },
        { from: "c", to: "c" },
      ],
    });
    expect(d).not.toBeNull();
    expect(d!.title).toBe("Salgsflowet");
    expect(d!.nodes.map((n) => [n.id, n.shape, n.label])).toEqual([
      ["a", "person", "Kunde"],
      ["b", "box", "Sælger"],
      ["c", "circle", "Lager"],
    ]);
    expect(d!.nodes[0]).toMatchObject({ x: 100, y: 500, w: 100, h: 200 });
    expect(d!.edges.map((e) => [e.from, e.to, e.arrow, e.dashed])).toEqual([
      ["a", "b", "end", false],
      ["b", "c", "both", true],
    ]);
  });

  it("is no drawing when there is too little, or nothing at all", () => {
    expect(parseDiagram(null)).toBeNull();
    expect(parseDiagram({ nodes: [{ id: "a", label: "Alene" }] })).toBeNull();
    expect(parsePhotoAnswer({ items: [{ text: "Hej" }] })).toMatchObject({ diagram: null });
    expect(
      parsePhotoAnswer({ items: [], diagram: { nodes: [{ label: "A" }, { label: "B" }] } })!
        .diagram!.nodes.length,
    ).toBe(2);
  });

  it("loses a shape with every line that touched it", () => {
    const d = withoutNode(FAKE_DIAGRAM, "lager");
    expect(d.nodes.some((n) => n.id === "lager")).toBe(false);
    expect(d.edges.map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("a line between shapes", () => {
  it("ends at the edges of the boxes, not in their middles", () => {
    const a = toBox({ id: "a", label: "", shape: "box", x: 100, y: 500, w: 100, h: 100 }, 1);
    const b = toBox({ id: "b", label: "", shape: "box", x: 500, y: 500, w: 200, h: 100 }, 1);
    expect(edgeEnds(a, b)).toEqual({ x1: 150, y1: 500, x2: 400, y2: 500 });
    const c = toBox({ id: "c", label: "", shape: "box", x: 100, y: 100, w: 100, h: 100 }, 0.5);
    expect(c).toEqual({ x: 100, y: 50, w: 100, h: 50 });
  });
});

describe("a stored drawing", () => {
  let db: Db;
  let alice: string;
  let workshopId: string;
  let photoId: string;

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
    workshopId = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
    photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
  });

  it("is kept with its photo, replaced by a new reading, and gone when the reading finds none", async () => {
    await storeDiagram(db, alice, photoId, FAKE_DIAGRAM);
    await storeDiagram(db, alice, photoId, { ...FAKE_DIAGRAM, title: "Ny" });
    expect((await getDiagram(db, alice, photoId))!.content.title).toBe("Ny");
    expect(await listDiagrams(db, alice, workshopId)).toHaveLength(1);
    await storeDiagram(db, alice, photoId, null);
    expect(await getDiagram(db, alice, photoId)).toBeNull();
  });

  it("is corrected and chosen in or out by its owner only", async () => {
    await storeDiagram(db, alice, photoId, FAKE_DIAGRAM);
    await saveDiagram(db, alice, photoId, withoutNode(FAKE_DIAGRAM, "note"));
    await setDiagramIncluded(db, alice, photoId, false);
    const row = (await getDiagram(db, alice, photoId))!;
    expect(row.content.nodes).toHaveLength(FAKE_DIAGRAM.nodes.length - 1);
    expect(row.include).toBe(false);
    const bob = await seedUser(db, "bob@example.com");
    await expect(getDiagram(db, bob, photoId)).rejects.toThrow("notFound");
    await expect(saveDiagram(db, bob, photoId, FAKE_DIAGRAM)).rejects.toThrow("notFound");
    await expect(setDiagramIncluded(db, bob, photoId, true)).rejects.toThrow("notFound");
    await expect(listDiagrams(db, bob, workshopId)).rejects.toThrow("notFound");
  });

  it("has its own slide after the themes when chosen", () => {
    const slides = buildDeck({
      title: "W",
      date: "d",
      outline: {
        ...EMPTY_OUTLINE,
        themes: [{ id: "t", title: "T", summary: "", points: [], noteIds: [] }],
      },
      notes: [],
      includeTranscript: false,
      diagrams: [{ photo: 3, diagram: FAKE_DIAGRAM, width: 1600, height: 1000 }],
    });
    expect(slides.map((s) => s.kind)).toEqual(["cover", "summary", "theme", "diagram", "closing"]);
    expect(slides[3]).toMatchObject({ photo: 3, title: "Salgsflowet" });
  });
});
