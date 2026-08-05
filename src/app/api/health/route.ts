import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** Unauthenticated by design (for uptime monitors); never returns internal error detail. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("health check failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
