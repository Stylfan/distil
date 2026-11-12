import type { Slide } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import { CONTENT_W, badge, card, kicker, postIt, soWhat, title, type Ctx } from "./parts";
import { FONT, MARGIN } from "./style";

/** The PowerPoint versions of the slides that tell the findings and list what follows. */

type Of<K extends Slide["kind"]> = Extract<Slide, { kind: K }>;

function text(
  ctx: Ctx,
  value: string,
  area: { x: number; y: number; w: number; h: number },
  size: number,
  options: object = {},
) {
  ctx.slide.addText(value, {
    ...area,
    fontFace: FONT,
    fontSize: size,
    color: ctx.k.ink,
    valign: "top",
    margin: 0,
    fit: "shrink",
    ...options,
  });
}

export function summarySlide(ctx: Ctx, s: Of<"summary">, words: DeckWords) {
  kicker(ctx, words.summaryKicker);
  title(ctx, s.headline);
  if (s.cards.length > 0) {
    const gap = 0.3;
    const w = (CONTENT_W - gap * (s.cards.length - 1)) / s.cards.length;
    s.cards.forEach((m, i) => {
      const x = MARGIN + i * (w + gap);
      card(ctx, { x, y: 2.1, w, h: 3.1 });
      text(ctx, String(i + 1).padStart(2, "0"), { x: x + 0.3, y: 2.3, w: 1, h: 0.6 }, 28, {
        bold: true,
        color: ctx.k.brand,
      });
      text(ctx, m.title, { x: x + 0.3, y: 3.0, w: w - 0.6, h: 0.6 }, 17, { bold: true });
      text(ctx, m.text, { x: x + 0.3, y: 3.65, w: w - 0.6, h: 1.4 }, 13, { color: ctx.k.muted });
    });
  } else {
    text(ctx, s.summary, { x: MARGIN, y: 2.1, w: CONTENT_W * 0.85, h: 3 }, 18, {
      color: ctx.k.muted,
    });
  }
  if (s.soWhat) soWhat(ctx, words.soWhat, s.soWhat);
}

export function themeMapSlide(ctx: Ctx, s: Of<"themeMap">, words: DeckWords) {
  const largest = [...s.themes].sort((a, b) => b.notes - a.notes)[0]!;
  kicker(ctx, words.mapKicker);
  title(ctx, words.mapHeadline(s.themes.length, largest.title.toLowerCase()));
  const cols = s.themes.length <= 4 ? s.themes.length : Math.ceil(s.themes.length / 2);
  const gap = 0.25;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  s.themes.forEach((t, i) => {
    const x = MARGIN + (i % cols) * (w + gap);
    const y = 2.1 + Math.floor(i / cols) * 2.15;
    card(
      ctx,
      { x, y, w, h: 1.9 },
      { colour: t.id === largest.id ? ctx.k.brand : ctx.k.soft, side: "top" },
    );
    text(ctx, t.title, { x: x + 0.25, y: y + 0.35, w: w - 0.5, h: 0.9 }, 15, { bold: true });
    text(ctx, words.notes(t.notes), { x: x + 0.25, y: y + 1.3, w: w - 0.5, h: 0.35 }, 12, {
      color: ctx.k.muted,
    });
  });
}

export function themeSlide(ctx: Ctx, s: Of<"theme">, words: DeckWords) {
  kicker(
    ctx,
    `${words.theme(s.number)}${s.headline ? ` · ${s.title}` : ""}${s.continued ? ` · ${words.continued}` : ""}`,
  );
  title(ctx, s.headline || s.title);
  const notes = s.notes.length > 0;
  const leftW = notes ? CONTENT_W * 0.52 : CONTENT_W;
  let y = 2.0;
  if (s.summary) {
    text(ctx, s.summary, { x: MARGIN, y, w: leftW, h: 0.8 }, 13, { color: ctx.k.muted });
    y += 0.9;
  }
  const step = Math.min(0.62, (5.9 - y - (s.soWhat ? 0.8 : 0)) / Math.max(1, s.points.length));
  s.points.forEach((p, i) => {
    badge(ctx, p.index + 1, MARGIN, y + i * step, 0.32);
    text(ctx, p.text, { x: MARGIN + 0.5, y: y + i * step, w: leftW - 0.5, h: step }, 14);
  });
  if (notes) {
    const x0 = MARGIN + CONTENT_W * 0.57;
    const w = (CONTENT_W * 0.43 - 0.3) / 3;
    text(ctx, words.fromWall.toUpperCase(), { x: x0, y: 2.0, w: 4, h: 0.3 }, 10, {
      bold: true,
      color: ctx.k.muted,
    });
    s.notes.forEach((n, i) =>
      postIt(ctx, n, x0 + (i % 3) * (w + 0.15), 2.4 + Math.floor(i / 3) * (w * 0.88 + 0.15), w),
    );
  }
  if (s.soWhat) soWhat(ctx, words.soWhat, s.soWhat);
}

