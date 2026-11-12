// Applies the migrations as the database owner, then gives the
// application's role its login and password. Plain Node, so it runs in the
// production image without a TypeScript toolchain.
//
// Roles are set here rather than in a Postgres init script: an init script
// runs only on an empty data directory and fails silently when its folder
// is missing, which is exactly what went wrong in Ajour's first deployment.

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// A local .env, when there is one; a deployment sets the variables itself.
try {
  process.loadEnvFile(".env");
} catch {}

export async function runMigrations(url, appPassword) {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    if (appPassword) {
      // format(%L) quotes the password inside Postgres, so a quote in it injects nothing.
      const { rows } = await pool.query(
        "select format('ALTER ROLE distil_app LOGIN PASSWORD %L', $1::text) as sql",
        [appPassword],
      );
      await pool.query(rows[0].sql);
    }
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/migrate.mjs");
if (isMain) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    console.error("migrate: MIGRATION_DATABASE_URL is not set; see .env.example");
    process.exit(1);
  }
  runMigrations(url, process.env.DISTIL_APP_PASSWORD)
    .then(() => console.log("migrate: done"))
    .catch((error) => {
      if (error?.code === "ECONNREFUSED") {
        console.error(
          `migrate: Nothing answers on ${new URL(url).host}. Is the database running? (pnpm db:up)`,
        );
      } else {
        console.error("migrate:", error?.message ?? error);
      }
      process.exit(1);
    });
}
