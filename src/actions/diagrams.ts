"use server";

import { z } from "zod";
import { diagramSchema } from "@/domain/diagram";
import { saveDiagram, setDiagramIncluded } from "@/services/diagrams";
import { run, type Result } from "./result";

const save = z.object({ photoId: z.string().min(1), content: diagramSchema });

export async function saveDiagramAction(input: z.infer<typeof save>): Promise<Result> {
  return run(save, input, async (db, userId, d) => {
    await saveDiagram(db, userId, d.photoId, d.content);
    return undefined;
  });
}

const include = z.object({ photoId: z.string().min(1), include: z.boolean() });

export async function setDiagramIncludedAction(input: z.infer<typeof include>): Promise<Result> {
  return run(include, input, async (db, userId, d) => {
    await setDiagramIncluded(db, userId, d.photoId, d.include);
    return undefined;
  });
}
