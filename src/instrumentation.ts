export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  try {
    const { resolveDatabaseConnectionString } = await import("@/lib/db/connection-string");
    resolveDatabaseConnectionString();
  } catch {
    console.error("[startup] Database is not configured (set DATABASE_URL or POSTGRES_USER/PASSWORD/DB).");
    return;
  }

  try {
    const { getDatabaseHostForLogs, getDb } = await import("@/lib/db");
    const { formatDbError, withDbRetry } = await import("@/lib/db/retry");
    const { sql } = await import("drizzle-orm");
    await withDbRetry(() => getDb().execute(sql`select 1`));
    console.info("[startup] database reachable", { host: getDatabaseHostForLogs() });
  } catch (error) {
    const { getDatabaseHostForLogs } = await import("@/lib/db");
    const { formatDbError } = await import("@/lib/db/retry");
    console.error("[startup] database unreachable", {
      host: getDatabaseHostForLogs(),
      error: formatDbError(error),
    });
  }

  if (process.env.DISABLE_PUBLISH_SCHEDULER === "1") return;

  try {
    const { startPublishScheduler } = await import("@/lib/publish/scheduler");
    await startPublishScheduler();
  } catch (error) {
    const { formatDbError } = await import("@/lib/db/retry");
    console.error("[startup] publish scheduler failed to start", { error: formatDbError(error) });
  }
}
