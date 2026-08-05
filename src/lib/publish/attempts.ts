import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { postAttempts, posts } from "@/lib/db/schema";

export type StartedAttempt = { attemptId: string; attemptNumber: number };

/**
 * Atomically bumps `posts.attempt_count` and inserts the matching
 * `post_attempts` row in one statement (a data-modifying CTE), so the two
 * tables can never drift out of sync even though the neon-http driver has
 * no multi-statement transaction support.
 */
export async function startAttempt(postId: string): Promise<StartedAttempt> {
  const result = await getDb().execute<{ attemptId: string; attemptNumber: number }>(sql`
    with bumped as (
      update posts set attempt_count = attempt_count + 1, updated_at = now()
      where id = ${postId}
      returning attempt_count
    )
    insert into post_attempts (post_id, attempt_number, started_at)
    select ${postId}, attempt_count, now() from bumped
    returning id as "attemptId", attempt_number as "attemptNumber"
  `);
  const [row] = result.rows;
  if (!row) throw new Error(`Failed to start an attempt record for post ${postId}.`);
  return { attemptId: row.attemptId, attemptNumber: Number(row.attemptNumber) };
}

export type AttemptOutcome = "succeeded" | "retryable_failure" | "permanent_failure" | "requires_reconnect";

async function completeAttempt(
  attemptId: string,
  params: { outcome: AttemptOutcome; errorCode?: string | null; errorMessage?: string | null; providerMetadata?: Record<string, unknown> | null },
): Promise<void> {
  await getDb()
    .update(postAttempts)
    .set({
      completedAt: new Date(),
      outcome: params.outcome,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      providerMetadata: params.providerMetadata ?? null,
    })
    .where(eq(postAttempts.id, attemptId));
}

export type Resolution =
  | { kind: "posted"; linkedinPostUrn: string }
  | { kind: "requires_reconnect"; errorCode: string; errorMessage: string }
  | { kind: "retry_scheduled"; nextScheduledAt: Date; errorCode: string; errorMessage: string }
  | { kind: "failed"; errorCode: string; errorMessage: string };

/**
 * Records the attempt's outcome, then updates the post itself scoped by the
 * exact claim token this run claimed it with — so a lease that was
 * meanwhile reclaimed by lease recovery is never silently overwritten
 * (implementation.MD Phase 5 items 3–4).
 */
export async function resolveAttempt(postId: string, claimToken: string, attemptId: string, resolution: Resolution): Promise<void> {
  const outcome: AttemptOutcome =
    resolution.kind === "posted"
      ? "succeeded"
      : resolution.kind === "requires_reconnect"
        ? "requires_reconnect"
        : resolution.kind === "retry_scheduled"
          ? "retryable_failure"
          : "permanent_failure";

  await completeAttempt(attemptId, {
    outcome,
    errorCode: resolution.kind === "posted" ? null : resolution.errorCode,
    errorMessage: resolution.kind === "posted" ? null : resolution.errorMessage,
    providerMetadata: resolution.kind === "posted" ? { linkedinPostUrn: resolution.linkedinPostUrn } : null,
  });

  const ownershipClaim = and(eq(posts.id, postId), eq(posts.claimToken, claimToken));

  if (resolution.kind === "posted") {
    await getDb()
      .update(posts)
      .set({
        status: "posted",
        linkedinPostUrn: resolution.linkedinPostUrn,
        claimToken: null,
        claimExpiresAt: null,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(ownershipClaim);
    return;
  }

  if (resolution.kind === "retry_scheduled") {
    await getDb()
      .update(posts)
      .set({
        status: "scheduled",
        scheduledAt: resolution.nextScheduledAt,
        claimToken: null,
        claimExpiresAt: null,
        errorCode: resolution.errorCode,
        errorMessage: resolution.errorMessage,
        updatedAt: new Date(),
      })
      .where(ownershipClaim);
    return;
  }

  await getDb()
    .update(posts)
    .set({
      status: resolution.kind === "requires_reconnect" ? "requires_reconnect" : "failed",
      claimToken: null,
      claimExpiresAt: null,
      errorCode: resolution.errorCode,
      errorMessage: resolution.errorMessage,
      updatedAt: new Date(),
    })
    .where(ownershipClaim);
}
