import { getTranslations } from "next-intl/server";
import { ReadError } from "@/ai/errors";
import { getOutliner } from "@/ai/outliner";
import { withUser } from "@/db/client";
import { contextForModel } from "@/domain/context";
import { COLOUR_QUESTION_ID, colourQuestion, type Outline } from "@/domain/outline";
import type { NoteForOutline } from "@/domain/outline-reading";
import { LimitReached, NotFound, type LimitKind } from "@/services/errors";
import { releaseOutline, reserveOutline } from "@/services/limits";
import { getOutline, notesOfWorkshop, storeGenerated } from "@/services/outlines";
import { requireWorkshop } from "@/services/workshops";

/**
 * Making or changing a workshop's outline with the model, as the given
 * user, in three steps so no transaction is held open while the model
 * works: count it and gather the notes, ask the model, store the result
 * (or give the place back).
 */

export type OutlineOutcome =
  | { ok: true }
  | { ok: false; error: "notFound" | "generic" | "noNotes" | LimitKind | ReadError["code"] };

type Prepared = { notes: NoteForOutline[]; current: Outline | null; context: string };

async function prepare(userId: string, workshopId: string): Promise<Prepared | OutlineOutcome> {
  return withUser(userId, async (tx) => {
    const workshop = await requireWorkshop(tx, userId, workshopId);
    const notes = await notesOfWorkshop(tx, userId, workshopId);
    if (notes.length === 0) return { ok: false, error: "noNotes" } as const;
    try {
      await reserveOutline(tx, userId);
    } catch (error) {
      if (error instanceof LimitReached) return { ok: false, error: error.kind } as const;
      throw error;
    }
    const row = await getOutline(tx, userId, workshopId);
    return { notes, current: row?.content ?? null, context: contextForModel(workshop.context) };
  });
}

/** Adds the colour question when the notes come in several colours and it is not answered yet. */
async function withColourQuestion(
  outline: Outline,
  notes: NoteForOutline[],
  current: Outline | null,
) {
  const t = await getTranslations("outline");
  const tc = await getTranslations("colours");
  const asked = current?.questions.find((q) => q.id === COLOUR_QUESTION_ID);
  const question =
    asked ??
    colourQuestion(
      notes.map((n) => n.colour),
      {
        ask: (colours) => {
          const words = colours.map((c) => tc(c).toLowerCase());
          const list =
            words.length > 1
              ? `${words.slice(0, -1).join(", ")} ${t("and")} ${words.at(-1)}`
              : words[0]!;
          return t("colourQuestion", { colours: list });
        },
        none: t("colourNone"),
      },
    );
  if (!question) return outline;
  return {
    ...outline,
    questions: [question, ...outline.questions.filter((q) => q.id !== question.id)],
  };
}

export async function runOutline(
  userId: string,
  workshopId: string,
  request: string | null,
): Promise<OutlineOutcome> {
  try {
    const prepared = await prepare(userId, workshopId);
    if ("ok" in prepared) return prepared;
    const { notes, current, context } = prepared;
    try {
      const outliner = getOutliner();
      const answers = (current?.questions ?? [])
        .filter((q) => q.answer)
        .map((q) => ({ question: q.text, answer: q.answer! }));
      const made =
        request && current
          ? await outliner.revise(current, request, notes, context)
          : await outliner.make(notes, answers, context);
      const outline = await withColourQuestion(made, notes, current);
      await withUser(userId, (tx) => storeGenerated(tx, userId, workshopId, outline));
      return { ok: true };
    } catch (error) {
      await withUser(userId, (tx) => releaseOutline(tx, userId));
      if (error instanceof ReadError) return { ok: false, error: error.code };
      throw error;
    }
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: "notFound" };
    console.error("outline failed", error);
    return { ok: false, error: "generic" };
  }
}
