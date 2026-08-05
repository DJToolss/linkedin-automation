import "server-only";

import { mapWithConcurrency } from "@/lib/concurrency";
import { getUsableConnection, markConnectionRequiresReconnect } from "@/lib/linkedin/connection";
import { fetchPostImageBytes, initializeImageUpload, uploadImageBytes } from "@/lib/linkedin/images";
import { createLinkedInPost } from "@/lib/linkedin/posts-api";
import { LinkedInPublishError, type FailureCategory } from "@/lib/linkedin/publish-error";
import { resolveAttempt, startAttempt } from "@/lib/publish/attempts";
import { claimDuePosts, findAbandonedLeases, recoverAbandonedLease, type ClaimedPost } from "@/lib/publish/claim";

const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_MAX_MS = 30 * 60 * 1000;
const PROCESS_CONCURRENCY = 3;

function backoffMs(attemptNumber: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** (attemptNumber - 1), RETRY_MAX_MS);
}

async function handleFailure(
  post: ClaimedPost,
  attemptId: string,
  attemptNumber: number,
  category: FailureCategory,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  if (category === "reconnect") {
    await markConnectionRequiresReconnect(post.userId);
    await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "requires_reconnect", errorCode, errorMessage });
    return;
  }

  if (category === "retryable" && attemptNumber < MAX_ATTEMPTS) {
    await resolveAttempt(post.id, post.claimToken, attemptId, {
      kind: "retry_scheduled",
      nextScheduledAt: new Date(Date.now() + backoffMs(attemptNumber)),
      errorCode,
      errorMessage,
    });
    return;
  }

  await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "failed", errorCode, errorMessage });
}

/**
 * Processes one already-claimed post end to end. Errors thrown by the
 * LinkedIn API helpers arrive pre-classified as `LinkedInPublishError`;
 * anything else (a bug, an unexpected network failure) is treated as
 * retryable rather than left to crash and abandon the lease silently — the
 * lease-recovery pass is the backstop either way.
 */
async function processClaimedPost(post: ClaimedPost): Promise<boolean> {
  const { attemptId, attemptNumber } = await startAttempt(post.id);

  try {
    const connection = await getUsableConnection(post.userId);
    if (!connection) {
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
      commentary: post.content,
      imageUrn,
    });

    await resolveAttempt(post.id, post.claimToken, attemptId, { kind: "posted", linkedinPostUrn });
    return true;
  } catch (error) {
    if (error instanceof LinkedInPublishError) {
      await handleFailure(post, attemptId, attemptNumber, error.category, `linkedin_${error.category}`, error.message);
    } else {
      await handleFailure(post, attemptId, attemptNumber, "retryable", "unexpected_error", error instanceof Error ? error.message : "Unknown error.");
    }
    return false;
  }
}

export type PublishRunSummary = { recovered: number; claimed: number; succeeded: number; failed: number };

export async function runPublishBatch(): Promise<PublishRunSummary> {
  const abandoned = await findAbandonedLeases();
  await mapWithConcurrency(abandoned, PROCESS_CONCURRENCY, recoverAbandonedLease);

  const claimed = await claimDuePosts();
  const outcomes = await mapWithConcurrency(claimed, PROCESS_CONCURRENCY, async (post) => {
    try {
      return await processClaimedPost(post);
    } catch (error) {
      // processClaimedPost already resolves the attempt on any known
      // failure path; reaching here means resolution itself threw. Log and
      // move on — the lease will still expire and be recovered.
      console.error(`Unhandled error while publishing post ${post.id}:`, error);
      return false;
    }
  });

  return {
    recovered: abandoned.length,
    claimed: claimed.length,
    succeeded: outcomes.filter(Boolean).length,
    failed: outcomes.filter((ok) => !ok).length,
  };
}
