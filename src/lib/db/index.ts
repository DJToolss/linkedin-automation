import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseEnv } from "@/lib/env";
import * as schema from "./schema";

export function getDb() {
  return drizzle(neon(getDatabaseEnv().DATABASE_URL), { schema });
}

export type Database = ReturnType<typeof getDb>;
