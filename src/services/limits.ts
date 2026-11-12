import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { usageDays, users } from "@/db/schema";
import { dayKey, limits, type Limits } from "@/domain/limits";
import { LimitReached } from "./errors";

/**
 * Counting photos against the account's allowance and the installation's
 * ceiling for the day. A photo is counted when its reading starts, in one
 * statement per counter, so two photos read at the same moment cannot
 * both slip past the last free place; a reading that fails gives the
 * place back.
 */

export async function reservePhoto(
  db: Db,
  userId: string,
  now = Date.now(),
  config: Limits = limits(),
): Promise<void> {
  const taken = await db
    .update(users)
    .set({ photosRead: sql`${users.photosRead} + 1` })
    .where(and(eq(users.id, userId), lt(users.photosRead, users.photoAllowance)))
    .returning({ id: users.id });
  if (taken.length === 0) throw new LimitReached("allowance");

  const day = dayKey(now);
  const counted = await db
    .insert(usageDays)
    .values({ day, photos: 1 })
    .onConflictDoUpdate({
      target: usageDays.day,
      set: { photos: sql`${usageDays.photos} + 1` },
      setWhere: lt(usageDays.photos, config.dailyCeiling),
    })
    .returning({ day: usageDays.day });
  if (counted.length === 0) {
    await givePlaceBack(db, userId, null);
    throw new LimitReached("daily");
  }
}

/** Undoes a reservation whose reading did not happen. */
export async function releasePhoto(db: Db, userId: string, now = Date.now()): Promise<void> {
  await givePlaceBack(db, userId, dayKey(now));
}

async function givePlaceBack(db: Db, userId: string, day: string | null) {
  await db
    .update(users)
    .set({ photosRead: sql`greatest(${users.photosRead} - 1, 0)` })
    .where(eq(users.id, userId));
  if (day) {
    await db
      .update(usageDays)
      .set({ photos: sql`greatest(${usageDays.photos} - 1, 0)` })
      .where(eq(usageDays.day, day));
  }
}

/** How many of the account's photos are left to read. */
export async function photosLeft(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ allowance: users.photoAllowance, read: users.photosRead })
    .from(users)
    .where(eq(users.id, userId));
  return row ? Math.max(0, row.allowance - row.read) : 0;
}

/**
 * Counts one outline Distil makes or changes, against the account's day
 * and the installation's day. Text is cheap next to photos, but a public
 * demo must still not be able to run it in a loop.
 */
export async function reserveOutline(
  db: Db,
  userId: string,
  now = Date.now(),
  config: Limits = limits(),
): Promise<void> {
  const day = dayKey(now);
  const taken = await db
    .update(users)
    .set({
      outlineDay: day,
      outlinesOnDay: sql`case when ${users.outlineDay} = ${day} then ${users.outlinesOnDay} + 1 else 1 end`,
    })
    .where(
      and(
        eq(users.id, userId),
        sql`(${users.outlineDay} is distinct from ${day} or ${users.outlinesOnDay} < ${config.outlinesPerAccount})`,
      ),
    )
    .returning({ id: users.id });
  if (taken.length === 0) throw new LimitReached("outlines");
  const counted = await db
    .insert(usageDays)
    .values({ day, outlines: 1 })
    .onConflictDoUpdate({
      target: usageDays.day,
      set: { outlines: sql`${usageDays.outlines} + 1` },
      setWhere: lt(usageDays.outlines, config.outlineCeiling),
    })
    .returning({ day: usageDays.day });
  if (counted.length === 0) {
    await releaseOutline(db, userId, now, false);
    throw new LimitReached("daily");
  }
}

/** Undoes a reservation whose outline did not come back. */
export async function releaseOutline(db: Db, userId: string, now = Date.now(), daily = true) {
  const day = dayKey(now);
  await db
    .update(users)
    .set({ outlinesOnDay: sql`greatest(${users.outlinesOnDay} - 1, 0)` })
    .where(and(eq(users.id, userId), eq(users.outlineDay, day)));
  if (daily) {
    await db
      .update(usageDays)
      .set({ outlines: sql`greatest(${usageDays.outlines} - 1, 0)` })
      .where(eq(usageDays.day, day));
  }
}

/**
 * Counts one recording turned into text, against the account's day and the
 * installation's day, so speaking instead of typing cannot run up the bill.
 */
export async function reserveDictation(
  db: Db,
  userId: string,
  now = Date.now(),
  config: Limits = limits(),
): Promise<void> {
  const day = dayKey(now);
  const taken = await db
    .update(users)
    .set({
      dictationDay: day,
      dictationsOnDay: sql`case when ${users.dictationDay} = ${day} then ${users.dictationsOnDay} + 1 else 1 end`,
    })
    .where(
      and(
        eq(users.id, userId),
        sql`(${users.dictationDay} is distinct from ${day} or ${users.dictationsOnDay} < ${config.dictationsPerAccount})`,
      ),
    )
    .returning({ id: users.id });
  if (taken.length === 0) throw new LimitReached("dictations");
  const counted = await db
    .insert(usageDays)
    .values({ day, dictations: 1 })
    .onConflictDoUpdate({
      target: usageDays.day,
      set: { dictations: sql`${usageDays.dictations} + 1` },
      setWhere: lt(usageDays.dictations, config.dictationCeiling),
    })
    .returning({ day: usageDays.day });
  if (counted.length === 0) {
    await releaseDictation(db, userId, now, false);
    throw new LimitReached("daily");
  }
}

/** Undoes a reservation whose text did not come back. */
export async function releaseDictation(db: Db, userId: string, now = Date.now(), daily = true) {
  const day = dayKey(now);
  await db
    .update(users)
    .set({ dictationsOnDay: sql`greatest(${users.dictationsOnDay} - 1, 0)` })
    .where(and(eq(users.id, userId), eq(users.dictationDay, day)));
  if (daily) {
    await db
      .update(usageDays)
      .set({ dictations: sql`greatest(${usageDays.dictations} - 1, 0)` })
      .where(eq(usageDays.day, day));
  }
}
