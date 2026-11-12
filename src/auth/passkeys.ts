import { headers } from "next/headers";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";

/**
 * Passkeys (WebAuthn) through @simplewebauthn/server. The relying party is
 * the address Distil is served from: DISTIL_URL when it is set, as it
 * should be in production, otherwise the address of the request, which is
 * fine on localhost. A passkey made for one address does not work on
 * another, by design of WebAuthn.
 */

export async function relyingParty(): Promise<{ id: string; origin: string; name: string }> {
  let origin = process.env.DISTIL_URL?.replace(/\/$/, "");
  if (!origin) {
    const h = await headers();
    const host = h.get("host") ?? "localhost";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    origin = `${proto}://${host}`;
  }
  return { id: new URL(origin).hostname, origin, name: "Distil" };
}

export async function registrationOptions(
  user: { id: string; email: string; name: string },
  existing: { id: string; transports: string }[],
) {
  const rp = await relyingParty();
  return generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    userName: user.email,
    userDisplayName: user.name || user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: p.id,
      transports: p.transports ? p.transports.split(",") : undefined,
    })),
    // A discoverable credential, so signing in needs no e-mail first.
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
}

export async function verifyRegistration(response: RegistrationResponseJSON, challenge: string) {
  const rp = await relyingParty();
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
  });
  if (!result.verified) return null;
  const { credential } = result.registrationInfo;
  return {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports ?? [],
  };
}

export async function authenticationOptions() {
  const rp = await relyingParty();
  return generateAuthenticationOptions({ rpID: rp.id, userVerification: "preferred" });
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  challenge: string,
  stored: { id: string; publicKey: string; counter: number; transports: string },
): Promise<number | null> {
  const rp = await relyingParty();
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
    credential: {
      id: stored.id,
      publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
      counter: stored.counter,
      transports: stored.transports ? stored.transports.split(",") : undefined,
    },
  });
  return result.verified ? result.authenticationInfo.newCounter : null;
}
