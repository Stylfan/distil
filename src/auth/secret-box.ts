import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Encryption at rest for the few secrets the database must be able to give
 * back (the TOTP secret): AES-256-GCM with a key derived from
 * DISTIL_SECRET, which lives in the environment and never in the code or
 * the database. A copy of the database alone does not reveal them.
 */

const VERSION = "v1";

function key(secret = process.env.DISTIL_SECRET): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error("DISTIL_SECRET must be set to at least 32 characters; see .env.example");
  }
  return Buffer.from(hkdfSync("sha256", secret, "distil", "secret-box", 32));
}

export function seal(plain: string, secret?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, body]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function open(sealed: string, secret?: string): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || body === undefined)
    throw new Error("secret-box: unknown format");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
