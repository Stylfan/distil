import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { withUser } from "@/db/client";
import { finishReading, addPhoto } from "@/services/photos";
import { deleteAccount } from "@/services/users";
import { createWorkshop, getWorkshop, listWorkshops } from "@/services/workshops";
import { FAKE_ITEMS } from "@/ai/fake";
import { appDb, failure, freshDb, ownerDb } from "./db";
import { fakeJpeg, seedUser } from "./helpers";

/**
 * The database itself keeps one account's workshops from another (Haij's
 * sixth rule). These tests connect as distil_app, the role the
 * application uses, and go around the services with raw SQL: even code
 * that forgot its ownership check could not reach another account's
 * photos, images or notes.
 */

const CHILD_TABLES = ["photos", "photo_images", "notes", "outlines", "diagrams"];
/** Outside row-level security on purpose: signing in, and counts with no personal data. */
const OPEN_TABLES = [
  "users",
  "sessions",
  "passkeys",
  "recovery_codes",
  "auth_challenges",
  "usage_days",
];

let alice: string;
let bob: string;
let workshopId: string;

const asAlice = <T>(fn: Parameters<typeof withUser<T>>[1]) => withUser(alice, fn, appDb());
const asBob = <T>(fn: Parameters<typeof withUser<T>>[1]) => withUser(bob, fn, appDb());

const count = async (rows: { rows: unknown[] }) => rows.rows.length;

beforeEach(async () => {
  const db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  workshopId = await asAlice((tx) =>
    createWorkshop(tx, alice, { name: "Alices workshop", heldOn: "2026-11-12" }),
  );
  await asAlice(async (tx) => {
    const photoId = await addPhoto(tx, alice, workshopId, fakeJpeg());
    await finishReading(tx, alice, photoId, FAKE_ITEMS);
  });
});

describe("row-level security", () => {
  it("is forced on every table that holds workshop data", async () => {
    const { rows } = await ownerDb().execute<{ relname: string; forced: boolean }>(sql`
      select c.relname, c.relrowsecurity and c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and c.relname <> all(${`{${OPEN_TABLES.join(",")}}`}::text[])
        and c.relname not like '\\_\\_drizzle%'`);
    expect(rows.length).toBe(CHILD_TABLES.length + 2); // + workshops, audit_log
    expect(rows.filter((r) => !r.forced).map((r) => r.relname)).toEqual([]);
  });

  it("lets the owner see her own rows", async () => {
    expect(await asAlice(async (tx) => count(await tx.execute(sql`select id from notes`)))).toBe(
      FAKE_ITEMS.length,
    );
    expect(
      await asAlice(async (tx) => count(await tx.execute(sql`select photo_id from photo_images`))),
    ).toBe(1);
  });

  it("shows another account nothing, table by table", async () => {
    await asBob(async (tx) => {
      expect(await count(await tx.execute(sql`select id from workshops`))).toBe(0);
      for (const table of CHILD_TABLES) {
        const result = await tx.execute(sql`select * from ${sql.identifier(table)}`);
        expect(result.rows, table).toEqual([]);
      }
    });
  });

  it("shows nothing when no user is set", async () => {
    expect((await appDb().execute(sql`select id from workshops`)).rows).toEqual([]);
    expect((await appDb().execute(sql`select photo_id from photo_images`)).rows).toEqual([]);
  });

  it("does not let another account change or delete the rows", async () => {
    await asBob(async (tx) => {
      const renamed = await tx.execute(
        sql`update workshops set name = 'Kapret' where id = ${workshopId}`,
      );
      expect(renamed.rowCount).toBe(0);
      const removed = await tx.execute(sql`delete from notes where workshop_id = ${workshopId}`);
      expect(removed.rowCount).toBe(0);
      const images = await tx.execute(
        sql`delete from photo_images where workshop_id = ${workshopId}`,
      );
      expect(images.rowCount).toBe(0);
    });
    const full = await asAlice((tx) => getWorkshop(tx, alice, workshopId));
    expect(full!.workshop.name).toBe("Alices workshop");
  });

  it("does not let another account add rows to the workshop", async () => {
    expect(
      await failure(
        asBob((tx) =>
          tx.execute(
            sql`insert into workshops (id, owner_id, name, held_on, created_at, updated_at)
                values ('y', ${alice}, 'Falsk', '2026-11-12', 1, 1)`,
          ),
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("holds through the services too", async () => {
    expect(await asBob((tx) => listWorkshops(tx, bob))).toEqual([]);
    expect(await asBob((tx) => getWorkshop(tx, bob, workshopId))).toBeNull();
  });
});

describe("the audit log", () => {
  it("records every change with the acting account, and never an image", async () => {
    const { rows } = await ownerDb().execute<{ table_name: string; actor_user_id: string }>(
      sql`select table_name, actor_user_id from audit_log where workshop_id = ${workshopId}`,
    );
    expect(new Set(rows.map((r) => r.table_name))).toEqual(
      new Set(["workshops", "photos", "notes"]),
    );
    expect(rows.every((r) => r.actor_user_id === alice)).toBe(true);
  });

  it("can be read only for one's own workshops", async () => {
    expect(
      await asAlice(async (tx) => count(await tx.execute(sql`select id from audit_log`))),
    ).toBeGreaterThan(0);
    expect(await asBob(async (tx) => count(await tx.execute(sql`select id from audit_log`)))).toBe(
      0,
    );
  });

  it("cannot be changed or emptied by the application", async () => {
    expect(
      await failure(asAlice((tx) => tx.execute(sql`update audit_log set table_name = 'x'`))),
    ).toMatch(/permission denied/);
    expect(await failure(asAlice((tx) => tx.execute(sql`delete from audit_log`)))).toMatch(
      /permission denied/,
    );
  });

  it("cannot be changed or emptied even by the database owner", async () => {
    const owner = ownerDb();
    expect(await failure(owner.execute(sql`update audit_log set table_name = 'x'`))).toMatch(
      /append-only/,
    );
    expect(await failure(owner.execute(sql`delete from audit_log`))).toMatch(/append-only/);
    expect(await failure(owner.execute(sql`truncate audit_log`))).toMatch(/append-only/);
  });
});

describe("deleting an account", () => {
  it("is refused for anyone but the account itself", async () => {
    expect(await failure(asBob((tx) => deleteAccount(tx, alice)))).toMatch(/not the signed-in/);
  });

  it("removes the account, its workshops, images, notes and audit trail, and nothing else", async () => {
    await asAlice((tx) => deleteAccount(tx, alice));
    const owner = ownerDb();
    const left = async (q: ReturnType<typeof sql>) => (await owner.execute(q)).rows.length;
    expect(await left(sql`select id from users where id = ${alice}`)).toBe(0);
    expect(await left(sql`select id from workshops`)).toBe(0);
    expect(await left(sql`select photo_id from photo_images`)).toBe(0);
    expect(await left(sql`select id from notes`)).toBe(0);
    expect(await left(sql`select id from audit_log where workshop_id = ${workshopId}`)).toBe(0);
    expect(await left(sql`select id from users where id = ${bob}`)).toBe(1);
  });
});
