import type PptxGenJS from "pptxgenjs";
import type { DeckNote } from "@/domain/deck";
import type { Look } from "@/domain/story";
import { PALETTES } from "@/components/deck/look";
import { FONT, H, MARGIN, NOTE_EDGE, NOTE_FILL, W } from "./style";

/**
 * The pieces of a PowerPoint slide in the deck's colour theme: the
 * colours without "#", a kicker, an action title, a "so what" bar, a card,
 * a post-it. Real text boxes and shapes, so every word can be changed.
 */

export const CONTENT_W = W - MARGIN * 2;

export type Colours = Record<Exclude<keyof (typeof PALETTES)["kobolt"], "light">, string>;

export function coloursOf(look: Look): Colours {
  return Object.fromEntries(
    Object.entries(PALETTES[look])
      .filter((e): e is [string, string] => typeof e[1] === "string")
      .map(([k, v]) => [k, v.replace("#", "")]),
  ) as Colours;
}

export type Ctx = { pptx: PptxGenJS; slide: PptxGenJS.Slide; k: Colours };

export function kicker({ slide, k }: Ctx, text: string, light = false) {
  slide.addText(text.toUpperCase(), {
    x: MARGIN,
    y: 0.45,
    w: CONTENT_W,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    charSpacing: 2,
    color: light ? k.accent : k.brand,
    margin: 0,
  });
}

export function title({ slide, k }: Ctx, text: string, size = 26) {
  slide.addText(text, {
    x: MARGIN,
    y: 0.8,
    w: CONTENT_W * 0.92,
    h: 1.0,
    fontFace: FONT,
    fontSize: size,
    bold: true,
    color: k.ink,
    valign: "top",
    margin: 0,
    fit: "shrink",
  });
}

export function soWhat({ pptx, slide, k }: Ctx, label: string, text: string) {
  slide.addText(
    [
      { text: `${label.toUpperCase()}   `, options: { bold: true, fontSize: 11, color: k.accent } },
      { text, options: { fontSize: 15, color: "FFFFFF" } },
    ],
    {
      x: MARGIN,
      y: H - 1.35,
      w: CONTENT_W,
      h: 0.7,
      shape: pptx.ShapeType.roundRect,
      rectRadius: 0.1,
      fill: { color: k.deep },
      fontFace: FONT,
      valign: "middle",
      margin: [0, 16, 0, 16],
      fit: "shrink",
    },
  );
}

export function card(
  { pptx, slide }: Ctx,
  area: { x: number; y: number; w: number; h: number },
  edge?: { colour: string; side: "top" | "left" },
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    ...area,
    rectRadius: 0.12,
    fill: { color: "FFFFFF" },
    line: { color: "E6E3DD", width: 0.75 },
    shadow: { type: "outer", blur: 6, offset: 2, angle: 90, color: "000000", opacity: 0.08 },
  });
  if (edge) {
    slide.addShape(pptx.ShapeType.rect, {
      x: area.x,
      y: area.y,
      w: edge.side === "top" ? area.w : 0.07,
      h: edge.side === "top" ? 0.07 : area.h,
      fill: { color: edge.colour },
      line: { color: edge.colour, width: 0 },
    });
  }
}

export function badge({ pptx, slide, k }: Ctx, n: number | string, x: number, y: number, d = 0.36) {
  slide.addText(String(n), {
    x,
    y,
    w: d,
    h: d,
    shape: pptx.ShapeType.ellipse,
    fill: { color: k.brand },
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    margin: 0,
  });
}

export function postIt({ pptx, slide, k }: Ctx, note: DeckNote, x: number, y: number, w: number) {
  const h = w * 0.88;
  slide.addText(note.text, {
    x,
    y,
    w,
    h,
    shape: pptx.ShapeType.rect,
    fill: { color: NOTE_FILL[note.colour] },
    line: { color: NOTE_EDGE[note.colour], width: 0.75 },
    shadow: { type: "outer", blur: 5, offset: 2, angle: 90, color: "000000", opacity: 0.12 },
    fontFace: FONT,
    fontSize: 10,
    color: "2A2A2A",
    align: "center",
    valign: "middle",
    fit: "shrink",
  });
  const votes = note.votes ?? 0;
  if (votes > 0) {
    slide.addText(votes <= 5 ? "●".repeat(votes) : `● ${votes}`, {
      x: x + w * 0.35,
      y,
      w: w * 0.62,
      h: 0.22,
      align: "right",
      fontFace: FONT,
      fontSize: 8,
      color: k.deep,
    });
  }
}

/** The theme's shapes on a dark slide: a large circle and a smaller one in the accent. */
export function motif({ pptx, slide, k }: Ctx, side: "right" | "left", fill: string) {
  const x = side === "right" ? W - 4.2 : -1.6;
  slide.addShape(pptx.ShapeType.ellipse, {
    x,
    y: 2.6,
    w: 5.8,
    h: 5.8,
    fill: { color: fill },
    line: { color: fill, width: 0 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + 2.1,
    y: 4.7,
    w: 1.6,
    h: 1.6,
    fill: { color: k.accent },
    line: { color: k.accent, width: 0 },
  });
}
