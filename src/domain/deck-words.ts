/**
 * The few words a presentation says by itself (headings, "who", "when"),
 * in the language the notes were written in. These are content, not the
 * app's interface: a workshop held in English gets an English deck while
 * Distil itself stays Danish.
 */

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
  continued: string;
  more: (n: number) => string;
  notes: (n: number) => string;
  page: (n: number, of: number) => string;
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
    continued: "fortsat",
    more: (n) => `+ ${n} flere`,
    notes: (n) => (n === 1 ? "1 seddel" : `${n} sedler`),
    page: (n, of) => `${n} / ${of}`,
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
    continued: "continued",
    more: (n) => `+ ${n} more`,
    notes: (n) => (n === 1 ? "1 note" : `${n} notes`),
    page: (n, of) => `${n} / ${of}`,
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
