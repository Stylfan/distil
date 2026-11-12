import { diagramBounds, edgeEnds, toBox, type Diagram, type DiagramNode } from "@/domain/diagram";
import { cn } from "@/lib/cn";

/**
 * A whiteboard drawing, redrawn clean: shapes where they stood on the
 * board, words in them, lines and arrows between them. Plain SVG, so it
 * is as sharp on the screen as in the PDF. Neutral: ink lines on white,
 * and the yellow of a post-it where one was stuck in the drawing.
 */

const INK = "#1F2D33";
const SLATE = "#5C6A6F";
const NOTE = "#F8EEDB";
const NOTE_EDGE = "#D9B866";

function Label({
  node,
  box,
  size,
  bold,
}: {
  node: DiagramNode;
  box: { x: number; y: number; w: number; h: number };
  size: number;
  bold?: boolean;
}) {
  return (
    <foreignObject x={box.x - box.w / 2} y={box.y - box.h / 2} width={box.w} height={box.h}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 6,
          fontSize: size,
          lineHeight: 1.2,
          color: INK,
          fontWeight: bold ? 600 : 400,
          overflow: "hidden",
          overflowWrap: "anywhere",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        {node.label}
      </div>
    </foreignObject>
  );
}

function Shape({ node, ratio, size }: { node: DiagramNode; ratio: number; size: number }) {
  const box = toBox(node, ratio);
  const left = box.x - box.w / 2;
  const top = box.y - box.h / 2;
  switch (node.shape) {
    case "person": {
      // A stick figure in the upper part of the box, the role's name under it.
      const figure = Math.min(box.w, box.h * 0.62);
      const cx = box.x;
      const head = figure * 0.16;
      const topY = top + 4;
      const neck = topY + head * 2;
      const hip = neck + figure * 0.42;
      return (
        <g>
          <g stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round">
            <circle cx={cx} cy={topY + head} r={head} fill="#fff" />
            <line x1={cx} y1={neck} x2={cx} y2={hip} />
            <line
              x1={cx - figure * 0.28}
              y1={neck + figure * 0.14}
              x2={cx + figure * 0.28}
              y2={neck + figure * 0.14}
            />
            <line x1={cx} y1={hip} x2={cx - figure * 0.22} y2={hip + figure * 0.3} />
            <line x1={cx} y1={hip} x2={cx + figure * 0.22} y2={hip + figure * 0.3} />
          </g>
          {node.label && (
            <Label
              node={node}
              box={{
                x: box.x,
                y: hip + figure * 0.3 + size * 1.6,
                w: Math.max(box.w, 140),
                h: size * 3,
              }}
              size={size}
              bold
            />
          )}
        </g>
      );
    }
    case "circle":
      return (
        <g>
          <ellipse
            cx={box.x}
            cy={box.y}
            rx={box.w / 2}
            ry={box.h / 2}
            fill="#fff"
            stroke={INK}
            strokeWidth={2.5}
          />
          <Label node={node} box={{ ...box, w: box.w * 0.8, h: box.h * 0.8 }} size={size} />
        </g>
      );
    case "note":
      return (
        <g>
          <rect
            x={left}
            y={top}
            width={box.w}
            height={box.h}
            fill={NOTE}
            stroke={NOTE_EDGE}
            strokeWidth={1.5}
          />
          <Label node={node} box={box} size={size} />
        </g>
      );
    case "text":
      return <Label node={node} box={box} size={size} />;
    default:
      return (
        <g>
          <rect
            x={left}
            y={top}
            width={box.w}
            height={box.h}
            rx={node.shape === "round" ? Math.min(box.h / 2, 28) : 6}
            fill="#fff"
            stroke={INK}
            strokeWidth={2.5}
          />
          <Label node={node} box={box} size={size} />
        </g>
      );
  }
}

/** The part of the board that was drawn on, as an SVG view box (src/domain/diagram.ts). */
function viewBox(diagram: Diagram, ratio: number): string {
  const b = diagramBounds(diagram, ratio);
  return `${b.x} ${b.y} ${b.w} ${b.h}`;
}

export function DiagramView({
  diagram,
  width,
  height,
  className,
  highlight,
}: {
  diagram: Diagram;
  /** The photo's own proportions, so the drawing keeps the board's layout. */
  width: number;
  height: number;
  className?: string;
  highlight?: string | null;
}) {
  const ratio = height / width;
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  // Text scaled to the drawing: readable whether it is wide or tall.
  const size = Math.max(16, Math.min(26, 1000 / 42));

  return (
    <svg
      viewBox={viewBox(diagram, ratio)}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={diagram.title || undefined}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={INK} />
        </marker>
      </defs>
      {diagram.edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const { x1, y1, x2, y2 } = edgeEnds(toBox(a, ratio), toBox(b, ratio));
        return (
          <g key={e.id}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={INK}
              strokeWidth={2.2}
              strokeDasharray={e.dashed ? "10 8" : undefined}
              markerEnd={e.arrow !== "none" ? "url(#arrow)" : undefined}
              markerStart={e.arrow === "both" ? "url(#arrow)" : undefined}
            />
            {e.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 10}
                textAnchor="middle"
                fontSize={size * 0.8}
                fill={SLATE}
                stroke="#fff"
                strokeWidth={6}
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {diagram.nodes.map((n) => (
        <g key={n.id} opacity={highlight && highlight !== n.id ? 0.35 : 1}>
          <Shape node={n} ratio={ratio} size={size} />
        </g>
      ))}
    </svg>
  );
}
