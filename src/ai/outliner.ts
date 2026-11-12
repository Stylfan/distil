import {
  outlineForModel,
  parseOutline,
  notesForModel,
  type NoteForOutline,
} from "@/domain/outline-reading";
import type { Outline } from "@/domain/outline";
import { ReadError } from "./errors";
import { mistralFromEnv, mistralJson, type MistralOptions } from "./mistral-chat";
import { MAKE_OUTLINE_PROMPT, REVISE_OUTLINE_PROMPT } from "./outline-prompt";

/**
 * The model's side of the outline: make one from the notes, or change one
 * as the facilitator asks. Only the notes' text, colour and kind go out,
 * as numbered lines; never a photo, a name of an account or a workshop.
 */
export type Outliner = {
  make(notes: NoteForOutline[], answers: { question: string; answer: string }[]): Promise<Outline>;
  revise(outline: Outline, request: string, notes: NoteForOutline[]): Promise<Outline>;
};

function answersText(answers: { question: string; answer: string }[]): string {
  if (answers.length === 0) return "";
  return `\n\nThe facilitator's answers to earlier questions:\n${answers
    .map((a) => `- ${a.question} → ${a.answer}`)
    .join("\n")}`;
}

export function mistralOutliner(options: MistralOptions): Outliner {
  return {
    async make(notes, answers) {
      const { lines, toId } = notesForModel(notes);
      const answer = await mistralJson(options, [
        { role: "system", content: MAKE_OUTLINE_PROMPT },
        { role: "user", content: `The notes:\n${lines}${answersText(answers)}` },
      ]);
      const outline = parseOutline(answer, toId);
      if (!outline) throw new ReadError("unreadable");
      return outline;
    },
    async revise(current, request, notes) {
      const { lines, toId } = notesForModel(notes);
      const answers = current.questions
        .filter((q) => q.answer)
        .map((q) => ({ question: q.text, answer: q.answer! }));
      const answer = await mistralJson(options, [
        { role: "system", content: REVISE_OUTLINE_PROMPT },
        {
          role: "user",
          content: `The notes:\n${lines}${answersText(answers)}\n\nThe outline now:\n${JSON.stringify(
            outlineForModel(current, toId),
          )}\n\nThe facilitator's request:\n${request}`,
        },
      ]);
      const outline = parseOutline(answer, toId, current);
      if (!outline) throw new ReadError("unreadable");
      return outline;
    },
  };
}

/**
 * A stand-in without a key (DISTIL_READER=fake): themes by colour, the
 * headings as their names, and one question, so the whole flow can be
 * tried. Obviously not a real reading of anything.
 */
export const fakeOutliner: Outliner = {
  async make(notes, answers) {
    const byColour = new Map<string, NoteForOutline[]>();
    for (const n of notes.filter((n) => n.kind === "note")) {
      byColour.set(n.colour, [...(byColour.get(n.colour) ?? []), n]);
    }
    const themes = [...byColour.values()].map((group, i) => ({
      id: `t${i + 1}`,
      title: group[0]!.text.split(" ").slice(0, 3).join(" "),
      summary: `${group.length} sedler om det samme.`,
      points: group.map((n) => n.text),
      noteIds: group.map((n) => n.id),
    }));
    return {
      summary:
        "Et opdigtet resumé: deltagerne talte om onboarding og om værktøjer, der overlapper.",
      themes,
      patterns: [
        { id: "p1", text: "Det samme problem dukker op i flere temaer: for meget på én gang." },
      ],
      recommendations: [
        { id: "r1", text: "Saml værktøjerne i én liste til nye medarbejdere.", kept: false },
      ],
      actions: [{ id: "a1", what: "Indfør en makkerordning", who: "", when: "", noteIds: [] }],
      openPoints: [{ id: "o1", text: "Hvem ejer intranettet?", noteIds: [] }],
      questions: answers.some((a) => a.question.startsWith("Var makkerordningen"))
        ? []
        : [
            {
              id: "q1",
              text: "Var makkerordningen aftalt, eller kun et forslag?",
              options: ["Aftalt", "Kun et forslag"],
              answer: null,
            },
          ],
    };
  },
  async revise(current, request) {
    return { ...current, summary: `${current.summary} (Ændret: ${request})` };
  },
};

export function getOutliner(env: NodeJS.ProcessEnv = process.env): Outliner {
  if (env.DISTIL_READER === "fake") return fakeOutliner;
  const options = mistralFromEnv(env);
  if (!options) {
    const refuse = () => Promise.reject(new ReadError("notConfigured"));
    return { make: refuse, revise: refuse };
  }
  return mistralOutliner(options);
}
