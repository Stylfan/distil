import type { z } from "zod";
import { currentUser } from "@/auth/session";
import { withUser, type Db } from "@/db/client";
import { Conflict, NotAdmin, NotFound } from "@/services/errors";

/** Every action answers with one of these; the page never sees a stack trace. */
export type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: "unauthorized" | "invalid" | "notFound" | "conflict" | "generic" };

/**
 * The shape of every server action: resolve the signed-in user, validate
 * the payload, run the service as that user against the app's database,
 * and turn failures into a word the page can render. Authorisation cannot
 * be forgotten in one action, because no action reaches a service any
 * other way. Details stay in the server log.
 */
export async function run<S extends z.ZodType, T>(
  schema: S,
  raw: unknown,
  fn: (db: Db, userId: string, input: z.infer<S>) => T | Promise<T>,
): Promise<Result<T>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    // The database knows who is acting, so row-level security applies to everything fn does.
    return {
      ok: true,
      data: await withUser(user.id, (tx) => Promise.resolve(fn(tx, user.id, parsed.data))),
    };
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: "notFound" };
    if (error instanceof Conflict) return { ok: false, error: "conflict" };
    if (error instanceof NotAdmin) return { ok: false, error: "unauthorized" };
    console.error("action failed", error);
    return { ok: false, error: "generic" };
  }
}
