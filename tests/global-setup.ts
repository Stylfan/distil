import pg from "pg";
import { runMigrations } from "../scripts/migrate.mjs";
import { TEST_DB, testUrl } from "./db";

/** Creates the test database when it is missing and brings it up to date. */
export default async function setup() {
  try {
    process.loadEnvFile(".env");
  } catch {}
  const admin = new URL(testUrl("owner"));
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [
    TEST_DB,
  ]);
  if (!rowCount) await client.query(`create database ${TEST_DB}`);
  await client.end();
  await runMigrations(testUrl("owner"), process.env.DISTIL_APP_PASSWORD ?? "distil_app");
}
