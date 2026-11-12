import { defineConfig } from "drizzle-kit";

// A local .env, when there is one; a deployment sets the variables itself.
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/schema-accounts.ts"],
  out: "./drizzle",
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL ?? "" },
});
