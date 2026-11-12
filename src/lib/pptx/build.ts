import PptxGenJS from "pptxgenjs";
import type { Slide } from "@/domain/deck";
import type { DeckWords } from "@/domain/deck-words";
import { DEFAULT_LOOK, type Look } from "@/domain/story";
import { addDiagram } from "./diagram";
import { CONTENT_W, coloursOf, kicker, motif, title, type Ctx } from "./parts";
import {
  listSlide,
  actionsSlide,
  shiftsSlide,
  summarySlide,
  themeMapSlide,
  themeSlide,
  votesSlide,
} from "./slides";
import { FONT, H, MARGIN, W } from "./style";

/**
 * The same slides as the HTML deck, as a PowerPoint file to keep working
 * in: real text boxes and shapes in the deck's colour theme, not pictures
 * of slides, so every word can be changed in PowerPoint. Built from the
 * same slide list (src/domain/deck.ts), so the two never disagree. No
 * images go in: the photos are gone by then, and the drawings are
 * redrawn as shapes.
 */

function footer(
  { slide, k }: Ctx,
  words: DeckWords,
  text: string,
  n: number,
  total: number,
  dark: boolean,
) {
  const color = dark ? "C9D2DE" : k.muted;
  slide.addText(text, {
    x: MARGIN,
    y: H - 0.45,
    w: CONTENT_W - 1.4,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color,
    margin: 0,
  });
  slide.addText(words.page(n, total), {
    x: W - MARGIN - 1.2,
    y: H - 0.45,
    w: 1.2,
    h: 0.3,
    align: "right",
    fontFace: FONT,
    fontSize: 9,
    color,
    margin: 0,
  });
}

function big(
  ctx: Ctx,
  text: string,
  y: number,
  size: number,
  color: string,
  align: "left" | "right" = "left",
) {
  ctx.slide.addText(text, {
    x: MARGIN,
    y,
    w: align === "right" ? CONTENT_W : CONTENT_W * 0.62,
    h: size / 30,
    fontFace: FONT,
    fontSize: size,
    bold: true,
    color,
    align,
    valign: "top",
    margin: 0,
    fit: "shrink",
  });
}

export async function buildPptx(input: {
  slides: Slide[];
  words: DeckWords;
  title: string;
  footer?: string;
  look?: Look;
}): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = input.title;
  pptx.company = "";
  const { words, slides } = input;
  const k = coloursOf(input.look ?? DEFAULT_LOOK);

  slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    const ctx: Ctx = { pptx, slide, k };
    let dark = false;
    slide.background = { color: k.paper };
    switch (s.kind) {
      case "cover":
        dark = true;
        slide.background = { color: k.brand };
        motif(ctx, "right", k.deep);
        kicker({ ...ctx }, words.coverKicker, true);
        big(ctx, s.title, 3.4, 44, "FFFFFF");
        if (s.tagline) {
          slide.addText(s.tagline, {
            x: MARGIN,
            y: 5.0,
            w: CONTENT_W * 0.6,
            h: 0.8,
            fontFace: FONT,
            fontSize: 18,
            color: "E8ECF5",
            margin: 0,
          });
        }
        break;
      case "section":
        dark = true;
        slide.background = { color: k.deep };
        motif(ctx, "right", k.brand);
        big(ctx, String(s.number).padStart(2, "0"), 1.9, 80, k.accent);
        big(ctx, words.chapters[s.chapter], 3.5, 44, "FFFFFF");
        slide.addText(words.facts(s.facts, s.chapter), {
          x: MARGIN,
          y: 4.6,
          w: CONTENT_W * 0.6,
          h: 0.5,
          fontFace: FONT,
          fontSize: 16,
          color: "C9D2DE",
          margin: 0,
        });
        break;
      case "quote":
        kicker(ctx, words.quoteKicker);
        big(ctx, "“", 1.0, 96, k.brand);
        slide.addText(s.note.text, {
          x: MARGIN,
          y: 2.3,
          w: CONTENT_W * 0.85,
          h: 2.8,
          fontFace: FONT,
          fontSize: 32,
          bold: true,
          color: k.ink,
          valign: "top",
          margin: 0,
          fit: "shrink",
        });
        slide.addText(words.photo(s.note.photo), {
          x: MARGIN,
          y: 5.3,
          w: 4,
          h: 0.4,
          fontFace: FONT,
          fontSize: 13,
          color: k.muted,
          margin: 0,
        });
        break;
      case "closing":
        dark = true;
        slide.background = { color: k.brand };
        motif(ctx, "left", k.deep);
        big(ctx, s.line || words.closing, 2.8, 40, "FFFFFF", "right");
        slide.addText(s.title, {
          x: MARGIN,
          y: 4.4,
          w: CONTENT_W,
          h: 0.5,
          fontFace: FONT,
          fontSize: 16,
          color: "E8ECF5",
          align: "right",
          margin: 0,
        });
        break;
      case "summary":
        summarySlide(ctx, s, words);
        break;
      case "themeMap":
        themeMapSlide(ctx, s, words);
        break;
      case "theme":
        themeSlide(ctx, s, words);
        break;
      case "votes":
        votesSlide(ctx, s, words);
        break;
      case "list":
        listSlide(ctx, s, words);
        break;
      case "shifts":
        shiftsSlide(ctx, s, words);
        break;
      case "actions":
        actionsSlide(ctx, s, words);
        break;
      case "diagram":
        kicker(ctx, words.photo(s.photo));
        title(ctx, s.title || words.drawing(s.photo));
        addDiagram(slide, pptx, s.diagram, s, { x: MARGIN, y: 1.8, w: CONTENT_W, h: H - 2.5 });
        break;
      case "transcript": {
        title(ctx, words.transcript + (s.continued ? ` · ${words.continued}` : ""), 22);
        const runs = s.groups.flatMap((g) => [
          {
            text: words.photo(g.photo),
            options: { bold: true, fontSize: 10, color: k.muted, breakLine: true },
          },
          ...g.notes.map((n) => ({
            text: n.text,
            options: { fontSize: 10, color: k.ink, bullet: true, breakLine: true },
          })),
        ]);
        const third = Math.ceil(runs.length / 3);
        [0, 1, 2].forEach((c) => {
          const part = runs.slice(c * third, (c + 1) * third);
          if (part.length === 0) return;
          slide.addText(part, {
            x: MARGIN + c * (CONTENT_W / 3),
            y: 1.6,
            w: CONTENT_W / 3 - 0.25,
            h: 5.3,
            fontFace: FONT,
            valign: "top",
            margin: 0,
            fit: "shrink",
          });
        });
        break;
      }
    }
    footer(ctx, words, input.footer ?? input.title, i + 1, slides.length, dark);
  });

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
