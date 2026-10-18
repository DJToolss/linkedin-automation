import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { resolveDatabaseConnectionString } from "@/lib/db/connection-string";
import { getDatabaseHostForLogs, getDb } from "@/lib/db";
import { formatDbError, withDbRetry } from "@/lib/db/retry";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** Unauthenticated by design (for uptime monitors); never returns internal error detail. */
export async function GET() {
  try {
    await withDbRetry(() => getDb().execute(sql`select 1`));
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("health check failed", {
      error: formatDbError(error),
      databaseHost: getDatabaseHostForLogs(),
      databaseConfigured: (() => {
        try {
          resolveDatabaseConnectionString();
          return true;
        } catch {
          return false;
        }
      })(),
    });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
