import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { resolveDatabaseUrl } from "@/lib/db/url";
import { getDatabaseEnv } from "@/lib/env";
import * as schema from "./schema";

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Long-running servers (Docker on EC2, Railway, etc.) use Neon's WebSocket pool.
 * The HTTP driver (`drizzle-orm/neon-http`) is better suited to edge/serverless.
 */
export function getDb() {
  if (!db) {
    neonConfig.webSocketConstructor = ws;
    pool = new Pool({ connectionString: resolveDatabaseUrl(getDatabaseEnv().DATABASE_URL) });
    db = drizzle(pool, { schema });
  }
  return db;
}

export type Database = ReturnType<typeof getDb>;
