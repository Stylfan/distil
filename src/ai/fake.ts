import type { Diagram } from "@/domain/diagram";
import type { ReadItem } from "@/domain/reading";
import type { Reader } from "./reader";

/**
 * Made-up notes for a development machine without a Mistral key
 * (DISTIL_READER=fake), and for tests. Always the same wall, whatever the
 * photo shows, so it is obvious it is not a real reading.
 */
export const FAKE_ITEMS: ReadItem[] = [
  {
    kind: "heading",
    text: "Onboarding",
    colour: "none",
    x: 200,
    y: 80,
    unsure: false,
    alternatives: [],
  },
  {
    kind: "heading",
    text: "Værktøjer",
    colour: "none",
    x: 700,
    y: 80,
    unsure: false,
    alternatives: [],
  },
  {
    kind: "note",
    text: "For mange systemer på dag 1",
    colour: "yellow",
    x: 150,
    y: 250,
    unsure: false,
    alternatives: [],
  },
  {
    kind: "note",
    text: "Mangler en fast makker",
    colour: "yellow",
    x: 300,
    y: 260,
    unsure: false,
    alternatives: [],
  },
  {
    kind: "note",
    text: "Hvem spørger jeg om kollega?",
    colour: "pink",
    x: 220,
    y: 420,
    unsure: true,
    alternatives: ["Hvem spørger jeg om kalender?"],
  },
  {
    kind: "note",
    text: "Teams og mail bruges til det samme",
    colour: "green",
    x: 680,
    y: 240,
    unsure: false,
    alternatives: [],
  },
  {
    kind: "note",
    text: "VPN driller",
    colour: "green",
    x: 820,
    y: 260,
    unsure: false,
    alternatives: [],
  },
  {
    kind: "drawing",
    text: "Pil fra Kunde til Sælger til Lager",
    colour: "none",
    x: 500,
    y: 760,
    unsure: false,
    alternatives: [],
  },
];

/** A made-up drawing: a small flow with a role, as a whiteboard might hold. */
export const FAKE_DIAGRAM: Diagram = {
  title: "Salgsflowet",
  nodes: [
    { id: "kunde", label: "Kunde", shape: "person", x: 120, y: 500, w: 120, h: 220 },
    { id: "saelger", label: "Sælger", shape: "box", x: 380, y: 500, w: 200, h: 140 },
    { id: "lager", label: "Lager", shape: "box", x: 660, y: 500, w: 200, h: 140 },
    {
      id: "levering",
      label: "Levering til kunden",
      shape: "round",
      x: 880,
      y: 820,
      w: 200,
      h: 130,
    },
    { id: "note", label: "Flaskehals?", shape: "note", x: 660, y: 180, w: 160, h: 140 },
  ],
  edges: [
    { id: "e1", from: "kunde", to: "saelger", label: "bestiller", arrow: "end", dashed: false },
    { id: "e2", from: "saelger", to: "lager", label: "", arrow: "end", dashed: false },
    { id: "e3", from: "lager", to: "levering", label: "pakker", arrow: "end", dashed: false },
    { id: "e4", from: "note", to: "lager", label: "", arrow: "none", dashed: true },
  ],
};

export const fakeReader: Reader = {
  read: () =>
    Promise.resolve({
      items: FAKE_ITEMS.map((i) => ({ ...i, alternatives: [...i.alternatives] })),
      diagram: structuredClone(FAKE_DIAGRAM),
    }),
};
