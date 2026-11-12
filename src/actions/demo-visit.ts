"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser, endSession, startSession } from "@/auth/session";
import { allowAttempt } from "@/auth/rate-limit";
import { getDb, withUser } from "@/db/client";
import { createExampleWorkshop } from "@/demo/example";
import { isDemoMode } from "@/lib/demo-mode";
import { DemoFull, cleanExpiredDemos, startDemoVisit } from "@/services/demo-visits";
import { deleteAccount } from "@/services/users";

/**
 * The one button on a demo installation's front page: a throwaway account,
 * with its own copy of the example workshop, signed in, and straight to the workshops.
 * A few visits per address per quarter of an hour; when the demo is full
 * or the limit is hit, the page says so instead.
 */
export async function startDemoAction(): Promise<void> {
  if (!isDemoMode()) redirect("/login");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowAttempt(`demo:${ip}`)) redirect("/login?demo=busy");
  const db = getDb();
  await cleanExpiredDemos(db);
  try {
    const visit = await startDemoVisit(db);
    // The example workshop, so the visitor sees at once what Distil makes of a wall.
    await withUser(visit.userId, (tx) => createExampleWorkshop(tx, visit.userId), db).catch(() => {
      console.error("demo: example workshop not created");
    });
    await startSession(visit.userId);
  } catch (error) {
    if (error instanceof DemoFull) redirect("/login?demo=full");
    throw error;
  }
  redirect("/");
}

/**
 * Ends a demo visit now: the visit and all it made are deleted, the same
 * way the cleanup would have done it later. A real account is left alone;
 * it is deleted from its own form, with its address as the confirmation.
 */
export async function endDemoAction(): Promise<void> {
  const user = await currentUser();
  if (user && user.demoExpiresAt !== null) {
    await withUser(user.id, (tx) => deleteAccount(tx, user.id));
    await endSession();
  }
  redirect("/login");
}
