import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { runPublishBatchForPost } from "@/lib/publish/publisher";

/** Node.js setTimeout limit (~24.8 days). Longer waits are re-armed in chunks. */
export const MAX_TIMEOUT_MS = 2_147_483_647;

const timers = new Map<string, NodeJS.Timeout>();
const schedulerLog = logger.child({ scope: "scheduler" });

type SchedulerGlobal = typeof globalThis & { __publishSchedulerStarted?: boolean };

export function cancelScheduledPublish(postId: string): void {
  const timer = timers.get(postId);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(postId);
}

export function schedulePostPublish(postId: string, scheduledAt: Date): void {
  cancelScheduledPublish(postId);
  armTimer(postId, scheduledAt);
}

function armTimer(postId: string, scheduledAt: Date): void {
  const delayMs = scheduledAt.getTime() - Date.now();
  if (delayMs <= 0) {
    void triggerPublish(postId);
    return;
  }

  const waitMs = Math.min(delayMs, MAX_TIMEOUT_MS);
  const timer = setTimeout(() => {
    timers.delete(postId);
    if (waitMs < delayMs) {
      armTimer(postId, scheduledAt);
      return;
    }
    void triggerPublish(postId);
  }, waitMs);

  timers.set(postId, timer);
  schedulerLog.info("post timer armed", { postId, scheduledAt: scheduledAt.toISOString(), waitMs });
}

async function triggerPublish(postId: string): Promise<void> {
  schedulerLog.info("publish timer fired", { postId });
  try {
    await runPublishBatchForPost(postId);
  } catch (error) {
    schedulerLog.error("publish timer failed", {
      postId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listScheduledPostsForPublish(): Promise<Array<{ id: string; scheduledAt: Date | null }>> {
  return getDb()
    .select({ id: posts.id, scheduledAt: posts.scheduledAt })
    .from(posts)
    .where(eq(posts.status, "scheduled"));
}

export async function startPublishScheduler(): Promise<void> {
  const globalState = globalThis as SchedulerGlobal;
  if (globalState.__publishSchedulerStarted) return;
  globalState.__publishSchedulerStarted = true;

  const rows = await listScheduledPostsForPublish();
  for (const row of rows) {
    if (row.scheduledAt) schedulePostPublish(row.id, row.scheduledAt);
  }

  schedulerLog.info("publish scheduler started", { scheduledCount: rows.length });
}
