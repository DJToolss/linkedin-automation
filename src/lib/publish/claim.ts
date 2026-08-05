import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { postAttempts, posts } from "@/lib/db/schema";

export const CLAIM_BATCH_SIZE = 10;
export const CLAIM_LEASE_SECONDS = 5 * 60;

export type ClaimedPost = {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  claimToken: string;
};

/**
 * Claims due posts in one atomic statement using `FOR UPDATE SKIP LOCKED`
 * inside the UPDATE's subquery — the equivalent atomic `UPDATE … RETURNING`
 * implementation.MD explicitly allows in place of a wrapping transaction,
 * since the neon-http driver has none (see the Phase 3/4 notes on this
 * driver limitation). Concurrent invocations of this statement can never
 * claim the same row (implementation.MD Phase 5 exit criterion).
 */
export async function claimDuePosts(limit: number = CLAIM_BATCH_SIZE): Promise<ClaimedPost[]> {
  const result = await getDb().execute<ClaimedPost>(sql`
    update posts
    set status = 'publishing', claim_token = gen_random_uuid(),
        claim_expires_at = now() + (${CLAIM_LEASE_SECONDS} * interval '1 second'),
        updated_at = now()
    where id in (
      select id from posts
      where status = 'scheduled' and scheduled_at <= now()
      order by scheduled_at
      for update skip locked
      limit ${limit}
    )
    returning id, user_id as "userId", content, image_url as "imageUrl", image_public_id as "imagePublicId", claim_token as "claimToken"
  `);
  return result.rows;
}

export type AbandonedLease = { id: string; claimToken: string };

export async function findAbandonedLeases(): Promise<AbandonedLease[]> {
  const rows = await getDb()
    .select({ id: posts.id, claimToken: posts.claimToken })
    .from(posts)
    .where(and(eq(posts.status, "publishing"), sql`${posts.claimExpiresAt} < now()`));
  return rows.filter((row): row is AbandonedLease => row.claimToken !== null);
}

/**
 * A timed-out `publishing` lease is ambiguous: LinkedIn may have accepted
 * the post even though this process never recorded that. Reconciliation is
 * limited to our own attempt history — never an invented LinkedIn lookup
 * (implementation.MD correction #2's reasoning applies here too, since no
 * documented endpoint exists for looking a post back up by our own request).
 * When our own records show no recorded success, this surfaces an explicit
 * failure rather than silently rescheduling, so a retry is a deliberate
 * user action, not an automatic duplicate risk (Phase 5 item 5).
 */
export async function recoverAbandonedLease(lease: AbandonedLease): Promise<void> {
  const [lastAttempt] = await getDb()
    .select({ outcome: postAttempts.outcome, providerMetadata: postAttempts.providerMetadata })
    .from(postAttempts)
    .where(eq(postAttempts.postId, lease.id))
    .orderBy(desc(postAttempts.attemptNumber))
    .limit(1);

  const ownershipClaim = and(eq(posts.id, lease.id), eq(posts.claimToken, lease.claimToken));

  if (lastAttempt?.outcome === "succeeded") {
    const urn = typeof lastAttempt.providerMetadata?.linkedinPostUrn === "string" ? lastAttempt.providerMetadata.linkedinPostUrn : null;
    await getDb()
      .update(posts)
      .set({ status: "posted", linkedinPostUrn: urn, claimToken: null, claimExpiresAt: null, errorCode: null, errorMessage: null, updatedAt: new Date() })
      .where(ownershipClaim);
    return;
  }

  await getDb()
    .update(posts)
    .set({
      status: "failed",
      claimToken: null,
      claimExpiresAt: null,
      errorCode: "lease_expired_ambiguous",
      errorMessage: "An earlier publish attempt was interrupted and its outcome could not be confirmed. Retrying may create a duplicate LinkedIn post — review before rescheduling.",
      updatedAt: new Date(),
    })
    .where(ownershipClaim);
}
