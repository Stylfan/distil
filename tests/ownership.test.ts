import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { FAKE_ITEMS } from "@/ai/fake";
import { addNote, deleteNote, updateNote } from "@/services/notes";
import {
  addPhoto,
  approvePhoto,
  deletePhoto,
  finishReading,
  getImage,
  startReading,
} from "@/services/photos";
import {
  deleteWorkshop,
  getWorkshop,
  listNotes,
  listWorkshops,
  renameWorkshop,
} from "@/services/workshops";
import { createWorkshop } from "@/services/workshops";
import { freshDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * A workshop belongs to the user who made it. For anyone else it does not
 * exist: they cannot list it, read it or change anything in it, not its
 * photos, images or notes, even with the right ids. These tests run as the
 * database owner, so they test the services' own checks, apart from the
 * row-level security in tests/isolation.test.ts.
 */

let db: Db;
let alice: string;
let bob: string;
let workshopId: string;
let photoId: string;
let noteId: string;

beforeEach(async () => {
  db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  workshopId = await createWorkshop(db, alice, { name: "Alices workshop", heldOn: "2026-11-12" });
  photoId = await addPhoto(db, alice, workshopId, fakeJpeg());
  await finishReading(db, alice, photoId, FAKE_ITEMS);
  noteId = (await listNotes(db, alice, photoId))[0]!.id;
});

describe("another user", () => {
  it("does not see the workshop", async () => {
    expect(await listWorkshops(db, bob)).toEqual([]);
    expect(await getWorkshop(db, bob, workshopId)).toBeNull();
  });

  it("cannot change or delete the workshop", async () => {
    await expect(
      renameWorkshop(db, bob, workshopId, { name: "Kapret", heldOn: "2026-01-01" }),
    ).rejects.toThrow("notFound");
    await expect(deleteWorkshop(db, bob, workshopId)).rejects.toThrow("notFound");
  });

  it("cannot add, see, read, approve or delete its photos", async () => {
    await expect(addPhoto(db, bob, workshopId, fakeJpeg())).rejects.toThrow("notFound");
    await expect(getImage(db, bob, photoId)).rejects.toThrow("notFound");
    await expect(startReading(db, bob, photoId)).rejects.toThrow("notFound");
    await expect(finishReading(db, bob, photoId, [])).rejects.toThrow("notFound");
    await expect(approvePhoto(db, bob, photoId)).rejects.toThrow("notFound");
    await expect(deletePhoto(db, bob, photoId)).rejects.toThrow("notFound");
  });

  it("cannot see or touch its notes", async () => {
    await expect(listNotes(db, bob, photoId)).rejects.toThrow("notFound");
    await expect(updateNote(db, bob, noteId, { text: "Kapret" })).rejects.toThrow("notFound");
    await expect(addNote(db, bob, photoId, { text: "Ind", colour: "yellow" })).rejects.toThrow(
      "notFound",
    );
    await expect(deleteNote(db, bob, noteId)).rejects.toThrow("notFound");
  });

  it("leaves everything as it was", async () => {
    const full = await getWorkshop(db, alice, workshopId);
    expect(full!.workshop.name).toBe("Alices workshop");
    expect(full!.photos).toHaveLength(1);
    expect(await listNotes(db, alice, photoId)).toHaveLength(FAKE_ITEMS.length);
    expect(await getImage(db, alice, photoId)).not.toBeNull();
  });
});

describe("the owner", () => {
  it("corrects, adds and deletes notes", async () => {
    await updateNote(db, alice, noteId, { text: "  Rettet  ", colour: "pink" });
    const added = await addNote(db, alice, photoId, { text: "Glemt seddel", colour: "green" });
    await deleteNote(db, alice, (await listNotes(db, alice, photoId))[1]!.id);
    const notes = await listNotes(db, alice, photoId);
    expect(notes[0]).toMatchObject({ text: "Rettet", colour: "pink", edited: true, unsure: false });
    expect(notes.at(-1)).toMatchObject({ id: added, text: "Glemt seddel", edited: true });
    expect(notes).toHaveLength(FAKE_ITEMS.length);
  });

  it("deletes a workshop with everything in it", async () => {
    await deleteWorkshop(db, alice, workshopId);
    expect(await listWorkshops(db, alice)).toEqual([]);
  });
});