export function votesSlide(ctx: Ctx, s: Of<"votes">, words: DeckWords) {
  kicker(ctx, words.votesTotal(s.total));
  title(ctx, words.votes);
  const most = Math.max(...s.notes.map((n) => n.votes ?? 0), 1);
  s.notes.forEach((n, i) => {
    const y = 2.0 + i * 0.58;
    text(ctx, n.text, { x: MARGIN, y, w: 5.6, h: 0.45 }, 14, { valign: "middle" });
    ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, {
      x: 6.6,
      y: y + 0.12,
      w: 5,
      h: 0.22,
      rectRadius: 0.1,
      fill: { color: ctx.k.soft },
      line: { color: ctx.k.soft, width: 0 },
    });
    ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, {
      x: 6.6,
      y: y + 0.12,
      w: Math.max(0.1, (5 * (n.votes ?? 0)) / most),
      h: 0.22,
      rectRadius: 0.1,
      fill: { color: i === 0 ? ctx.k.brand : ctx.k.accent },
      line: { color: i === 0 ? ctx.k.brand : ctx.k.accent, width: 0 },
    });
    text(ctx, String(n.votes), { x: 11.7, y, w: 0.9, h: 0.45 }, 15, {
      bold: true,
      align: "right",
      valign: "middle",
    });
  });
}

export function listSlide(ctx: Ctx, s: Of<"list">, words: DeckWords) {
  const heading =
    s.heading === "patterns"
      ? words.patterns
      : s.heading === "recommendations"
        ? words.recommendations
        : words.open;
  kicker(ctx, `${words.count(s.total, s.heading)}${s.continued ? ` · ${words.continued}` : ""}`);
  title(ctx, heading);
  const cols = s.items.length <= 3 ? s.items.length : 2;
  const rows = Math.ceil(s.items.length / cols);
  const gap = 0.3;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  const h = Math.min(2.6, (4.9 - gap * (rows - 1)) / rows);
  s.items.forEach((item, i) => {
    const x = MARGIN + (i % cols) * (w + gap);
    const y = 2.0 + Math.floor(i / cols) * (h + gap);
    card(
      ctx,
      { x, y, w, h },
      s.heading === "open" ? { colour: ctx.k.warn, side: "top" } : undefined,
    );
    const label =
      s.heading === "recommendations"
        ? words.suggestion
        : s.heading === "patterns"
          ? words.insight(i + 1)
          : "";
    if (label)
      text(ctx, label.toUpperCase(), { x: x + 0.3, y: y + 0.2, w: w - 0.6, h: 0.3 }, 10, {
        bold: true,
        color: ctx.k.brand,
      });
    text(
      ctx,
      item.text,
      { x: x + 0.3, y: y + 0.55, w: w - 0.6, h: h - 0.75 },
      cols === 2 ? 14 : 17,
    );
  });
}

export function shiftsSlide(ctx: Ctx, s: Of<"shifts">, words: DeckWords) {
  title(ctx, words.shifts);
  const w = (CONTENT_W - 0.9) / 2;
  text(ctx, words.today.toUpperCase(), { x: MARGIN, y: 1.95, w, h: 0.3 }, 10, {
    bold: true,
    color: ctx.k.muted,
  });
  text(ctx, words.ahead.toUpperCase(), { x: MARGIN + w + 0.9, y: 1.95, w, h: 0.3 }, 10, {
    bold: true,
    color: ctx.k.brand,
  });
  s.rows.forEach((r, i) => {
    const y = 2.4 + i * 0.95;
    ctx.slide.addText(r.from, {
      x: MARGIN,
      y,
      w,
      h: 0.78,
      shape: ctx.pptx.ShapeType.roundRect,
      rectRadius: 0.1,
      fill: { color: ctx.k.soft },
      fontFace: FONT,
      fontSize: 15,
      color: ctx.k.ink,
      margin: [0, 12, 0, 12],
      valign: "middle",
      fit: "shrink",
    });
    text(ctx, "→", { x: MARGIN + w, y, w: 0.9, h: 0.78 }, 24, {
      bold: true,
      color: ctx.k.brand,
      align: "center",
      valign: "middle",
    });
    ctx.slide.addText(r.to, {
      x: MARGIN + w + 0.9,
      y,
      w,
      h: 0.78,
      shape: ctx.pptx.ShapeType.roundRect,
      rectRadius: 0.1,
      fill: { color: ctx.k.deep },
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: "FFFFFF",
      margin: [0, 12, 0, 12],
      valign: "middle",
      fit: "shrink",
    });
  });
}

export function actionsSlide(ctx: Ctx, s: Of<"actions">, words: DeckWords) {
  kicker(ctx, `${words.count(s.total, "actions")}${s.continued ? ` · ${words.continued}` : ""}`);
  title(ctx, words.agreed);
  const cols = s.rows.length <= 3 ? s.rows.length : 2;
  const rows = Math.ceil(s.rows.length / cols);
  const gap = 0.3;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  const h = Math.min(1.8, (4.9 - gap * (rows - 1)) / rows);
  s.rows.forEach((r, i) => {
    const x = MARGIN + (i % cols) * (w + gap);
    const y = 2.0 + Math.floor(i / cols) * (h + gap);
    card(ctx, { x, y, w, h }, { colour: ctx.k.good, side: "left" });
    text(ctx, "✓", { x: x + 0.25, y: y + 0.2, w: 0.4, h: 0.4 }, 18, {
      bold: true,
      color: ctx.k.good,
    });
    text(ctx, r.what, { x: x + 0.75, y: y + 0.2, w: w - 1, h: h - 0.75 }, 15, { bold: true });
    text(
      ctx,
      `${words.who}: ${r.who || "–"}    ${words.when}: ${r.when || "–"}`,
      { x: x + 0.75, y: y + h - 0.5, w: w - 1, h: 0.35 },
      11,
      { color: ctx.k.muted },
    );
  });
}
