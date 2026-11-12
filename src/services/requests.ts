import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { users } from "@/db/schema";
import { limits } from "@/domain/limits";
import { NotAdmin, NotFound } from "./errors";

/**
 * "Bed om mere": an account that has used its photos asks for more, with
 * a line on why, and the operator says yes or no from a list in the app.
 * Yes raises the account's allowance; no clears the request. A demo visit
 * cannot ask: it is gone in a day anyway. Only an account marked as admin
 * in the database sees or answers the list.
 */

async function requireAdmin(db: Db, adminId: string) {
  const [row] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, adminId));
  if (!row?.isAdmin) throw new NotAdmin();
}

export async function requestMore(
  db: Db,
  userId: string,
  note: string,
  now = Date.now(),
): Promise<void> {
  const updated = await db
    .update(users)
    .set({ moreRequestedAt: now, moreRequestNote: note.trim().slice(0, 500) })
    .where(and(eq(users.id, userId), isNull(users.demoExpiresAt)))
    .returning({ id: users.id });
  if (updated.length === 0) throw new NotFound();
}

export type MoreRequest = {
  id: string;
  email: string;
  name: string;
  photosRead: number;
  photoAllowance: number;
  note: string;
  requestedAt: number;
};

export async function listRequests(db: Db, adminId: string): Promise<MoreRequest[]> {
  await requireAdmin(db, adminId);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      photosRead: users.photosRead,
      photoAllowance: users.photoAllowance,
      note: users.moreRequestNote,
      requestedAt: users.moreRequestedAt,
    })
    .from(users)
    .where(isNotNull(users.moreRequestedAt))
    .orderBy(asc(users.moreRequestedAt));
  return rows.map((r) => ({ ...r, requestedAt: r.requestedAt ?? 0 }));
}

export async function countRequests(db: Db): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(isNotNull(users.moreRequestedAt));
  return rows.length;
}

/** Yes: the account may have the approved number read in all; the request is answered. */
export async function approveRequest(
  db: Db,
  adminId: string,
  userId: string,
  allowance = limits().approvedAllowance,
): Promise<void> {
  await requireAdmin(db, adminId);
  const [row] = await db
    .select({ allowance: users.photoAllowance })
    .from(users)
    .where(and(eq(users.id, userId), isNotNull(users.moreRequestedAt)));
  if (!row) throw new NotFound();
  await db
    .update(users)
    .set({
      photoAllowance: Math.max(row.allowance, allowance),
      moreRequestedAt: null,
      moreRequestNote: "",
    })
    .where(eq(users.id, userId));
}

/** No: the request is answered, the allowance stays. The account may ask again. */
export async function declineRequest(db: Db, adminId: string, userId: string): Promise<void> {
  await requireAdmin(db, adminId);
  const done = await db
    .update(users)
    .set({ moreRequestedAt: null, moreRequestNote: "" })
    .where(and(eq(users.id, userId), isNotNull(users.moreRequestedAt)))
    .returning({ id: users.id });
  if (done.length === 0) throw new NotFound();
}
