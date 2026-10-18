import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { resolveDatabaseConnectionString } from "./src/lib/db/connection-string";

loadEnvConfig(process.cwd());

let databaseUrl: string;
try {
  databaseUrl = resolveDatabaseConnectionString();
} catch {
  throw new Error(
    "Database is not configured. Set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB before running Drizzle.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
