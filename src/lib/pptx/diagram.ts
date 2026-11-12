import type PptxGenJS from "pptxgenjs";
import { diagramBounds, edgeEnds, toBox, type Diagram } from "@/domain/diagram";
import { COLOURS, FONT } from "./style";

/**
 * A redrawn drawing as PowerPoint shapes, not a picture: boxes, circles,
 * notes and lines the facilitator can move and retype in PowerPoint. The
 * drawing is scaled into the area given, keeping its proportions.
 */
export function addDiagram(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  diagram: Diagram,
  photo: { width: number; height: number },
  area: { x: number; y: number; w: number; h: number },
) {
  const ratio = photo.height / photo.width;
  const bounds = diagramBounds(diagram, ratio);
  const scale = Math.min(area.w / bounds.w, area.h / bounds.h);
  const offsetX = area.x + (area.w - bounds.w * scale) / 2;
  const offsetY = area.y + (area.h - bounds.h * scale) / 2;
  const X = (v: number) => offsetX + (v - bounds.x) * scale;
  const Y = (v: number) => offsetY + (v - bounds.y) * scale;
  const fontSize = Math.max(9, Math.min(16, 22 * scale * 40));
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));

  for (const e of diagram.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const { x1, y1, x2, y2 } = edgeEnds(toBox(a, ratio), toBox(b, ratio));
    // A PowerPoint line runs from its top-left corner to its bottom-right; flips set its direction.
    const flipH = x2 < x1 !== y2 < y1;
    const reversed = y2 < y1 || (y2 === y1 && x2 < x1);
    const arrow = e.arrow === "none" ? undefined : "triangle";
    slide.addShape(pptx.ShapeType.line, {
      x: X(Math.min(x1, x2)),
      y: Y(Math.min(y1, y2)),
      w: Math.max(Math.abs(x2 - x1) * scale, 0.01),
      h: Math.max(Math.abs(y2 - y1) * scale, 0.01),
      flipH,
      line: {
        color: COLOURS.ink,
        width: 1.5,
        dashType: e.dashed ? "dash" : "solid",
        endArrowType: reversed ? (e.arrow === "both" ? arrow : undefined) : arrow,
        beginArrowType: reversed ? arrow : e.arrow === "both" ? arrow : undefined,
      },
    });
    if (e.label) {
      slide.addText(e.label, {
        x: X((x1 + x2) / 2) - 0.8,
        y: Y((y1 + y2) / 2) - 0.32,
        w: 1.6,
        h: 0.28,
        align: "center",
        fontFace: FONT,
        fontSize: fontSize * 0.8,
        color: COLOURS.slate,
      });
    }
  }

  for (const n of diagram.nodes) {
    const b = toBox(n, ratio);
    const box = { x: X(b.x - b.w / 2), y: Y(b.y - b.h / 2), w: b.w * scale, h: b.h * scale };
    const text = {
      fontFace: FONT,
      fontSize,
      color: COLOURS.ink,
      align: "center" as const,
      valign: "middle" as const,
    };
    if (n.shape === "person") {
      const size = Math.min(box.w, box.h * 0.6);
      const cx = box.x + box.w / 2;
      const head = size * 0.16;
      const top = box.y;
      slide.addShape(pptx.ShapeType.ellipse, {
        x: cx - head,
        y: top,
        w: head * 2,
        h: head * 2,
        fill: { color: COLOURS.white },
        line: { color: COLOURS.ink, width: 1.5 },
      });
      const neck = top + head * 2;
      const hip = neck + size * 0.42;
      const stroke = { color: COLOURS.ink, width: 1.5 };
      slide.addShape(pptx.ShapeType.line, { x: cx, y: neck, w: 0.01, h: hip - neck, line: stroke });
      slide.addShape(pptx.ShapeType.line, {
        x: cx - size * 0.28,
        y: neck + size * 0.14,
        w: size * 0.56,
        h: 0.01,
        line: stroke,
      });
      slide.addShape(pptx.ShapeType.line, {
        x: cx - size * 0.22,
        y: hip,
        w: size * 0.22,
        h: size * 0.3,
        flipH: true,
        line: stroke,
      });
      slide.addShape(pptx.ShapeType.line, {
        x: cx,
        y: hip,
        w: size * 0.22,
        h: size * 0.3,
        line: stroke,
      });
      if (n.label) {
        slide.addText(n.label, {
          ...text,
          bold: true,
          x: cx - 0.9,
          y: hip + size * 0.32,
          w: 1.8,
          h: 0.35,
        });
      }
      continue;
    }
    if (n.shape === "text") {
      slide.addText(n.label, { ...text, ...box, fit: "shrink" });
      continue;
    }
    const shape =
      n.shape === "circle"
        ? pptx.ShapeType.ellipse
        : n.shape === "round"
          ? pptx.ShapeType.roundRect
          : pptx.ShapeType.rect;
    const note = n.shape === "note";
    slide.addText(n.label, {
      ...text,
      ...box,
      shape,
      rectRadius: n.shape === "round" ? 0.15 : undefined,
      fill: { color: note ? COLOURS.note : COLOURS.white },
      line: { color: note ? COLOURS.noteEdge : COLOURS.ink, width: note ? 1 : 1.5 },
      fit: "shrink",
    });
  }
}
