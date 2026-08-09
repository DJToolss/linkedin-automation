import "server-only";

import { randomUUID } from "node:crypto";

import { mapWithConcurrency } from "@/lib/concurrency";
import { getUsableConnection, markConnectionRequiresReconnect } from "@/lib/linkedin/connection";
import { fetchPostImageBytes, initializeImageUpload, uploadImageBytes } from "@/lib/linkedin/images";
import { composeLinkedInCommentary } from "@/lib/linkedin/commentary-format";
import { createLinkedInPost } from "@/lib/linkedin/posts-api";
import { LinkedInPublishError, type FailureCategory } from "@/lib/linkedin/publish-error";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { type Logger, logger } from "@/lib/logger";
import { resolveAttempt, startAttempt } from "@/lib/publish/attempts";
import { claimDuePosts, claimScheduledPost, findAbandonedLeases, recoverAbandonedLease, type ClaimedPost } from "@/lib/publish/claim";

export const MAX_ATTEMPTS = 5;
export const RETRY_BASE_MS = 60 * 1000;
export const RETRY_MAX_MS = 30 * 60 * 1000;
const PROCESS_CONCURRENCY = 3;

/** Exported for unit testing; also used directly below to schedule a retry. */
export function computeRetryBackoffMs(attemptNumber: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** (attemptNumber - 1), RETRY_MAX_MS);
}

async function handleFailure(
  post: ClaimedPost,
  attemptId: string,
  attemptNumber: number,
  category: FailureCategory,
  errorCode: string,
  errorMessage: string,
  log: Logger,
): Promise<void> {
  if (category === "reconnect") {
    log.warn("post requires reconnect", { errorCode, errorMessage });
    await markConnectionRequiresReconnect(post.userId);
    await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "requires_reconnect", errorCode, errorMessage });
    return;
  }

  if (category === "retryable" && attemptNumber < MAX_ATTEMPTS) {
    const nextScheduledAt = new Date(Date.now() + computeRetryBackoffMs(attemptNumber));
    log.warn("post failed, retry scheduled", { errorCode, errorMessage, attemptNumber, nextScheduledAt });
    await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "retry_scheduled", nextScheduledAt, errorCode, errorMessage });
    const { schedulePostPublish } = await import("@/lib/publish/scheduler");
    schedulePostPublish(post.id, nextScheduledAt);
    return;
  }

  log.error("post failed permanently", { errorCode, errorMessage, attemptNumber });
  await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "failed", errorCode, errorMessage });
}

/**
 * Processes one already-claimed post end to end. Errors thrown by the
 * LinkedIn API helpers arrive pre-classified as `LinkedInPublishError`;
 * anything else (a bug, an unexpected network failure) is treated as
 * retryable rather than left to crash and abandon the lease silently — the
 * lease-recovery pass is the backstop either way.
 */
async function processClaimedPost(post: ClaimedPost, requestLog: Logger): Promise<boolean> {
  const { attemptId, attemptNumber } = await startAttempt(post.id);
  const log = requestLog.child({ postId: post.id, userId: post.userId, attemptId, attemptNumber });
  log.info("attempt started");

  try {
    const connection = await getUsableConnection(post.userId);
    if (!connection) {
      log.warn("no usable LinkedIn connection");
      await resolveAttempt(post.id, post.claimToken, attemptId, {
        kind: "requires_reconnect",
        errorCode: "connection_unavailable",
        errorMessage: "LinkedIn is not connected, or the connection must be reconnected before this post can publish.",
      });
      return false;
    }

    let imageUrn: string | undefined;
    if (post.imageUrl) {
      const { bytes, contentType } = await fetchPostImageBytes(post.imageUrl);
      const initialized = await initializeImageUpload(connection.accessToken, connection.personUrn);
      await uploadImageBytes(connection.accessToken, initialized.uploadUrl, bytes, contentType);
      imageUrn = initialized.imageUrn;
    }

    const linkedinPostUrn = await createLinkedInPost(connection.accessToken, {
      authorUrn: connection.personUrn,
      commentary: composeLinkedInCommentary({
        heading: post.heading,
        subHeading: post.subHeading,
        description: post.content,
      }),
      imageUrn,
    });

    log.info("attempt succeeded", { linkedinPostUrn });
    await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "posted", linkedinPostUrn });
    return true;
  } catch (error) {
    if (error instanceof LinkedInPublishError) {
      await handleFailure(post, attemptId, attemptNumber, error.category, `linkedin_${error.category}`, error.message, log);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error.";
      await handleFailure(post, attemptId, attemptNumber, "retryable", "unexpected_error", message, log);
    }
    return false;
  }
}

