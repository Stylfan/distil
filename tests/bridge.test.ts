import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { phoneLinks, users } from "@/db/schema";
import { photoWorkshop, addPhoto } from "@/services/photos";
import {
  LINK_HOURS,
  closePhoneLinks,
  createPhoneLink,
  resolvePhoneLink,
} from "@/services/phone-links";
import {
  approveRequest,
  countRequests,
  declineRequest,
  listRequests,
  requestMore,
} from "@/services/requests";
import { createWorkshop } from "@/services/workshops";
import { freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * The bridge from computer to phone, and the gate for more photos. A
 * phone link opens one workshop for a couple of hours and nothing else;
 * only its hash is kept. A request for more is seen and answered by the
 * operator alone, marked as admin in the database.
 */

const HOUR = 3_600_000;
let db: Db;
let alice: string;
let bob: string;
let workshopId: string;

beforeEach(async () => {
  db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  workshopId = await createWorkshop(db, alice, { name: "W", heldOn: "2026-11-12" });
});

describe("a phone link", () => {
  it("lets the phone into the one workshop until it expires", async () => {
    const now = Date.now();
    const { token, expiresAt } = await createPhoneLink(db, alice, workshopId, now);
    expect(expiresAt).toBe(now + LINK_HOURS * HOUR);
    expect(await resolvePhoneLink(db, token, now + HOUR)).toEqual({
      userId: alice,
      workshopId,
      expiresAt,
    });
    expect(await resolvePhoneLink(db, token, expiresAt)).toBeNull();
  });

  it("keeps only a hash of the token, and opens nothing for a wrong one", async () => {
    const { token } = await createPhoneLink(db, alice, workshopId);
    const rows = await db.select().from(phoneLinks);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).not.toBe(token);
    expect(await resolvePhoneLink(db, `${token}x`)).toBeNull();
    expect(await resolvePhoneLink(db, "kort")).toBeNull();
    expect(await resolvePhoneLink(db, "'; drop table users; --")).toBeNull();
  });

  it("can be made only by the workshop's owner, and closed at once", async () => {
    await expect(createPhoneLink(db, bob, workshopId)).rejects.toThrow("notFound");
    const { token } = await createPhoneLink(db, alice, workshopId);
    await expect(closePhoneLinks(db, bob, workshopId)).rejects.toThrow("notFound");
    expect(await resolvePhoneLink(db, token)).not.toBeNull();
    await closePhoneLinks(db, alice, workshopId);
    expect(await resolvePhoneLink(db, token)).toBeNull();
  });

  it("tells which workshop a photo is in, so a link reaches no other", async () => {
    const other = await createWorkshop(db, alice, { name: "Anden", heldOn: "2026-11-12" });
    const photoId = await addPhoto(db, alice, other, fakeJpeg());
    expect(await photoWorkshop(db, alice, photoId)).toBe(other);
    expect(await photoWorkshop(db, alice, photoId)).not.toBe(workshopId);
    await expect(photoWorkshop(db, bob, photoId)).rejects.toThrow("notFound");
  });

  it("goes with the workshop", async () => {
    const { token } = await createPhoneLink(db, alice, workshopId);
    await db.execute(`delete from workshops where id = '${workshopId}'`);
    expect(await resolvePhoneLink(db, token)).toBeNull();
  });
});

describe("asking for more photos", () => {
  beforeEach(async () => {
    await db.update(users).set({ isAdmin: true }).where(eq(users.email, "bob@example.com"));
  });

  it("is seen and answered by the operator only", async () => {
    await requestMore(db, alice, "  Tre workshops i december  ");
    expect(await countRequests(db)).toBe(1);
    await expect(listRequests(db, alice)).rejects.toThrow("notAdmin");
    await expect(approveRequest(db, alice, alice)).rejects.toThrow("notAdmin");
    const [request] = await listRequests(db, bob);
    expect(request).toMatchObject({
      id: alice,
      note: "Tre workshops i december",
      photoAllowance: 10,
    });
  });

  it("raises the allowance on yes, and leaves it on no", async () => {
    await requestMore(db, alice, "");
    await approveRequest(db, bob, alice, 100);
    const [yes] = await db.select().from(users).where(eq(users.id, alice));
    expect(yes).toMatchObject({ photoAllowance: 100, moreRequestedAt: null });
    await expect(approveRequest(db, bob, alice, 100)).rejects.toThrow("notFound");

    await requestMore(db, alice, "Endnu flere");
    await declineRequest(db, bob, alice);
    const [no] = await db.select().from(users).where(eq(users.id, alice));
    expect(no).toMatchObject({ photoAllowance: 100, moreRequestedAt: null, moreRequestNote: "" });
  });

  it("is not possible for a demo visit", async () => {
    await db
      .update(users)
      .set({ demoExpiresAt: Date.now() + HOUR })
      .where(eq(users.id, alice));
    await expect(requestMore(db, alice, "")).rejects.toThrow("notFound");
  });
});
