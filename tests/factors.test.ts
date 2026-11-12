import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { checkSecondFactor } from "@/auth/check-code";
import { open, seal } from "@/auth/secret-box";
import { base32Decode, base32Encode, codeForStep, stepAt, verifyTotp } from "@/auth/totp";
import type { Database } from "@/db/client";
import {
  claimTotpStep,
  createChallenge,
  disableTotp,
  enableTotp,
  failChallenge,
  findChallenge,
  MAX_CHALLENGE_ATTEMPTS,
  recoveryCodesLeft,
  replaceRecoveryCodes,
  spendRecoveryCode,
} from "@/services/factors";
import { findUserById } from "@/services/users";
import { freshDb } from "./db";
import { seedUser } from "./helpers";

/**
 * The second factor: codes that match every authenticator app (the RFC's
 * own test vectors), work once, and a secret the database cannot read
 * without the key; recovery codes that are spent; sign-in steps that
 * expire and stop after five wrong answers.
 */

// RFC 6238, appendix B: the SHA-1 secret "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));
const KEY = "a".repeat(40);

describe("time-based codes", () => {
  it("match the RFC 6238 test vectors", () => {
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    // The RFC lists eight digits; apps show the last six.
    expect(codeForStep(RFC_SECRET, stepAt(59_000))).toBe("287082");
    expect(codeForStep(RFC_SECRET, stepAt(1_111_111_109_000))).toBe("081804");
    expect(codeForStep(RFC_SECRET, stepAt(1_234_567_890_000))).toBe("005924");
    expect(codeForStep(RFC_SECRET, stepAt(2_000_000_000_000))).toBe("279037");
  });

  it("round-trip through base32", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it("are accepted one step either side, and never again once used", () => {
    const now = 1_700_000_000_000;
    const step = stepAt(now);
    const code = codeForStep(RFC_SECRET, step);
    expect(verifyTotp(RFC_SECRET, code, null, now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step - 2), null, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, code, step, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "12345", null, now)).toBeNull();
  });
});

describe("the secret box", () => {
  it("opens what it sealed, and nothing that was changed or sealed with another key", () => {
    const sealed = seal("JBSWY3DPEHPK3PXP", KEY);
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(open(sealed, KEY)).toBe("JBSWY3DPEHPK3PXP");
    expect(() => open(sealed, "b".repeat(40))).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("other").toString("base64url");
    expect(() => open(parts.join("."), KEY)).toThrow();
  });

  it("refuses to work without a real key", () => {
    expect(() => seal("x", "short")).toThrow(/DISTIL_SECRET/);
  });
});

let db: Database;
let userId: string;

beforeEach(async () => {
  db = await freshDb();
  userId = await seedUser(db, "alice@example.com");
});

describe("two-step sign-in", () => {
  it("accepts a code once, even from two requests at the same time", async () => {
    process.env.DISTIL_SECRET ??= KEY;
    await enableTotp(db, userId, seal(RFC_SECRET), 0);
    const user = (await findUserById(db, userId))!;
    const code = codeForStep(RFC_SECRET, stepAt(Date.now()));
    const answers = await Promise.all([
      checkSecondFactor(db, user, code),
      checkSecondFactor(db, user, code),
    ]);
    expect(answers.filter(Boolean)).toHaveLength(1);
    expect(await claimTotpStep(db, userId, 1)).toBe(false);
  });

  it("lets each recovery code in once, and turning it off removes them", async () => {
    process.env.DISTIL_SECRET ??= KEY;
    await enableTotp(db, userId, seal(RFC_SECRET), 0);
    const codes = await replaceRecoveryCodes(db, userId);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    const user = (await findUserById(db, userId))!;
    expect(await checkSecondFactor(db, user, codes[0]!.toUpperCase())).toBe(true);
    expect(await checkSecondFactor(db, user, codes[0]!)).toBe(false);
    expect(await spendRecoveryCode(db, userId, "aaaaa-aaaaa")).toBe(false);
    expect(await recoveryCodesLeft(db, userId)).toBe(9);
    await disableTotp(db, userId);
    expect(await recoveryCodesLeft(db, userId)).toBe(0);
    expect((await findUserById(db, userId))!.totpSecret).toBeNull();
  });

  it("refuses every code when it is off", async () => {
    const user = (await findUserById(db, userId))!;
    expect(await checkSecondFactor(db, user, "123456")).toBe(false);
  });
});

describe("sign-in steps", () => {
  it("expire after five minutes", async () => {
    const start = 1_700_000_000_000;
    const token = await createChallenge(db, { userId, purpose: "second-factor" }, start);
    expect(await findChallenge(db, token, "second-factor", start + 60_000)).not.toBeNull();
    expect(await findChallenge(db, token, "passkey-login", start + 60_000)).toBeNull();
    expect(await findChallenge(db, token, "second-factor", start + 5 * 60_000 + 1)).toBeNull();
  });

  it("stop after five wrong answers", async () => {
    const token = await createChallenge(db, { userId, purpose: "second-factor" });
    for (let i = 0; i < MAX_CHALLENGE_ATTEMPTS; i++) await failChallenge(db, token);
    expect(await findChallenge(db, token, "second-factor")).toBeNull();
  });

  it("are stored only as a hash of the token", async () => {
    const token = await createChallenge(db, { userId, purpose: "second-factor" });
    const { rows } = await db.execute<{ id: string }>(sql`select id from auth_challenges`);
    expect(rows.map((r) => r.id)).not.toContain(token);
  });
});
