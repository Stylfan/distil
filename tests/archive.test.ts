import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createWorkshop, findWorkshop, listWorkshops, setArchived } from "@/services/workshops";
import { freshDb } from "./db";
import { seedUser } from "./helpers";

/** A workshop can be put away in the archive and taken back, whole; only by its owner. */
describe("the archive", () => {
  let db: Db;
  let alice: string;
  let id: string;

  beforeEach(async () => {
    db = await freshDb();
    alice = await seedUser(db, "alice@example.com");
    id = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
  });

  it("puts a workshop away and takes it back, keeping it whole", async () => {
    await setArchived(db, alice, id, true, 1000);
    expect((await findWorkshop(db, alice, id))!.archivedAt).toBe(1000);
    expect((await listWorkshops(db, alice)).map((w) => w.archivedAt)).toEqual([1000]);
    await setArchived(db, alice, id, false);
    expect((await findWorkshop(db, alice, id))!.archivedAt).toBeNull();
  });

  it("is only for the owner", async () => {
    const bob = await seedUser(db, "bob@example.com");
    await expect(setArchived(db, bob, id, true)).rejects.toThrow("notFound");
  });
});
