import { cookies } from "next/headers";
import { CHALLENGE_MINUTES } from "@/services/factors";

/**
 * The cookie that carries a sign-in between the password and the code: it
 * names a short-lived challenge, not a session, so it opens nothing on its
 * own.
 */

export const PENDING_COOKIE = "distil_pending";

export async function setPending(token: string) {
  (await cookies()).set(PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_MINUTES * 60,
  });
}

export async function pendingToken(): Promise<string | undefined> {
  return (await cookies()).get(PENDING_COOKIE)?.value;
}

export async function clearPending() {
  (await cookies()).delete(PENDING_COOKIE);
}
