import { sql } from "drizzle-orm";
import { createDb, type Database } from "@/db/client";

/**
 * The test database, created and migrated once by tests/global-setup.ts.
 * Service tests run as the database owner, which row-level security does
 * not bind, so they test the services' own ownership checks; the
 * isolation tests connect as distil_app to test the policies.
 */

export const TEST_DB = "distil_test";

export function testUrl(role: "owner" | "app"): string {
  const base = new URL(
    process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5434/distil",
  );
  base.pathname = `/${TEST_DB}`;
  if (role === "app") {
    base.username = "distil_app";
    base.password = process.env.DISTIL_APP_PASSWORD ?? "distil_app";
  }
  return base.toString();
}

let owner: Database | undefined;
let app: Database | undefined;

export function ownerDb(): Database {
  owner ??= createDb(testUrl("owner"));
  return owner;
}

export function appDb(): Database {
  app ??= createDb(testUrl("app"));
  return app;
}

/** Empties every table, the append-only audit log included, and returns the owner connection. */
export async function freshDb(): Promise<Database> {
  const db = ownerDb();
  await db.transaction(async (tx) => {
    // Replica mode skips triggers, among them the one that guards the audit log.
    await tx.execute(sql`set local session_replication_role = replica`);
    await tx.execute(sql`truncate users, sessions, usage_days, workshops, audit_log cascade`);
  });
  return db;
}

/** The database's own message for a query that must fail; Drizzle wraps it in `cause`. */
export async function failure(query: Promise<unknown>): Promise<string> {
  try {
    await query;
  } catch (error) {
    const e = error as { message: string; cause?: { message?: string } };
    return e.cause?.message ?? e.message;
  }
  return "did not fail";
}
