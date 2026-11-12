import { randomBytes } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { phoneLinks } from "@/db/schema";
import { tokenHash } from "./users";
import { requireWorkshop } from "./workshops";

/**
 * The bridge from a signed-in computer to a phone: a QR code holding a
 * link that lets the phone into one workshop, to add photos and answer
 * Distil's questions, for a couple of hours. Nobody has to type a password
 * at the wall. Only the SHA-256 of the token is stored, and the link opens
 * nothing else: not the other workshops, not the account, not the desk.
 */

export const LINK_HOURS = 2;

export type LinkAccess = { userId: string; workshopId: string; expiresAt: number };

/** Makes a link for the workshop. Returns the token, which goes in the QR code and nowhere else. */
export async function createPhoneLink(
  db: Db,
  userId: string,
  workshopId: string,
  now = Date.now(),
): Promise<{ token: string; expiresAt: number }> {
  await requireWorkshop(db, userId, workshopId);
  // Old links are cleared on the way, the account's own and anyone's expired ones.
  await db.delete(phoneLinks).where(lte(phoneLinks.expiresAt, now));
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + LINK_HOURS * 3_600_000;
  await db.insert(phoneLinks).values({ id: tokenHash(token), userId, workshopId, expiresAt });
  return { token, expiresAt };
}

/** Who and which workshop a link lets in, or null when it is unknown or its time is up. */
export async function resolvePhoneLink(
  db: Db,
  token: string,
  now = Date.now(),
): Promise<LinkAccess | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const [row] = await db
    .select({
      userId: phoneLinks.userId,
      workshopId: phoneLinks.workshopId,
      expiresAt: phoneLinks.expiresAt,
    })
    .from(phoneLinks)
    .where(and(eq(phoneLinks.id, tokenHash(token)), gt(phoneLinks.expiresAt, now)));
  return row ?? null;
}

/** Closes every link into the workshop at once, from the computer. */
export async function closePhoneLinks(db: Db, userId: string, workshopId: string): Promise<void> {
  await requireWorkshop(db, userId, workshopId);
  await db
    .delete(phoneLinks)
    .where(and(eq(phoneLinks.workshopId, workshopId), eq(phoneLinks.userId, userId)));
}
