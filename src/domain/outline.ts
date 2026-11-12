import { z } from "zod";

/**
 * The outline of a workshop: what Distil makes of all its notes, and what
 * the facilitator then shapes into the presentation. One document per
 * workshop, edited as a whole and checked against this schema every time
 * it is saved, whether a person or the model wrote it.
 *
 * Distil's own contributions are marked: patterns and recommendations are
 * its interpretation, and a recommendation stays a proposal until the
 * facilitator keeps it.
 */

const id = z.string().min(1).max(40);
const line = z.string().trim().max(600);
const noteIds = z.array(z.string().min(1).max(64)).max(200);

export const themeSchema = z.object({
  id,
  title: line,
  summary: z.string().trim().max(1500),
  points: z.array(line).max(30),
  noteIds,
});

export const outlineSchema = z.object({
  /** Three to five lines on what the workshop came to. */
  summary: z.string().trim().max(2000),
  themes: z.array(themeSchema).max(20),
  /** Patterns across the themes, as Distil sees them. */
  patterns: z.array(z.object({ id, text: line })).max(15),
  /** Distil's recommendations; `kept` once the facilitator has accepted one. */
  recommendations: z.array(z.object({ id, text: line, kept: z.boolean() })).max(15),
  /** What was agreed: what, and who and when if it was written down. */
  actions: z
    .array(
      z.object({
        id,
        what: line,
        who: z.string().trim().max(120),
        when: z.string().trim().max(120),
        noteIds,
      }),
    )
    .max(40),
  /** What is still open and must be followed up. */
  openPoints: z.array(z.object({ id, text: line, noteIds })).max(40),
  /** Distil's questions to the facilitator, and the answers. */
  questions: z
    .array(
      z.object({
        id,
        text: line,
        options: z.array(z.string().trim().max(120)).max(4),
        answer: z.string().trim().max(600).nullable(),
      }),
    )
    .max(10),
});

export type Outline = z.infer<typeof outlineSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Question = Outline["questions"][number];

export const EMPTY_OUTLINE: Outline = {
  summary: "",
  themes: [],
  patterns: [],
  recommendations: [],
  actions: [],
  openPoints: [],
  questions: [],
};

/** A short id for a new part of the outline. */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Questions not answered yet. */
export function openQuestions(outline: Outline): Question[] {
  return outline.questions.filter((q) => q.answer === null || q.answer === "");
}

/**
 * The colour question, asked by a rule rather than the model: when the
 * notes come in two or more colours, the facilitator is asked whether the
 * colours meant something, because only they know.
 */
export const COLOUR_QUESTION_ID = "colours";

export function colourQuestion(
  colours: string[],
  words: { ask: (colours: string[]) => string; none: string },
): Question | null {
  const used = [...new Set(colours.filter((c) => c !== "none" && c !== "white"))];
  if (used.length < 2) return null;
  return { id: COLOUR_QUESTION_ID, text: words.ask(used), options: [words.none], answer: null };
}

/** Keeps the answers already given when a new outline replaces an old one. */
export function keepAnswers(next: Outline, previous: Outline | null): Outline {
  if (!previous) return next;
  const answered = new Map(
    previous.questions.filter((q) => q.answer).map((q) => [q.text.trim().toLowerCase(), q]),
  );
  const byId = new Map(previous.questions.filter((q) => q.answer).map((q) => [q.id, q]));
  const used = new Set<string>();
  const questions = next.questions.map((q) => {
    const old = byId.get(q.id) ?? answered.get(q.text.trim().toLowerCase());
    if (!old) return q;
    used.add(old.id);
    return { ...q, answer: old.answer };
  });
  // An answered question the model did not ask again stays, so the answer is still seen.
  const kept = previous.questions.filter(
    (q) => q.answer && !used.has(q.id) && !questions.some((n) => n.id === q.id),
  );
  return { ...next, questions: [...questions, ...kept].slice(0, 10) };
}
