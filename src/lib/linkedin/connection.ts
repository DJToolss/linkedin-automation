import "server-only";

import { eq, sql } from "drizzle-orm";

import { encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { linkedinConnections } from "@/lib/db/schema";

export type ConnectionSummary = {
  status: "connected" | "requires_reconnect" | "disconnected";
  personUrn: string;
  displayName: string | null;
  accessTokenExpiresAt: Date;
  updatedAt: Date;
};

/**
 * Safe to render: never includes the encrypted access token. A `connected`
 * row whose token has already expired is lazily flipped to
 * `requires_reconnect` so the UI never reports a usable connection that
 * would fail a publish attempt (implementation.MD Phase 3 exit criterion).
 * The publisher (Phase 5) must still re-check this independently at
 * publish time rather than trusting a page load.
 */
export async function getConnectionSummary(userId: string): Promise<ConnectionSummary | null> {
  const [connection] = await getDb()
    .select({
      status: linkedinConnections.status,
      personUrn: linkedinConnections.personUrn,
      displayName: linkedinConnections.displayName,
      accessTokenExpiresAt: linkedinConnections.accessTokenExpiresAt,
      updatedAt: linkedinConnections.updatedAt,
    })
    .from(linkedinConnections)
    .where(eq(linkedinConnections.userId, userId))
    .limit(1);
  if (!connection) return null;

  if (connection.status === "connected" && connection.accessTokenExpiresAt <= new Date()) {
    await getDb()
      .update(linkedinConnections)
      .set({ status: "requires_reconnect" })
      .where(eq(linkedinConnections.userId, userId));
    return { ...connection, status: "requires_reconnect" };
  }
  return connection;
}

export async function upsertConnection(params: {
  userId: string;
  linkedinAppId: string;
  personUrn: string;
  displayName: string | null;
  accessToken: string;
  accessTokenExpiresAt: Date;
}): Promise<void> {
  const accessTokenEnc = encrypt(params.accessToken);
  await getDb()
    .insert(linkedinConnections)
    .values({
      userId: params.userId,
      linkedinAppId: params.linkedinAppId,
      personUrn: params.personUrn,
      displayName: params.displayName,
      accessTokenEnc,
      accessTokenExpiresAt: params.accessTokenExpiresAt,
      status: "connected",
    })
    .onConflictDoUpdate({
      target: linkedinConnections.userId,
      set: {
        linkedinAppId: params.linkedinAppId,
        personUrn: params.personUrn,
        displayName: params.displayName,
        accessTokenEnc,
        accessTokenExpiresAt: params.accessTokenExpiresAt,
        status: "connected",
        updatedAt: new Date(),
      },
    });
}

/**
 * Deletes the local ciphertext and reconciles any posts left scheduled
 * against it. LinkedIn does not document a client-callable revocation
 * endpoint for standard 3-legged member tokens (implementation.MD
 * correction #2), so this does not attempt one — fabricating an
 * unverified revoke call would be worse than omitting it.
 *
 * Both statements run as a single data-modifying CTE because the
 * neon-http driver has no multi-statement transaction support
 * (drizzle-orm/neon-http throws on `db.transaction()`); a single SQL
 * statement is still atomic without one.
 */
export async function disconnectConnection(userId: string): Promise<void> {
  await getDb().execute(sql`
    with deleted_connection as (
      delete from linkedin_connections where user_id = ${userId} returning id
    )
    update posts set status = 'requires_reconnect', updated_at = now()
    where user_id = ${userId} and status = 'scheduled'
  `);
}
