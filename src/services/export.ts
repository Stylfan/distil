import { asc, eq, inArray } from "drizzle-orm";
import type { Tx } from "@/db/client";
import { auditLog, diagrams, notes, outlines, photos, users, workshops } from "@/db/schema";

/**
 * Everything an account owns, for the one-click export (Haij's third
 * rule): the account itself, every workshop with its photos (as records;
 * images are not kept long enough to export), the notes, the outlines,
 * the redrawn drawings and the audit trail. Runs inside withUser(), so row-level security limits it to the
 * account's own workshops even before the owner filter does.
 */

export type AccountExport = {
  format: "distil-export";
  version: 1;
  exportedAt: string;
  account: {
    id: string;
    email: string;
    name: string;
    createdAt: number;
    photoAllowance: number;
    photosRead: number;
  };
  workshops: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  outlines: Record<string, unknown>[];
  diagrams: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
};

export async function exportAccount(tx: Tx, userId: string): Promise<AccountExport> {
  const [account] = await tx
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      photoAllowance: users.photoAllowance,
      photosRead: users.photosRead,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!account) throw new Error("export: no such account");
  const owned = await tx
    .select()
    .from(workshops)
    .where(eq(workshops.ownerId, userId))
    .orderBy(asc(workshops.createdAt));
  const ids = owned.map((w) => w.id);
  const none = ids.length === 0;

  return {
    format: "distil-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    account,
    workshops: owned,
    photos: none
      ? []
      : await tx
          .select()
          .from(photos)
          .where(inArray(photos.workshopId, ids))
          .orderBy(asc(photos.workshopId), asc(photos.seq)),
    notes: none
      ? []
      : await tx
          .select()
          .from(notes)
          .where(inArray(notes.workshopId, ids))
          .orderBy(asc(notes.photoId), asc(notes.seq)),
    outlines: none ? [] : await tx.select().from(outlines).where(inArray(outlines.workshopId, ids)),
    diagrams: none ? [] : await tx.select().from(diagrams).where(inArray(diagrams.workshopId, ids)),
    auditLog: none
      ? []
      : await tx
          .select()
          .from(auditLog)
          .where(inArray(auditLog.workshopId, ids))
          .orderBy(asc(auditLog.id)),
  };
}
