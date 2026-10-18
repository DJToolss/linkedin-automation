import { readFileSync } from "node:fs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

function loadEnvFile() {
  try {
    const text = readFileSync(".env", "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* optional .env */
  }
}

function resolveDatabaseConnectionString() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct.replace(/^["']|["']$/g, "");

  const user = process.env.POSTGRES_USER ?? process.env.DATABASE_USER;
  const password = process.env.POSTGRES_PASSWORD ?? process.env.DATABASE_PASSWORD;
  const database = process.env.POSTGRES_DB ?? process.env.DATABASE_NAME;
  const host = process.env.DATABASE_HOST ?? "localhost";
  const port = process.env.DATABASE_PORT ?? "5432";

  if (!user || !password || !database) {
    throw new Error("Set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB.");
  }

  const url = new URL(`postgresql://${host}:${port}/${encodeURIComponent(database)}`);
  url.username = user;
  url.password = password;
  url.searchParams.set(
    "sslmode",
    process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1" ? "require" : "disable",
  );
  return url.toString();
}

function pgPoolSsl(connectionString) {
  try {
    const sslmode = new URL(connectionString).searchParams.get("sslmode");
    if (!sslmode || sslmode === "disable" || sslmode === "prefer") return false;
    if (sslmode === "require" || sslmode === "verify-full") return { rejectUnauthorized: true };
  } catch {
    /* ignore */
  }
  if (process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1") {
    return { rejectUnauthorized: true };
  }
  return false;
}

loadEnvFile();
const connectionString = resolveDatabaseConnectionString();
const pool = new pg.Pool({
  connectionString,
  ssl: pgPoolSsl(connectionString),
});
const db = drizzle(pool);

try {
  console.log(`Applying migrations to ${new URL(connectionString).host} …`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.cause) console.error(String(error.cause));
  process.exit(1);
} finally {
  await pool.end();
}