export type PublishRunSummary = { requestId: string; recovered: number; claimed: number; succeeded: number; failed: number };

const TIMER_CLAIM_RETRY_MS = 2_000;
const TIMER_CLAIM_MAX_ATTEMPTS = 5;

async function claimWithTimerRetries(postId: string, log: Logger): Promise<ClaimedPost | null> {
  for (let attempt = 1; attempt <= TIMER_CLAIM_MAX_ATTEMPTS; attempt++) {
    const claimed = await claimScheduledPost(postId);
    if (claimed) return claimed;

    if (attempt < TIMER_CLAIM_MAX_ATTEMPTS) {
      log.warn("scheduled post not yet claimable, retrying", { postId, attempt, retryInMs: TIMER_CLAIM_RETRY_MS });
      await new Promise((resolve) => setTimeout(resolve, TIMER_CLAIM_RETRY_MS));
    }
  }

  log.error("scheduled post was not claimable after timer fired", { postId, attempts: TIMER_CLAIM_MAX_ATTEMPTS });
  const [row] = await getDb()
    .select({ status: posts.status, scheduledAt: posts.scheduledAt })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (row) {
    log.error("scheduled post state at claim failure", {
      postId,
      status: row.status,
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
    });
  }
  return null;
}

export async function runPublishBatch(requestId: string = randomUUID()): Promise<PublishRunSummary> {
  const log = logger.child({ requestId, scope: "publisher" });
  log.info("publish batch started");

  const abandoned = await findAbandonedLeases();
  if (abandoned.length > 0) log.warn("recovering abandoned leases", { count: abandoned.length });
  await mapWithConcurrency(abandoned, PROCESS_CONCURRENCY, recoverAbandonedLease);

  const claimed = await claimDuePosts();
  const outcomes = await mapWithConcurrency(claimed, PROCESS_CONCURRENCY, async (post) => {
    try {
      return await processClaimedPost(post, log);
    } catch (error) {
      // processClaimedPost already resolves the attempt on any known
      // failure path; reaching here means resolution itself threw. Log and
      // move on — the lease will still expire and be recovered.
      log.error("unhandled error while publishing post", { postId: post.id, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  });

  const summary: PublishRunSummary = {
    requestId,
    recovered: abandoned.length,
    claimed: claimed.length,
    succeeded: outcomes.filter(Boolean).length,
    failed: outcomes.filter((ok) => !ok).length,
  };
  log.info("publish batch finished", summary);
  return summary;
}

/** Publishes one timer-targeted post, with retries if the DB clock is slightly behind Node. */
export async function runPublishBatchForPost(postId: string, requestId: string = randomUUID()): Promise<PublishRunSummary> {
  const log = logger.child({ requestId, scope: "publisher", postId });
  log.info("publish batch started");

  const abandoned = await findAbandonedLeases();
  if (abandoned.length > 0) log.warn("recovering abandoned leases", { count: abandoned.length });
  await mapWithConcurrency(abandoned, PROCESS_CONCURRENCY, recoverAbandonedLease);

  const claimed = await claimWithTimerRetries(postId, log);
  let succeeded = 0;
  let failed = 0;

  if (claimed) {
    const ok = await processClaimedPost(claimed, log).catch((error) => {
      log.error("unhandled error while publishing post", { error: error instanceof Error ? error.message : String(error) });
      return false;
    });
    if (ok) succeeded = 1;
    else failed = 1;
  }

  const summary: PublishRunSummary = {
    requestId,
    recovered: abandoned.length,
    claimed: claimed ? 1 : 0,
    succeeded,
    failed,
  };
  log.info("publish batch finished", summary);
  return summary;
}
