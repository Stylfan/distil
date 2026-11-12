import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/auth/password";
import { allowAttempt } from "@/auth/rate-limit";
import type { Db } from "@/db/client";
import { freshDb } from "./db";
import {
  authenticate,
  createSession,
  deleteSession,
  registerUser,
  signupOpen,
  userForSession,
} from "@/services/users";

/**
 * Accounts: passwords are only ever stored hashed, anyone may sign up
 * unless the installation closes it, and a session is valid until it expires or is ended.
 */

let db: Db;
const pw = "korrekt-hest-batteri";

beforeEach(async () => {
  db = await freshDb();
});

describe("passwords", () => {
  it("are stored as a salted hash and verified against it", async () => {
    const a = await hashPassword(pw);
    const b = await hashPassword(pw);
    expect(a).not.toContain(pw);
    expect(a).not.toBe(b);
    expect(await verifyPassword(pw, a)).toBe(true);
    expect(await verifyPassword("forkert-kodeord", a)).toBe(false);
    expect(await verifyPassword(pw, "noget-helt-andet")).toBe(false);
  });
});

describe("signing up", () => {
  it("is open to anyone, with the default allowance of photos", async () => {
    expect(await signupOpen(db, undefined)).toBe(true);
    const user = await registerUser(
      db,
      { email: " Stefan@Example.com ", name: "Stefan", password: pw },
      undefined,
    );
    expect(user.email).toBe("stefan@example.com");
    expect(user.photoAllowance).toBe(10);
    expect(user.photosRead).toBe(0);
    await registerUser(db, { email: "b@example.com", name: "", password: pw }, undefined);
  });

  it("can be closed, but never before the first account", async () => {
    expect(await signupOpen(db, "closed")).toBe(true);
    await registerUser(db, { email: "a@example.com", name: "", password: pw }, "closed");
    expect(await signupOpen(db, "closed")).toBe(false);
    await expect(
      registerUser(db, { email: "b@example.com", name: "", password: pw }, "closed"),
    ).rejects.toThrow("signupClosed");
  });

  it("refuses a second account on the same address", async () => {
    await registerUser(db, { email: "a@example.com", name: "", password: pw }, "open");
    await expect(
      registerUser(db, { email: "A@example.com", name: "", password: pw }, "open"),
    ).rejects.toThrow("emailTaken");
  });
});

describe("signing in", () => {
  it("accepts the right password and refuses a wrong one or an unknown address", async () => {
    await registerUser(db, { email: "a@example.com", name: "", password: pw }, undefined);
    expect(await authenticate(db, "A@example.com", pw)).not.toBeNull();
    expect(await authenticate(db, "a@example.com", "forkert-kodeord")).toBeNull();
    expect(await authenticate(db, "ingen@example.com", pw)).toBeNull();
  });

  it("limits repeated attempts for one address", async () => {
    const key = `limit-${Math.random()}`;
    const results = Array.from({ length: 9 }, () => allowAttempt(key));
    expect(results.filter(Boolean)).toHaveLength(8);
  });
});

describe("sessions", () => {
  it("resolve to their user until they expire or are ended", async () => {
    const user = await registerUser(
      db,
      { email: "a@example.com", name: "", password: pw },
      undefined,
    );
    const token = await createSession(db, user.id, 1_000);
    expect((await userForSession(db, token, 2_000))?.id).toBe(user.id);
    expect(await userForSession(db, token, 1_000 + 31 * 86_400_000)).toBeNull();
    expect(await userForSession(db, "forfalsket", 2_000)).toBeNull();
    await deleteSession(db, token);
    expect(await userForSession(db, token, 2_000)).toBeNull();
  });
});
