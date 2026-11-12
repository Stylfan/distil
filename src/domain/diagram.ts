import { z } from "zod";

/**
 * A drawing from a whiteboard or flip-over, redrawn: boxes, roles, circles
 * and loose text where they stood, and the lines and arrows between them.
 * Flow diagrams, org charts, customer journeys, timelines, 2×2 matrices
 * and canvas models are all this: shapes with words, placed on a sheet,
 * joined by lines.
 *
 * Positions are thousandths of the photo's width and height, so the
 * drawing keeps the layout the participants gave it. The model's answer
 * is parsed leniently and clamped; what does not fit is dropped.
 */

export const SHAPES = ["box", "round", "circle", "person", "note", "text"] as const;
export type Shape = (typeof SHAPES)[number];

export const ARROWS = ["none", "end", "both"] as const;
export type Arrow = (typeof ARROWS)[number];

export const MAX_NODES = 80;
export const MAX_EDGES = 120;

const permille = z.number().int().min(0).max(1000);

export const diagramSchema = z.object({
  title: z.string().trim().max(200),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().trim().max(300),
        shape: z.enum(SHAPES),
        x: permille,
        y: permille,
        w: z.number().int().min(20).max(1000),
        h: z.number().int().min(20).max(1000),
      }),
    )
    .max(MAX_NODES),
  edges: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        from: z.string().min(1).max(40),
        to: z.string().min(1).max(40),
        label: z.string().trim().max(120),
        arrow: z.enum(ARROWS),
        dashed: z.boolean(),
      }),
    )
    .max(MAX_EDGES),
});

export type Diagram = z.infer<typeof diagramSchema>;
export type DiagramNode = Diagram["nodes"][number];
export type DiagramEdge = Diagram["edges"][number];

type Raw = Record<string, unknown>;
const record = (v: unknown): Raw | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Raw) : null;
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** A position or size as thousandths: accepts 0–1 or 0–1000. */
function toPermille(v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.round(Math.min(1000, Math.max(0, v <= 1 ? v * 1000 : v)));
}

function toShape(v: unknown): Shape {
  const word = text(v, 20).toLowerCase();
  if ((SHAPES as readonly string[]).includes(word)) return word as Shape;
  if (["role", "actor", "stick", "figure", "rolle", "menneske"].includes(word)) return "person";
  if (["ellipse", "oval", "cirkel"].includes(word)) return "circle";
  if (["rect", "rectangle", "square", "kasse"].includes(word)) return "box";
  if (["sticky", "post-it", "postit"].includes(word)) return "note";
  return "box";
}

function toArrow(v: unknown): Arrow {
  if (v === true) return "end";
  const word = text(v, 10).toLowerCase();
  return (ARROWS as readonly string[]).includes(word) ? (word as Arrow) : "end";
}

/**
 * A diagram from the model's answer, or null when there is none worth
 * drawing: fewer than two shapes, or nothing that holds together.
 */
export function parseDiagram(raw: unknown): Diagram | null {
  const d = record(raw);
  if (!d) return null;
  const seen = new Set<string>();
  const nodes: DiagramNode[] = [];
  for (const entry of list(d.nodes)) {
    const n = record(entry);
    if (!n) continue;
    let id = text(n.id, 40) || `n${nodes.length + 1}`;
    if (seen.has(id)) id = `${id}-${nodes.length + 1}`;
    const shape = toShape(n.shape);
    const label = text(n.label ?? n.text, 300);
    if (!label && shape !== "person") continue;
    seen.add(id);
    nodes.push({
      id,
      label,
      shape,
      x: toPermille(n.x, 500),
      y: toPermille(n.y, 500),
      w: Math.max(20, toPermille(n.w, 160)),
      h: Math.max(20, toPermille(n.h, 90)),
    });
    if (nodes.length === MAX_NODES) break;
  }
  if (nodes.length < 2) return null;
  const edges: DiagramEdge[] = [];
  for (const entry of list(d.edges)) {
    const e = record(entry);
    if (!e) continue;
    const from = text(e.from, 40);
    const to = text(e.to, 40);
    if (!seen.has(from) || !seen.has(to) || from === to) continue;
    edges.push({
      id: `e${edges.length + 1}`,
      from,
      to,
      label: text(e.label, 120),
      arrow: toArrow(e.arrow),
      dashed: e.dashed === true,
    });
    if (edges.length === MAX_EDGES) break;
  }
  const diagram = { title: text(d.title, 200), nodes, edges };
  const checked = diagramSchema.safeParse(diagram);
  return checked.success ? checked.data : null;
}

/** Removes a shape and every line that touched it. */
export function withoutNode(diagram: Diagram, id: string): Diagram {
  return {
    ...diagram,
    nodes: diagram.nodes.filter((n) => n.id !== id),
    edges: diagram.edges.filter((e) => e.from !== id && e.to !== id),
  };
}

/** A shape in drawing units: 1000 wide, and as tall as the photo's shape makes it. */
export type Box = { x: number; y: number; w: number; h: number };

export function toBox(node: DiagramNode, heightRatio: number): Box {
  return { x: node.x, y: node.y * heightRatio, w: node.w, h: node.h * heightRatio };
}

/** Where the line from one box's centre towards another leaves the box. */
function exit(from: Box, to: Box): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: from.x, y: from.y };
  const t = Math.min(
    dx === 0 ? Infinity : from.w / 2 / Math.abs(dx),
    dy === 0 ? Infinity : from.h / 2 / Math.abs(dy),
    1,
  );
  return { x: from.x + dx * t, y: from.y + dy * t };
}

/** The two ends of a line between boxes, on their edges, so arrows end at the box. */
export function edgeEnds(a: Box, b: Box): { x1: number; y1: number; x2: number; y2: number } {
  const p = exit(a, b);
  const q = exit(b, a);
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}
