"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createWorkshop, deleteWorkshop, renameWorkshop } from "@/services/workshops";
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
