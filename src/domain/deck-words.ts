/**
 * The few words a presentation says by itself (headings, "who", "when"),
 * in the language the notes were written in. These are content, not the
 * app's interface: a workshop held in English gets an English deck while
 * Distil itself stays Danish.
 */

import type { Facts } from "./deck";

export type DeckLanguage = "da" | "en";

export type DeckWords = {
  overview: string;
  found: string;
  recommend: string;
  nextSteps: string;
  patterns: string;
  recommendations: string;
  agreed: string;
  open: string;
  what: string;
  who: string;
  when: string;
  transcript: string;
  photo: (n: number) => string;
  drawing: (n: number) => string;
  votes: string;
  votesTotal: (n: number) => string;
  continued: string;
  more: (n: number) => string;
  notes: (n: number) => string;
  page: (n: number, of: number) => string;
  coverKicker: string;
  summaryKicker: string;
  soWhat: string;
  chapters: Record<"found" | "means" | "do", string>;
  facts: (f: Facts, chapter: "found" | "means" | "do") => string;
  /** The small heading over a list: how many there are, e.g. "4 mønstre". */
  count: (n: number, kind: "patterns" | "recommendations" | "open" | "actions") => string;
  mapKicker: string;
  mapHeadline: (themes: number, largest: string) => string;
  theme: (n: number) => string;
  fromWall: string;
  quoteKicker: string;
  quoteSwap: string;
  quoteNone: string;
  shifts: string;
  today: string;
  ahead: string;
  suggestion: string;
  insight: (n: number) => string;
  closing: string;
};

export const DECK_WORDS: Record<DeckLanguage, DeckWords> = {
  da: {
    overview: "Workshoppen på én side",
    found: "Det fandt vi",
    recommend: "Det anbefaler vi",
    nextSteps: "Næste skridt",
    patterns: "Mønstre på tværs",
    recommendations: "Anbefalinger",
    agreed: "Det aftalte vi",
    open: "Det udestår",
    what: "Hvad",
    who: "Hvem",
    when: "Hvornår",
    transcript: "Bilag: alle sedler ordret",
    photo: (n) => `Billede ${n}`,
    drawing: (n) => `Tegning fra billede ${n}`,
    votes: "Det stemte deltagerne på",
    votesTotal: (n) => (n === 1 ? "1 prik i alt" : `${n} prikker i alt`),
    continued: "fortsat",
    more: (n) => `+ ${n} flere`,
    notes: (n) => (n === 1 ? "1 seddel" : `${n} sedler`),
    page: (n, of) => `${n} / ${of}`,
    coverKicker: "Opsamling fra workshoppen",
    summaryKicker: "Sammenfatning",
    soWhat: "Så hvad?",
    chapters: { found: "Det fandt vi", means: "Det betyder det", do: "Det gør vi nu" },
    facts: (f, c) =>
      c === "found"
        ? [
            f.of ? `${f.notes} af ${f.of.notes} sedler` : `${f.notes} sedler`,
            f.of ? `${f.themes} af ${f.of.themes} temaer` : `${f.themes} temaer`,
            f.photos === 1 ? "1 billede" : `${f.photos} billeder`,
          ].join(" · ")
        : c === "means"
          ? `${f.items} ${f.items === 1 ? "indsigt eller forslag" : "indsigter og forslag"}`
          : `${f.items} ${f.items === 1 ? "punkt" : "punkter"} at handle på`,
    count: (n, kind) =>
      ({
        patterns: n === 1 ? "1 mønster" : `${n} mønstre`,
        recommendations: n === 1 ? "1 forslag fra Distil" : `${n} forslag fra Distil`,
        open: n === 1 ? "1 spørgsmål til afklaring" : `${n} spørgsmål til afklaring`,
        actions: n === 1 ? "1 aftale" : `${n} aftaler`,
      })[kind],
    mapKicker: "Temalandskab",
    mapHeadline: (n, largest) => `${n} temaer bærer workshoppen – ${largest} fylder mest`,
    theme: (n) => `Tema ${n}`,
    fromWall: "Fra væggen",
    quoteKicker: "Med deltagernes egne ord",
    quoteSwap: "Brug en anden seddel:",
    quoteNone: "Intet citat",
    shifts: "Fra i dag til fremover",
    today: "I dag",
    ahead: "Fremover",
    suggestion: "Distils forslag",
    insight: (n) => `Indsigt ${n}`,
    closing: "Tak for en god workshop",
  },
  en: {
    overview: "The workshop on one page",
    found: "What we found",
    recommend: "What we recommend",
    nextSteps: "Next steps",
    patterns: "Patterns across",
    recommendations: "Recommendations",
    agreed: "What we agreed",
    open: "Still open",
    what: "What",
    who: "Who",
    when: "When",
    transcript: "Appendix: every note, word for word",
    photo: (n) => `Photo ${n}`,
    drawing: (n) => `Drawing from photo ${n}`,
    votes: "What the participants voted for",
    votesTotal: (n) => (n === 1 ? "1 dot in all" : `${n} dots in all`),
    continued: "continued",
    more: (n) => `+ ${n} more`,
    notes: (n) => (n === 1 ? "1 note" : `${n} notes`),
    page: (n, of) => `${n} / ${of}`,
    coverKicker: "Workshop summary",
    summaryKicker: "Executive summary",
    soWhat: "So what?",
    chapters: { found: "What we found", means: "What it means", do: "What we do now" },
    facts: (f, c) =>
      c === "found"
        ? [
            f.of ? `${f.notes} of ${f.of.notes} notes` : `${f.notes} notes`,
            f.of ? `${f.themes} of ${f.of.themes} themes` : `${f.themes} themes`,
            f.photos === 1 ? "1 photo" : `${f.photos} photos`,
          ].join(" · ")
        : c === "means"
          ? `${f.items} ${f.items === 1 ? "insight or proposal" : "insights and proposals"}`
          : `${f.items} ${f.items === 1 ? "item" : "items"} to act on`,
    count: (n, kind) =>
      ({
        patterns: n === 1 ? "1 pattern" : `${n} patterns`,
        recommendations: n === 1 ? "1 proposal from Distil" : `${n} proposals from Distil`,
        open: n === 1 ? "1 question to settle" : `${n} questions to settle`,
        actions: n === 1 ? "1 agreement" : `${n} agreements`,
      })[kind],
    mapKicker: "Theme landscape",
    mapHeadline: (n, largest) => `${n} themes carry the workshop – ${largest} weighs most`,
    theme: (n) => `Theme ${n}`,
    fromWall: "From the wall",
    quoteKicker: "In the participants’ own words",
    quoteSwap: "Use another note:",
    quoteNone: "No quote",
    shifts: "From today to tomorrow",
    today: "Today",
    ahead: "Going forward",
    suggestion: "Distil’s suggestion",
    insight: (n) => `Insight ${n}`,
    closing: "Thank you for a good workshop",
  },
};

const DANISH = /[æøå]|\b(og|er|det|ikke|til|på|med|vi|skal|hvem|hvad|har|en|et)\b/gi;
const ENGLISH = /\b(the|and|is|are|not|to|we|should|who|what|have|with|of)\b/gi;

/** Danish unless the notes are clearly English. */
export function detectLanguage(texts: string[]): DeckLanguage {
  const all = texts.join(" ");
  const da = all.match(DANISH)?.length ?? 0;
  const en = all.match(ENGLISH)?.length ?? 0;
  return en > da * 1.5 && en >= 3 ? "en" : "da";
}
