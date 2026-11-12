/**
 * A small in-memory limit on sign-in attempts per e-mail: enough to make
 * guessing a password slow on a single server, which is all Distil runs
 * on. It resets when the server restarts.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; since: number }>();

export function allowAttempt(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry || now - entry.since > WINDOW_MS) {
    attempts.set(key, { count: 1, since: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
