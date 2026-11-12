"use server";

import { z } from "zod";
import { outlineSchema } from "@/domain/outline";
import { answerQuestion, saveOutline, undoGenerated } from "@/services/outlines";
import { run, type Result } from "./result";

/** The facilitator's own changes to the outline; Distil's are in /api/workshops/[id]/outline. */

const save = z.object({
  workshopId: z.string().min(1),
  version: z.number().int().positive(),
  content: outlineSchema,
});

export async function saveOutlineAction(input: z.infer<typeof save>): Promise<Result<number>> {
  return run(save, input, (db, userId, d) =>
    saveOutline(db, userId, d.workshopId, d.content, d.version),
  );
}

const answer = z.object({
  workshopId: z.string().min(1),
  questionId: z.string().min(1).max(40),
  answer: z.string().max(600),
});

export async function answerQuestionAction(input: z.infer<typeof answer>): Promise<Result> {
  return run(answer, input, async (db, userId, d) => {
    await answerQuestion(db, userId, d.workshopId, d.questionId, d.answer);
    return undefined;
  });
}

export async function undoOutlineAction(workshopId: string): Promise<Result> {
  return run(z.string().min(1), workshopId, async (db, userId, id) => {
    await undoGenerated(db, userId, id);
    return undefined;
  });
}
