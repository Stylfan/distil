import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSession, registerUser, signupOpen, userForSession } from "@/services/users";
import {
  DEMO_HOURS,
  DemoFull,
  MAX_DEMO_VISITS,
  cleanExpiredDemos,
  startDemoVisit,
} from "@/services/demo-visits";
import { withUser } from "@/db/client";
import { createWorkshop } from "@/services/workshops";
import { appDb, freshDb } from "./db";
import { seedUser } from "./helpers";

/**
 * A demo installation: a visit is a throwaway account, without a known
 * address or password, with as many photos as a new account. When its time is up it
 * no longer signs in, and the cleanup deletes it with everything it made,
 * through the application role, as a person deleting their own account
 * would. A demo installation takes no sign-ups.
 */

const HOUR = 3_600_000;
const count = async (table: string) => {
  const rows = await (
    await freshDbNoTruncate()
  ).execute(sql.raw(`select count(*)::int as n from ${table}`));
  return (rows.rows[0] as { n: number }).n;
};
// The owner connection without emptying the tables again.
const freshDbNoTruncate = async () => (await import("./db")).ownerDb();

beforeEach(async () => {
  await freshDb();
  process.env.DISTIL_DEMO = "on";
});
afterEach(() => {
  delete process.env.DISTIL_DEMO;
});

describe("demo visits", () => {
  it("start with an allowance of photos and a time to end", async () => {
    const now = Date.now();
    const visit = await startDemoVisit(appDb(), now);
    const rows = await (
      await freshDbNoTruncate()
    ).execute(
      sql`select email, demo_expires_at, photo_allowance from users where id = ${visit.userId}`,
    );
    const user = rows.rows[0] as {
      email: string;
      demo_expires_at: string;
      photo_allowance: number;
    };
    expect(user.email).toMatch(/^demo-.+@demo\.invalid$/);
    expect(Number(user.demo_expires_at)).toBe(now + DEMO_HOURS * HOUR);
    expect(user.photo_allowance).toBe(10);
  });

  it("end when the time is up, and the cleanup leaves nothing behind", async () => {
    const now = Date.now();
    const old = await startDemoVisit(appDb(), now - (DEMO_HOURS + 1) * HOUR);
    const workshopId = await withUser(
      old.userId,
      (tx) => createWorkshop(tx, old.userId, { name: "Demo", heldOn: "2026-11-12" }),
      appDb(),
    );
    const fresh = await startDemoVisit(appDb(), now);
    const token = await createSession(appDb(), old.userId, now - HOUR);
    expect(await userForSession(appDb(), token, now)).toBeNull();

    expect(await cleanExpiredDemos(appDb(), now)).toBe(1);
    const left = await (
      await freshDbNoTruncate()
    ).execute(sql`select id from users union all select owner_id from workshops`);
    expect(left.rows.map((r) => (r as { id: string }).id)).toEqual([fresh.userId]);
    const audit = await (
      await freshDbNoTruncate()
    ).execute(sql`select count(*)::int as n from audit_log where workshop_id = ${workshopId}`);
    expect((audit.rows[0] as { n: number }).n).toBe(0);
  });

  it("leave real accounts alone, and take sign-ups only when opened", async () => {
    await seedUser(await freshDbNoTruncate(), "ejer@example.dk");
    expect(await cleanExpiredDemos(appDb(), Date.now() + 1000 * HOUR)).toBe(0);
    expect(await count("users")).toBe(1);
    expect(await signupOpen(appDb(), undefined)).toBe(false);
    await expect(
      registerUser(appDb(), { email: "ny@example.dk", name: "", password: "x".repeat(12) }, ""),
    ).rejects.toThrow("signupClosed");
    // Its operator can open sign-up beside the demo.
    expect(await signupOpen(appDb(), "open")).toBe(true);
  });

  it("stop at the limit of visits at once", async () => {
    const db = await freshDbNoTruncate();
    const future = Date.now() + HOUR;
    await db.execute(
      sql`insert into users (id, email, name, password_hash, demo_expires_at, created_at, updated_at)
          select gen_random_uuid()::text, 'demo-' || g || '@demo.invalid', '', 'x', ${future}, ${future}, ${future}
          from generate_series(1, ${MAX_DEMO_VISITS}) g`,
    );
    await expect(startDemoVisit(appDb())).rejects.toBeInstanceOf(DemoFull);
  });
});
