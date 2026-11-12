"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contextSchema } from "@/domain/context";
import { createWorkshop, deleteWorkshop, renameWorkshop, setContext } from "@/services/workshops";
import { run, type Result } from "./result";

const fields = z.object({
  name: z.string().trim().min(1).max(120),
  heldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createWorkshopAction(input: z.infer<typeof fields>): Promise<Result<string>> {
  const result = await run(fields, input, (db, userId, data) => createWorkshop(db, userId, data));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function renameWorkshopAction(
  input: z.infer<typeof fields> & { id: string },
): Promise<Result> {
  const result = await run(
    fields.extend({ id: z.string().min(1) }),
    input,
    async (db, userId, d) => {
      await renameWorkshop(db, userId, d.id, d);
      return undefined;
    },
  );
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteWorkshopAction(id: string): Promise<Result> {
  const result = await run(z.string().min(1), id, async (db, userId, workshopId) => {
    await deleteWorkshop(db, userId, workshopId);
    return undefined;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

const context = z.object({ id: z.string().min(1), context: contextSchema });

/** The context the facilitator gives Distil about the workshop. */
export async function setContextAction(input: z.infer<typeof context>): Promise<Result> {
  return run(context, input, async (db, userId, d) => {
    await setContext(db, userId, d.id, d.context);
    return undefined;
  });
}
