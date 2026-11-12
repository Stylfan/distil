import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The connection to Postgres. The application connects as distil_app,
 * a role that owns nothing, so row-level security applies to everything it
 * does. Work on a programme runs through withUser(), which opens a
 * transaction and tells the database who is acting; the policies in
 * drizzle/0001_roles_rls_audit.sql do the rest.
 */

export type Database = NodePgDatabase<typeof schema>;
export type Tx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
/** What services take: the database itself, or a transaction with a user set. */
export type Db = Database | Tx;

export function createDb(url: string): Database {
  return drizzle(new Pool({ connectionString: url, max: 10 }), { schema });
}

// One pool per server process, kept across hot reloads in development.
const globalForDb = globalThis as unknown as { distilDb?: Database };

export function getDb(): Database {
  if (!globalForDb.distilDb) {
    const url = process.env.APP_DATABASE_URL;
    if (!url) throw new Error("APP_DATABASE_URL is not set; see .env.example");
    globalForDb.distilDb = createDb(url);
  }
  return globalForDb.distilDb;
}

/**
 * Runs `fn` in a transaction acting as `userId`. The setting is local to
 * the transaction, so a pooled connection never carries one user's identity
 * into another's request.
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
  db: Database = getDb(),
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
