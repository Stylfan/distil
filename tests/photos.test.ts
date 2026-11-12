import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { FAKE_ITEMS } from "@/ai/fake";
import { photoImages, users } from "@/db/schema";
import { IMAGE_HOURS, PHOTOS_PER_WORKSHOP } from "@/domain/limits";
import {
  addPhoto,
  approvePhoto,
  failReading,
  finishReading,
  getImage,
  purgeExpiredImages,
  startReading,
} from "@/services/photos";
import { photosLeft, reservePhoto } from "@/services/limits";
import { createWorkshop, getWorkshop, listNotes } from "@/services/workshops";
import { appDb, freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * A photo from upload until its image is gone: it is kept only until it is
 * approved and never past IMAGE_HOURS; reading it counts against the
 * account and the installation's day, and a failed reading gives the
 * place back.
 */

const HOUR = 3_600_000;
let db: Db;
let alice: string;
let workshopId: string;

beforeEach(async () => {
  db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  workshopId = await createWorkshop(db, alice, { name: "Workshop", heldOn: "2026-11-12" });
});

describe("uploading", () => {
  it("keeps a JPEG and numbers the photos in order", async () => {
    const first = await addPhoto(db, alice, workshopId, fakeJpeg(1600, 1200));
    await addPhoto(db, alice, workshopId, fakeJpeg());
    const full = await getWorkshop(db, alice, workshopId);
    expect(full!.photos.map((p) => [p.seq, p.status])).toEqual([
      [1, "waiting"],
      [2, "waiting"],
    ]);
    expect(full!.photos[0]).toMatchObject({ id: first, width: 1600, height: 1200 });
  });

  it("refuses what is not a JPEG, and one too large or too small", async () => {
    await expect(addPhoto(db, alice, workshopId, Buffer.from("<svg/>"))).rejects.toThrow("type");
    await expect(addPhoto(db, alice, workshopId, fakeJpeg(5000, 3000))).rejects.toThrow(
      "dimensions",
    );
    await expect(addPhoto(db, alice, workshopId, fakeJpeg(150, 100))).rejects.toThrow("dimensions");
  });

  it(`stops at ${PHOTOS_PER_WORKSHOP} photos in a workshop`, async () => {
    for (let i = 0; i < PHOTOS_PER_WORKSHOP; i++) await addPhoto(db, alice, workshopId, fakeJpeg());
    await expect(addPhoto(db, alice, workshopId, fakeJpeg())).rejects.toThrow("workshopFull");
  });
});

describe("reading", () => {
  it("hands out the image once, counts it, and stores the notes in reading order", async () => {
    const photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
    const start = await startReading(db, alice, photoId);
    expect(start.kind).toBe("image");
    expect((await startReading(db, alice, photoId)).kind).toBe("nothing");
    expect(await photosLeft(db, alice)).toBe(9);
    await finishReading(db, alice, photoId, FAKE_ITEMS);
    const notes = await listNotes(db, alice, photoId);
    expect(notes).toHaveLength(FAKE_ITEMS.length);
    expect(notes.slice(0, 2).map((n) => n.text)).toEqual(["Onboarding", "Værktøjer"]);
    expect(notes.find((n) => n.unsure)?.alternatives).toEqual(["Hvem spørger jeg om kalender?"]);
  });

  it("gives the place back when the reading fails, and may be tried again", async () => {
    const photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
    await startReading(db, alice, photoId);
    await failReading(db, alice, photoId, "provider");
    expect(await photosLeft(db, alice)).toBe(10);
    expect((await startReading(db, alice, photoId)).kind).toBe("image");
  });

  it("stops when the account's photos are used up, and says so on the photo", async () => {
    await db.update(users).set({ photosRead: 10 }).where(eq(users.id, alice));
    const photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
    expect(await startReading(db, alice, photoId)).toEqual({ kind: "limit", limit: "allowance" });
    const [photo] = (await getWorkshop(db, alice, workshopId))!.photos;
    expect(photo).toMatchObject({ status: "failed", error: "allowance" });
  });

  it("stops at the installation's ceiling for the day, and starts again the next day", async () => {
    const bob = await seedUser(db, "bob@example.com");
    const day = Date.UTC(2026, 10, 12, 12);
    const config = {
      allowance: 10,
      approvedAllowance: 100,
      dailyCeiling: 2,
      outlinesPerAccount: 30,
      outlineCeiling: 500,
    };
    await reservePhoto(db, alice, day, config);
    await reservePhoto(db, bob, day, config);
    await expect(reservePhoto(db, alice, day, config)).rejects.toThrow("daily");
    // The refused photo was not counted against the account.
    expect(await photosLeft(db, alice)).toBe(9);
    await reservePhoto(db, alice, day + 24 * HOUR, config);
  });

  it("does not let two readings at once slip past the last place", async () => {
    await db.update(users).set({ photosRead: 9 }).where(eq(users.id, alice));
    const results = await Promise.allSettled([
      appDb().transaction((tx) => reservePhoto(tx, alice)),
      appDb().transaction((tx) => reservePhoto(tx, alice)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await photosLeft(db, alice)).toBe(0);
  });
});

describe("the image", () => {
  it("is deleted when the reading is approved; the notes stay", async () => {
    const photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
    await startReading(db, alice, photoId);
    await finishReading(db, alice, photoId, FAKE_ITEMS);
    await approvePhoto(db, alice, photoId);
    expect(await getImage(db, alice, photoId)).toBeNull();
    expect(await db.select().from(photoImages)).toEqual([]);
    expect(await listNotes(db, alice, photoId)).toHaveLength(FAKE_ITEMS.length);
    const [photo] = (await getWorkshop(db, alice, workshopId))!.photos;
    expect(photo).toMatchObject({ status: "approved", imageExpiresAt: null });
    expect(photo!.imageDeletedAt).not.toBeNull();
  });

  it(`is not served past ${IMAGE_HOURS} hours, and the purge deletes it for everyone`, async () => {
    const now = Date.now();
    const old = await addPhoto(db, alice, workshopId, fakeJpeg(), now - (IMAGE_HOURS + 1) * HOUR);
    const fresh = await addPhoto(db, alice, workshopId, fakeJpeg(), now);
    expect(await getImage(db, alice, old, now)).toBeNull();
    expect((await startReading(db, alice, old, now)).kind).toBe("nothing");
    // As the application, which cannot see other accounts' rows: the purge still reaches them.
    expect(await purgeExpiredImages(appDb(), now)).toBe(1);
    const left = await db.execute(sql`select photo_id from photo_images`);
    expect(left.rows).toEqual([{ photo_id: fresh }]);
    const photo = (await getWorkshop(db, alice, workshopId, now))!.photos.find((p) => p.id === old);
    expect(photo!.imageDeletedAt).toBe(now);
  });
});
