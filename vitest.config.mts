import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // One shared test database (see tests/db.ts), emptied before each test,
    // so the files run one after another.
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
  },
});
