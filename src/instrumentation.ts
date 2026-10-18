export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (!process.env.DATABASE_URL) {
    console.error("[startup] DATABASE_URL is not set — database access will fail.");
  } else {
    try {
      const { getDatabaseHostForLogs, getDb } = await import("@/lib/db");
      const { formatDbError, withDbRetry } = await import("@/lib/db/retry");
      const { sql } = await import("drizzle-orm");
      await withDbRetry(() => getDb().execute(sql`select 1`));
      console.info("[startup] database reachable", { host: getDatabaseHostForLogs() });
    } catch (error) {
      console.error("[startup] database unreachable", {
        host: (await import("@/lib/db")).getDatabaseHostForLogs(),
        error: (await import("@/lib/db/retry")).formatDbError(error),
      });
    }
  }

  if (process.env.DISABLE_PUBLISH_SCHEDULER === "1") return;

  const { startPublishScheduler } = await import("@/lib/publish/scheduler");
  await startPublishScheduler();
}
