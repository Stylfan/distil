import { randomBytes } from "node:crypto";
import { and, count, eq, isNull, lt, or, sql } from "drizzle-orm";
import { base32Encode } from "@/auth/totp";
import type { Db } from "@/db/client";
import { authChallenges, passkeys, recoveryCodes, users, type ChallengePurpose } from "@/db/schema";
import { tokenHash } from "./users";

/**
 * The second factor and passkeys in the database: short-lived challenges,
 * the TOTP state on the user, recovery codes and passkeys. Challenges are
 * handed out as random tokens of which only the SHA-256 is stored, like
 * sessions.
 */

export const CHALLENGE_MINUTES = 5;
export const MAX_CHALLENGE_ATTEMPTS = 5;

// Challenges

export async function createChallenge(
  db: Db,
  input: { userId: string | null; purpose: ChallengePurpose; value?: string },
  now = Date.now(),
): Promise<string> {
  // Expired steps are cleared whenever a new one starts; there is no scheduler.
  await db.delete(authChallenges).where(lt(authChallenges.expiresAt, now));
  const token = randomBytes(32).toString("base64url");
  await db.insert(authChallenges).values({
    id: tokenHash(token),
    userId: input.userId,
    purpose: input.purpose,
    value: input.value ?? "",
    expiresAt: now + CHALLENGE_MINUTES * 60_000,
  });
  return token;
}

/** The live challenge for a token and purpose, or null. */
export async function findChallenge(
  db: Db,
  token: string,
  purpose: ChallengePurpose,
  now = Date.now(),
) {
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(and(eq(authChallenges.id, tokenHash(token)), eq(authChallenges.purpose, purpose)));
  if (!row || row.expiresAt <= now || row.attempts >= MAX_CHALLENGE_ATTEMPTS) return null;
  return row;
}

/** Counts a wrong answer against the challenge; after five it is spent. */
export async function failChallenge(db: Db, token: string) {
  await db
    .update(authChallenges)
    .set({ attempts: sql`${authChallenges.attempts} + 1` })
    .where(eq(authChallenges.id, tokenHash(token)));
}

export async function deleteChallenge(db: Db, token: string) {
  await db.delete(authChallenges).where(eq(authChallenges.id, tokenHash(token)));
}

// TOTP

export async function enableTotp(db: Db, userId: string, sealedSecret: string, step: number) {
  await db
    .update(users)
    .set({ totpSecret: sealedSecret, totpLastStep: step })
    .where(eq(users.id, userId));
}

export async function disableTotp(db: Db, userId: string) {
  await db.update(users).set({ totpSecret: null, totpLastStep: null }).where(eq(users.id, userId));
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
}

/**
 * Records that a code for `step` was used. Atomic: of two requests with the
 * same code, only one moves the step forward, so only one gets in.
 */
export async function claimTotpStep(db: Db, userId: string, step: number): Promise<boolean> {
  const result = await db
    .update(users)
    .set({ totpLastStep: step })
    .where(and(eq(users.id, userId), or(isNull(users.totpLastStep), lt(users.totpLastStep, step))));
  return (result.rowCount ?? 0) > 0;
}

// Recovery codes

const RECOVERY_CODES = 10;

const normalizeCode = (code: string) => code.toLowerCase().replace(/[^a-z2-7]/g, "");

/** Ten new codes, shown once; any earlier ones stop working. */
export async function replaceRecoveryCodes(db: Db, userId: string): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODES }, () => {
    const raw = base32Encode(randomBytes(7)).slice(0, 10).toLowerCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
  await db
    .insert(recoveryCodes)
    .values(codes.map((c) => ({ userId, codeHash: tokenHash(normalizeCode(c)) })));
  return codes;
}

/** Spends a recovery code; true when it was valid and unused. */
export async function spendRecoveryCode(db: Db, userId: string, code: string): Promise<boolean> {
  const clean = normalizeCode(code);
  if (clean.length !== 10) return false;
  const result = await db
    .update(recoveryCodes)
    .set({ usedAt: Date.now() })
    .where(
      and(
        eq(recoveryCodes.userId, userId),
        eq(recoveryCodes.codeHash, tokenHash(clean)),
        isNull(recoveryCodes.usedAt),
      ),
    );
  return (result.rowCount ?? 0) > 0;
}

export async function recoveryCodesLeft(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));
  return row?.n ?? 0;
}

// Passkeys

export async function listPasskeys(db: Db, userId: string) {
  return db
    .select({
      id: passkeys.id,
      name: passkeys.name,
      createdAt: passkeys.createdAt,
      lastUsedAt: passkeys.lastUsedAt,
      transports: passkeys.transports,
    })
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .orderBy(passkeys.createdAt);
}

export async function addPasskey(
  db: Db,
  input: {
    id: string;
    userId: string;
    name: string;
    publicKey: string;
    counter: number;
    transports: string[];
  },
) {
  await db.insert(passkeys).values({ ...input, transports: input.transports.join(",") });
}

export async function findPasskey(db: Db, id: string) {
  const [row] = await db.select().from(passkeys).where(eq(passkeys.id, id));
  return row ?? null;
}

export async function touchPasskey(db: Db, id: string, counter: number) {
  await db.update(passkeys).set({ counter, lastUsedAt: Date.now() }).where(eq(passkeys.id, id));
}

/** Removes one of the user's own passkeys; false when it is not theirs. */
export async function removePasskey(db: Db, userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)));
  return (result.rowCount ?? 0) > 0;
}
