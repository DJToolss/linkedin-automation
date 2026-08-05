import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { oauthStates } from "@/lib/db/schema";
import { LINKEDIN_OAUTH_STATE_TTL_MS } from "@/lib/linkedin/config";

function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

/**
 * Issues a high-entropy, single-use OAuth state. Only its hash is persisted,
 * scoped to the initiating user, with a short expiry (implementation.MD
 * correction #3).
 */
export async function createOAuthState(userId: string): Promise<string> {
  const state = randomBytes(32).toString("hex");
  await getDb().insert(oauthStates).values({
    stateHash: hashState(state),
    userId,
    expiresAt: new Date(Date.now() + LINKEDIN_OAUTH_STATE_TTL_MS),
  });
  return state;
}

export type ConsumedOAuthState = { userId: string };

/**
 * Atomically claims a state in a single `UPDATE … RETURNING` so a replayed or
 * concurrently-used value can only ever be consumed once. Expiry is compared
 * against the database clock, not the application server's, to avoid clock
 * skew weakening the short-lived window.
 */
export async function consumeOAuthState(state: string): Promise<ConsumedOAuthState | null> {
  const [claimed] = await getDb()
    .update(oauthStates)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthStates.stateHash, hashState(state)),
        isNull(oauthStates.consumedAt),
        sql`${oauthStates.expiresAt} > now()`,
      ),
    )
    .returning({ userId: oauthStates.userId });
  return claimed ?? null;
}
