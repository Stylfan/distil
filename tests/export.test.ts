import { beforeEach, describe, expect, it } from "vitest";
import { withUser } from "@/db/client";
import { FAKE_ITEMS } from "@/ai/fake";
import { exportAccount } from "@/services/export";
import { addPhoto, finishReading } from "@/services/photos";
import { createWorkshop } from "@/services/workshops";
import { appDb, freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * The one-click export holds everything the account owns and nothing of
 * anyone else's, and never an image.
 */

let alice: string;
let bob: string;

beforeEach(async () => {
  const db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  for (const [user, name] of [
    [alice, "Alices workshop"],
    [bob, "Bobs workshop"],
  ] as const) {
    await withUser(
      user,
      async (tx) => {
        const id = await createWorkshop(tx, user, { name, heldOn: "2026-11-12" });
        const photoId = await addPhoto(tx, user, id, fakeJpeg());
        await finishReading(tx, user, photoId, FAKE_ITEMS);
      },
      appDb(),
    );
  }
});

describe("the export", () => {
  it("holds the account's workshops, photos, notes and audit trail, and nothing else", async () => {
    const data = await withUser(alice, (tx) => exportAccount(tx, alice), appDb());
    expect(data.format).toBe("distil-export");
    expect(data.account.email).toBe("alice@example.com");
    expect(data.workshops.map((w) => w.name)).toEqual(["Alices workshop"]);
    expect(data.photos).toHaveLength(1);
    expect(data.notes).toHaveLength(FAKE_ITEMS.length);
    expect(data.auditLog.length).toBeGreaterThan(0);
    const text = JSON.stringify(data);
    expect(text).not.toContain("Bobs workshop");
    expect(text).not.toContain("bob@example.com");
  });

  it("never carries an image", async () => {
    const data = await withUser(alice, (tx) => exportAccount(tx, alice), appDb());
    expect(JSON.stringify(data)).not.toMatch(/"data"|image\/jpeg/);
  });
});
