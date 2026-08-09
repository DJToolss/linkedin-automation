export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.DISABLE_PUBLISH_SCHEDULER === "1") return;

  const { startPublishScheduler } = await import("@/lib/publish/scheduler");
  await startPublishScheduler();
}
