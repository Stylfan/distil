"use server";

import { headers } from "next/headers";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { checkSecondFactor } from "@/auth/check-code";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import { authenticationOptions, verifyAuthentication } from "@/auth/passkeys";
import { allowAttempt, clearAttempts } from "@/auth/rate-limit";
import { clearPending, pendingToken, setPending } from "@/auth/second-factor";
import { endSession, startSession } from "@/auth/session";
import { getDb } from "@/db/client";
import {
  createChallenge,
  deleteChallenge,
  failChallenge,
  findChallenge,
  findPasskey,
  touchPasskey,
} from "@/services/factors";
import {
  EmailTaken,
  SignupClosed,
  authenticate,
  findUserById,
  registerUser,
} from "@/services/users";

/**
 * Signing up, in and out. Failures to sign in are worded the same whether
 * the address exists or the password is wrong, and attempts are limited.
 * With two-step sign-in on, a right password leads to the code step, not
 * to a session. A passkey signs in on its own.
 */

export type AuthResult =
  | { ok: true; next?: "code" }
  | {
      ok: false;
      error:
        "invalid" | "credentials" | "tooMany" | "signupClosed" | "emailTaken" | "code" | "expired";
    };

const Email = z.string().trim().toLowerCase().email().max(200);

const LoginSchema = z.object({ email: Email, password: z.string().min(1).max(200) });

const RegisterSchema = z.object({
  email: Email,
  name: z.string().trim().max(80),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

const CodeSchema = z.object({ code: z.string().trim().min(6).max(20) });

/** The browser's answer to a WebAuthn request; the library checks its contents. */
const CredentialSchema = z
  .object({ id: z.string().min(1).max(1024), type: z.literal("public-key") })
  .passthrough();

const PasskeyLoginSchema = z.object({
  token: z.string().min(1).max(200),
  response: CredentialSchema,
});

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function loginAction(raw: unknown): Promise<AuthResult> {
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { email, password } = parsed.data;
  if (!allowAttempt(email)) return { ok: false, error: "tooMany" };
  const db = getDb();
  const user = await authenticate(db, email, password);
  if (!user) return { ok: false, error: "credentials" };
  clearAttempts(email);
  if (user.totpSecret) {
    await setPending(await createChallenge(db, { userId: user.id, purpose: "second-factor" }));
    return { ok: true, next: "code" };
  }
  await startSession(user.id);
  return { ok: true };
}

/** The second step: a code from the app, or a recovery code. */
export async function secondFactorAction(raw: unknown): Promise<AuthResult> {
  const parsed = CodeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "code" };
  const token = await pendingToken();
  const db = getDb();
  const challenge = token ? await findChallenge(db, token, "second-factor") : null;
  const user = challenge?.userId ? await findUserById(db, challenge.userId) : null;
  if (!token || !user) return { ok: false, error: "expired" };
  if (!allowAttempt(`code:${user.id}`)) return { ok: false, error: "tooMany" };
  if (!(await checkSecondFactor(db, user, parsed.data.code))) {
    await failChallenge(db, token);
    return { ok: false, error: "code" };
  }
  clearAttempts(`code:${user.id}`);
  await deleteChallenge(db, token);
  await clearPending();
  await startSession(user.id);
  return { ok: true };
}

export async function passkeyOptionsAction() {
  if (!allowAttempt(`passkey:${await clientKey()}`)) return null;
  const options = await authenticationOptions();
  const token = await createChallenge(getDb(), {
    userId: null,
    purpose: "passkey-login",
    value: options.challenge,
  });
  return { token, options };
}

export async function passkeyLoginAction(raw: unknown): Promise<AuthResult> {
  const parsed = PasskeyLoginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "credentials" };
  const db = getDb();
  const { token, response } = parsed.data;
  const challenge = await findChallenge(db, token, "passkey-login");
  if (!challenge) return { ok: false, error: "expired" };
  // A challenge answers one attempt only.
  await deleteChallenge(db, token);
  const stored = await findPasskey(db, response.id);
  if (!stored) return { ok: false, error: "credentials" };
  try {
    const counter = await verifyAuthentication(
      response as unknown as AuthenticationResponseJSON,
      challenge.value,
      stored,
    );
    if (counter === null) return { ok: false, error: "credentials" };
    await touchPasskey(db, stored.id, counter);
  } catch (error) {
    console.error("passkey sign-in refused", error);
    return { ok: false, error: "credentials" };
  }
  await startSession(stored.userId);
  return { ok: true };
}

export async function registerAction(raw: unknown): Promise<AuthResult> {
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const user = await registerUser(getDb(), parsed.data);
    await startSession(user.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof SignupClosed) return { ok: false, error: "signupClosed" };
    if (error instanceof EmailTaken) return { ok: false, error: "emailTaken" };
    console.error("registration failed", error);
    return { ok: false, error: "invalid" };
  }
}

export async function logoutAction(): Promise<void> {
  await endSession();
}
