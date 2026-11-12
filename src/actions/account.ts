"use server";

import { z } from "zod";
import { currentUser, endSession } from "@/auth/session";
import { withUser } from "@/db/client";
import { deleteAccount } from "@/services/users";

/**
 * Leaving: the account, every programme it owns and their audit trail are
 * erased in one transaction. The person confirms by typing their own
 * e-mail address, so it cannot happen by a slip of the mouse.
 */

export type DeleteResult =
  { ok: true } | { ok: false; error: "unauthorized" | "mismatch" | "generic" };

const Schema = z.object({ email: z.string().trim().toLowerCase().max(200) });

export async function deleteAccountAction(raw: unknown): Promise<DeleteResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = Schema.safeParse(raw);
  if (!parsed.success || parsed.data.email !== user.email) return { ok: false, error: "mismatch" };
  try {
    await withUser(user.id, (tx) => deleteAccount(tx, user.id));
  } catch (error) {
    console.error("account deletion failed", error);
    return { ok: false, error: "generic" };
  }
  await endSession();
  return { ok: true };
}
