import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { resolveDatabaseUrl } from "@/lib/db/url";
import { getDatabaseEnv } from "@/lib/env";
import * as schema from "./schema";

let pool: pg.Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * VPS / Docker (EC2, Railway, etc.): standard PostgreSQL wire protocol via `pg`.
 * Neon's pooler endpoint (`*-pooler.*.neon.tech`) works with SSL from Node.
 */
export function getDb() {
  if (!db) {
    pool = new pg.Pool({
      connectionString: resolveDatabaseUrl(getDatabaseEnv().DATABASE_URL),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      ssl: { rejectUnauthorized: true },
    });
    db = drizzle(pool, { schema });
  }
  return db;
}

/** Hostname only — safe for logs (no credentials). */
export function getDatabaseHostForLogs(): string | null {
  try {
    return new URL(resolveDatabaseUrl(getDatabaseEnv().DATABASE_URL)).hostname;
  } catch {
    return null;
  }
}

export type Database = ReturnType<typeof getDb>;
