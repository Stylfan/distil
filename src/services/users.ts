import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull, or, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/auth/password";
import type { Db } from "@/db/client";
import { sessions, users, type User } from "@/db/schema";
import { limits } from "@/domain/limits";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * Accounts and sessions. Anyone may create an account unless
 * DISTIL_SIGNUP=closed; a new account may have a few photos read
 * (src/domain/limits.ts) until the operator allows more. Sessions are
 * random tokens of which only the SHA-256 is stored. Users and sessions
 * are not workshop data, so they sit outside row-level security; the
 * application reaches them only through these functions.
 */

export const SESSION_DAYS = 30;

export class SignupClosed extends Error {
  constructor() {
    super("signupClosed");
  }
}

export class EmailTaken extends Error {
  constructor() {
    super("emailTaken");
  }
}

const normalize = (email: string) => email.trim().toLowerCase();
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");

// A hash of nothing in particular, verified when the address is unknown so
// the answer takes as long either way.
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function signupOpen(db: Db, setting = process.env.DISTIL_SIGNUP): Promise<boolean> {
  // A demo installation has visits; real accounts only when its operator opens sign-up.
  if (isDemoMode()) return setting === "open";
  if (setting !== "closed") return true;
  // Even a closed installation needs its first account.
  const [row] = await db.select({ n: count() }).from(users);
  return (row?.n ?? 0) === 0;
}

export async function registerUser(
  db: Db,
  input: { email: string; name: string; password: string },
  setting = process.env.DISTIL_SIGNUP,
): Promise<User> {
  if (!(await signupOpen(db, setting))) throw new SignupClosed();
  const email = normalize(input.email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new EmailTaken();
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email, name: input.name.trim(), passwordHash, photoAllowance: limits().allowance })
    .returning();
  return user!;
}

export async function findUserByEmail(db: Db, email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalize(email)));
  return user ?? null;
}

/** The user for an e-mail and password, or null. Always runs a hash, so timing says nothing. */
export async function authenticate(db: Db, email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(db, email);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  // A demo visit has no password anyone knows, and never signs in with one.
  return user && ok && user.demoExpiresAt === null ? user : null;
}

export async function createSession(db: Db, userId: string, now = Date.now()): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db
    .insert(sessions)
    .values({ id: tokenHash(token), userId, expiresAt: now + SESSION_DAYS * 86_400_000 });
  return token;
}

export async function userForSession(
  db: Db,
  token: string,
  now = Date.now(),
): Promise<User | null> {
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, tokenHash(token)),
        gt(sessions.expiresAt, now),
        // A demo visit ends when its time is up, even before the cleanup has run.
        or(isNull(users.demoExpiresAt), gt(users.demoExpiresAt, now)),
      ),
    );
  return row?.user ?? null;
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.id, tokenHash(token)));
}

/**
 * Deletes the account and everything it owns, its audit trail included,
 * through the database function that alone may erase audit rows. Must run
 * inside withUser() for that same account.
 */
export async function deleteAccount(db: Db, userId: string) {
  await db.execute(sql`select delete_account(${userId})`);
}

export async function findUserById(db: Db, id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
