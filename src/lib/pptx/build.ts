import PptxGenJS from "pptxgenjs";
import type { DeckNote, Slide } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import { addDiagram } from "./diagram";
import { COLOURS, FONT, H, MARGIN, NOTE_EDGE, NOTE_FILL, W } from "./style";

/**
 * The same slides as the HTML deck, as a PowerPoint file to keep working
 * in: real text boxes, tables and shapes, not pictures of slides, so every
 * word can be changed in PowerPoint. Built from the same slide list
 * (src/domain/deck.ts), so the two never disagree. No images go in: the
 * photos are gone by then, and the drawings are redrawn as shapes.
 */

const CONTENT_W = W - MARGIN * 2;

function heading(slide: PptxGenJS.Slide, text: string, sub?: string) {
  slide.addText(
    [
      { text, options: { bold: true, fontSize: 28, color: COLOURS.ink } },
      ...(sub ? [{ text: `  ·  ${sub}`, options: { fontSize: 16, color: COLOURS.slate } }] : []),
    ],
    { x: MARGIN, y: 0.45, w: CONTENT_W, h: 0.8, fontFace: FONT, valign: "middle", margin: 0 },
  );
}

function pageNumber(slide: PptxGenJS.Slide, words: DeckWords, n: number, total: number) {
  slide.addText(words.page(n, total), {
    x: W - 1.6,
    y: H - 0.5,
    w: 1.2,
    h: 0.3,
    align: "right",
    fontFace: FONT,
    fontSize: 9,
    color: COLOURS.slate,
  });
}

function bullets(items: string[], size = 18) {
  return items.map((text) => ({
    text,
    options: { bullet: { indent: 18 }, fontSize: size, color: COLOURS.ink, paraSpaceAfter: 8 },
  }));
}

function postIt(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  note: DeckNote,
  x: number,
  y: number,
  size: number,
) {
  slide.addText(note.text, {
    x,
    y,
    w: size,
    h: size,
    shape: pptx.ShapeType.rect,
    fill: { color: NOTE_FILL[note.colour] },
    line: { color: NOTE_EDGE[note.colour], width: 0.75 },
    fontFace: FONT,
    fontSize: 10,
    color: COLOURS.ink,
    align: "center",
    valign: "middle",
    fit: "shrink",
  });
  if ((note.votes ?? 0) > 0) {
    const votes = note.votes ?? 0;
    slide.addText(votes <= 5 ? "●".repeat(votes) : `● ${votes}`, {
      x: x + size * 0.35,
      y,
      w: size * 0.62,
      h: 0.25,
      align: "right",
      fontFace: FONT,
      fontSize: 8,
      color: COLOURS.bronzeDeep,
    });
  }
}

