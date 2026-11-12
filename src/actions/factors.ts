"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import QRCode from "qrcode";
import { z } from "zod";
import { checkSecondFactor } from "@/auth/check-code";
import { registrationOptions, verifyRegistration } from "@/auth/passkeys";
import { allowAttempt } from "@/auth/rate-limit";
import { open, seal } from "@/auth/secret-box";
import { currentUser } from "@/auth/session";
import { newTotpSecret, otpauthUri, verifyTotp } from "@/auth/totp";
import { getDb } from "@/db/client";
import {
  addPasskey,
  createChallenge,
  deleteChallenge,
  disableTotp,
  enableTotp,
  failChallenge,
  findChallenge,
  listPasskeys,
  removePasskey,
  replaceRecoveryCodes,
} from "@/services/factors";

/**
 * Setting up the ways in, for the signed-in account: two-step sign-in with
 * an authenticator app, and passkeys. Every action starts from the session
 * and checks that the challenge it is handed was made for that same
 * account.
 */

export type FactorError = "unauthorized" | "invalid" | "code" | "expired" | "tooMany" | "generic";
type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: FactorError };

const Token = z.string().min(1).max(200);
const Code = z.string().trim().min(6).max(20);
const Credential = z
  .object({ id: z.string().min(1).max(1024), type: z.literal("public-key") })
  .passthrough();

/** Starts two-step sign-in: a new secret, shown once as a QR code and as text. */
export async function totpBeginAction(): Promise<
  Result<{ token: string; secret: string; qr: string }>
> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (user.totpSecret) return { ok: false, error: "invalid" };
  const secret = newTotpSecret();
  const token = await createChallenge(getDb(), {
    userId: user.id,
    purpose: "totp-setup",
    value: seal(secret),
  });
  const qr = await QRCode.toString(otpauthUri(secret, user.email), { type: "svg", margin: 1 });
  return { ok: true, data: { token, secret, qr } };
}

/** Turns two-step sign-in on once the app shows a right code; answers with the recovery codes. */
export async function totpConfirmAction(raw: unknown): Promise<Result<string[]>> {
  const parsed = z.object({ token: Token, code: Code }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "code" };
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const db = getDb();
  const challenge = await findChallenge(db, parsed.data.token, "totp-setup");
  if (!challenge || challenge.userId !== user.id) return { ok: false, error: "expired" };
  const step = verifyTotp(open(challenge.value), parsed.data.code, null);
  if (step === null) {
    await failChallenge(db, parsed.data.token);
    return { ok: false, error: "code" };
  }
  const codes = await db.transaction(async (tx) => {
    await enableTotp(tx, user.id, challenge.value, step);
    await deleteChallenge(tx, parsed.data.token);
    return replaceRecoveryCodes(tx, user.id);
  });
  return { ok: true, data: codes };
}

/** Turns two-step sign-in off; asks for a code first, so a borrowed session cannot. */
export async function totpDisableAction(raw: unknown): Promise<Result> {
  const parsed = z.object({ code: Code }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "code" };
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!allowAttempt(`code:${user.id}`)) return { ok: false, error: "tooMany" };
  const db = getDb();
  if (!(await checkSecondFactor(db, user, parsed.data.code))) return { ok: false, error: "code" };
  await disableTotp(db, user.id);
  return { ok: true, data: undefined };
}

/** New recovery codes, after a code from the app; the old ones stop working. */
export async function recoveryCodesAction(raw: unknown): Promise<Result<string[]>> {
  const parsed = z.object({ code: Code }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "code" };
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!allowAttempt(`code:${user.id}`)) return { ok: false, error: "tooMany" };
  const db = getDb();
  if (!(await checkSecondFactor(db, user, parsed.data.code))) return { ok: false, error: "code" };
  return { ok: true, data: await replaceRecoveryCodes(db, user.id) };
}

export async function passkeyBeginAction(): Promise<Result<{ token: string; options: unknown }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const db = getDb();
  const options = await registrationOptions(user, await listPasskeys(db, user.id));
  const token = await createChallenge(db, {
    userId: user.id,
    purpose: "passkey-register",
    value: options.challenge,
  });
  return { ok: true, data: { token, options } };
}

export async function passkeyFinishAction(raw: unknown): Promise<Result> {
  const parsed = z
    .object({ token: Token, name: z.string().trim().max(60), response: Credential })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const db = getDb();
  const challenge = await findChallenge(db, parsed.data.token, "passkey-register");
  if (!challenge || challenge.userId !== user.id) return { ok: false, error: "expired" };
  await deleteChallenge(db, parsed.data.token);
  try {
    const credential = await verifyRegistration(
      parsed.data.response as unknown as RegistrationResponseJSON,
      challenge.value,
    );
    if (!credential) return { ok: false, error: "invalid" };
    await addPasskey(db, { ...credential, userId: user.id, name: parsed.data.name });
  } catch (error) {
    console.error("passkey registration refused", error);
    return { ok: false, error: "generic" };
  }
  return { ok: true, data: undefined };
}

export async function passkeyRemoveAction(raw: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().min(1).max(1024) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const removed = await removePasskey(getDb(), user.id, parsed.data.id);
  return removed ? { ok: true, data: undefined } : { ok: false, error: "invalid" };
}
