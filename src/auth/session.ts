import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { User } from "@/db/schema";
import { SESSION_DAYS, createSession, deleteSession, userForSession } from "@/services/users";

/**
 * The session cookie: HttpOnly so scripts cannot read it, SameSite=Lax so
 * other sites cannot post with it, Secure whenever the app is served over
 * HTTPS in production.
 */

export const SESSION_COOKIE = "distil_session";

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? await userForSession(getDb(), token) : null;
}

/** The signed-in user, or a redirect to the sign-in page. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function startSession(userId: string) {
  const token = await createSession(getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  jar.delete(SESSION_COOKIE);
}