export async function buildPptx(input: {
  slides: Slide[];
  words: DeckWords;
  title: string;
}): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = input.title;
  pptx.company = "";
  const { words, slides } = input;
  const sub = (continued: boolean) => (continued ? words.continued : undefined);

  slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: COLOURS.white };
    switch (s.kind) {
      case "title":
        slide.addShape(pptx.ShapeType.rect, {
          x: MARGIN,
          y: 4.2,
          w: 0.8,
          h: 0.05,
          fill: { color: COLOURS.bronze },
          line: { color: COLOURS.bronze },
        });
        slide.addText(s.title, {
          x: MARGIN,
          y: 4.4,
          w: CONTENT_W,
          h: 1.2,
          fontFace: FONT,
          fontSize: 44,
          bold: true,
          color: COLOURS.ink,
          margin: 0,
        });
        slide.addText(s.date, {
          x: MARGIN,
          y: 5.6,
          w: CONTENT_W,
          h: 0.5,
          fontFace: FONT,
          fontSize: 18,
          color: COLOURS.slate,
          margin: 0,
        });
        break;
      case "overview": {
        heading(slide, words.overview);
        if (s.summary) {
          slide.addText(s.summary, {
            x: MARGIN,
            y: 1.35,
            w: CONTENT_W * 0.88,
            h: 1.4,
            fontFace: FONT,
            fontSize: 16,
            color: COLOURS.ink,
            valign: "top",
            margin: 0,
            fit: "shrink",
          });
        }
        const next = [...s.agreed.map((t) => `✓ ${t}`), ...s.open.map((t) => `? ${t}`)];
        const columns = (
          [
            [words.found, s.found],
            [words.recommend, s.recommend],
            [words.nextSteps, next],
          ] as [string, string[]][]
        ).filter(([, items]) => items.length > 0);
        const colW = CONTENT_W / Math.max(1, columns.length);
        slide.addShape(pptx.ShapeType.line, {
          x: MARGIN,
          y: 3,
          w: CONTENT_W,
          h: 0,
          line: { color: COLOURS.hairline, width: 0.75 },
        });
        columns.forEach(([title, items], c) => {
          slide.addText(
            [
              {
                text: title.toUpperCase(),
                options: {
                  fontSize: 10,
                  bold: true,
                  color: COLOURS.slate,
                  paraSpaceAfter: 10,
                  charSpacing: 1,
                },
              },
              ...items.map((t) => ({
                text: t,
                options: { fontSize: 14, color: COLOURS.ink, paraSpaceAfter: 6, breakLine: true },
              })),
            ],
            {
              x: MARGIN + c * colW,
              y: 3.2,
              w: colW - 0.3,
              h: 3.4,
              fontFace: FONT,
              valign: "top",
              margin: 0,
            },
          );
        });
        break;
      }
      case "votes": {
        heading(slide, words.votes, words.votesTotal(s.total));
        const most = Math.max(...s.notes.map((n) => n.votes ?? 0), 1);
        s.notes.forEach((n, r) => {
          const y = 1.5 + r * 0.62;
          slide.addText(n.text, {
            x: MARGIN,
            y,
            w: 6.4,
            h: 0.45,
            fontFace: FONT,
            fontSize: 14,
            color: COLOURS.ink,
            valign: "middle",
            fit: "shrink",
            margin: 0,
          });
          slide.addShape(pptx.ShapeType.rect, {
            x: 7.4,
            y: y + 0.12,
            w: 4.4,
            h: 0.22,
            fill: { color: COLOURS.sand },
            line: { color: COLOURS.sand },
          });
          slide.addShape(pptx.ShapeType.rect, {
            x: 7.4,
            y: y + 0.12,
            w: Math.max(0.05, (4.4 * (n.votes ?? 0)) / most),
            h: 0.22,
            fill: { color: NOTE_EDGE[n.colour] },
            line: { color: NOTE_EDGE[n.colour] },
          });
          slide.addText(String(n.votes ?? 0), {
            x: 11.9,
            y,
            w: 0.7,
            h: 0.45,
            align: "right",
            fontFace: FONT,
            fontSize: 14,
            bold: true,
            color: COLOURS.ink,
            margin: 0,
          });
        });
        break;
      }
      case "theme": {
        heading(slide, `${s.number}  ${s.title}`, sub(s.continued));
        const left = s.notes.length > 0 ? 6.6 : CONTENT_W;
        const body = [
          ...(s.summary
            ? [
                {
                  text: s.summary,
                  options: { fontSize: 15, color: COLOURS.slate, paraSpaceAfter: 14 },
                },
              ]
            : []),
          ...bullets(s.points.map((p) => p.text)),
        ];
        if (body.length > 0) {
          slide.addText(body, {
            x: MARGIN,
            y: 1.4,
            w: left,
            h: 5.4,
            fontFace: FONT,
            valign: "top",
            margin: 0,
            fit: "shrink",
          });
        }
        const columns = s.notes.length > 8 ? 4 : 3;
        const size = Math.min(
          1.45,
          (W - MARGIN - (MARGIN + left + 0.4) - (columns - 1) * 0.15) / columns,
        );
        s.notes.forEach((n, k) => {
          const x = MARGIN + left + 0.4 + (k % columns) * (size + 0.15);
          const y = 1.45 + Math.floor(k / columns) * (size + 0.15);
          postIt(slide, pptx, n, x, y, size);
        });
        if (s.moreNotes > 0) {
          slide.addText(words.more(s.moreNotes), {
            x: MARGIN + left + 0.4,
            y: H - 0.9,
            w: 4,
            h: 0.3,
            fontFace: FONT,
            fontSize: 10,
            color: COLOURS.slate,
            margin: 0,
          });
        }
        break;
      }
      case "diagram":
        heading(slide, s.title || words.drawing(s.photo));
        addDiagram(slide, pptx, s.diagram, s, { x: MARGIN, y: 1.4, w: CONTENT_W, h: H - 2.1 });
        break;
      case "list":
        heading(
          slide,
          s.heading === "patterns"
            ? words.patterns
            : s.heading === "recommendations"
              ? words.recommendations
              : words.open,
          sub(s.continued),
        );
        slide.addText(
          bullets(
            s.items.map((item) => item.text),
            20,
          ),
          {
            x: MARGIN,
            y: 1.4,
            w: CONTENT_W,
            h: 5.4,
            fontFace: FONT,
            valign: "top",
            margin: 0,
            fit: "shrink",
          },
        );
        break;
      case "actions": {
        heading(slide, words.agreed, sub(s.continued));
        const head = { bold: true, fontSize: 10, color: COLOURS.slate, fontFace: FONT };
        const cell = { fontSize: 14, color: COLOURS.ink, fontFace: FONT };
        slide.addTable(
          [
            [
              { text: words.what.toUpperCase(), options: head },
              { text: words.who.toUpperCase(), options: head },
              { text: words.when.toUpperCase(), options: head },
            ],
            ...s.rows.map((r) => [
              { text: r.what, options: cell },
              { text: r.who || "–", options: { ...cell, color: COLOURS.slate } },
              { text: r.when || "–", options: { ...cell, color: COLOURS.slate } },
            ]),
          ],
          {
            x: MARGIN,
            y: 1.45,
            w: CONTENT_W,
            colW: [CONTENT_W * 0.58, CONTENT_W * 0.22, CONTENT_W * 0.2],
            border: { type: "solid", pt: 0.75, color: COLOURS.hairline },
            margin: 0.08,
          },
        );
        break;
      }
      case "transcript": {
        heading(slide, words.transcript, sub(s.continued));
        const runs = s.groups.flatMap((g) => [
          {
            text: words.photo(g.photo),
            options: { bold: true, fontSize: 10, color: COLOURS.slate, breakLine: true },
          },
          ...g.notes.map((n) => ({
            text: n.text,
            options: { fontSize: 10, color: COLOURS.ink, bullet: true, breakLine: true },
          })),
        ]);
        const third = Math.ceil(runs.length / 3);
        [0, 1, 2].forEach((c) => {
          const part = runs.slice(c * third, (c + 1) * third);
          if (part.length === 0) return;
          slide.addText(part, {
            x: MARGIN + c * (CONTENT_W / 3),
            y: 1.4,
            w: CONTENT_W / 3 - 0.25,
            h: 5.5,
            fontFace: FONT,
            valign: "top",
            margin: 0,
            fit: "shrink",
          });
        });
        break;
      }
    }
    pageNumber(slide, words, i + 1, slides.length);
  });

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
