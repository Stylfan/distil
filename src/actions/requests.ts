"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { approveRequest, declineRequest, requestMore } from "@/services/requests";
import { run, type Result } from "./result";

export async function requestMoreAction(note: string): Promise<Result> {
  const result = await run(z.string().max(500), note, async (db, userId, n) => {
    await requestMore(db, userId, n);
    return undefined;
  });
  if (result.ok) revalidatePath("/");
  return result;
}

const answer = z.object({ userId: z.string().min(1), approve: z.boolean() });

/** The operator's answer. Anyone not marked as admin gets "unauthorized", whatever they send. */
export async function answerRequestAction(input: z.infer<typeof answer>): Promise<Result> {
  const result = await run(answer, input, async (db, adminId, d) => {
    if (d.approve) await approveRequest(db, adminId, d.userId);
    else await declineRequest(db, adminId, d.userId);
    return undefined;
  });
  if (result.ok) revalidatePath("/admin");
  return result;
}
