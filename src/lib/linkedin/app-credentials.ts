import "server-only";

import { eq } from "drizzle-orm";

import { decrypt, encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { linkedinApps } from "@/lib/db/schema";

export type LinkedInAppSummary = { id: string; clientId: string; updatedAt: Date };

/** Safe to render: never includes the client secret. */
export async function getLinkedInAppSummary(userId: string): Promise<LinkedInAppSummary | null> {
  const [app] = await getDb()
    .select({ id: linkedinApps.id, clientId: linkedinApps.clientId, updatedAt: linkedinApps.updatedAt })
    .from(linkedinApps)
    .where(eq(linkedinApps.userId, userId))
    .limit(1);
  return app ?? null;
}

export type LinkedInAppCredentials = { id: string; clientId: string; clientSecret: string };

/**
 * Decrypts the client secret for server-side token exchange only. Never pass
 * the result to a client component or include it in a route response.
 */
export async function getLinkedInAppCredentials(userId: string): Promise<LinkedInAppCredentials | null> {
  const [app] = await getDb()
    .select({ id: linkedinApps.id, clientId: linkedinApps.clientId, clientSecretEnc: linkedinApps.clientSecretEnc })
    .from(linkedinApps)
    .where(eq(linkedinApps.userId, userId))
    .limit(1);
  if (!app) return null;
  return { id: app.id, clientId: app.clientId, clientSecret: decrypt(app.clientSecretEnc) };
}

export async function saveLinkedInAppCredentials(userId: string, clientId: string, clientSecret: string): Promise<void> {
  const clientSecretEnc = encrypt(clientSecret);
  await getDb()
    .insert(linkedinApps)
    .values({ userId, clientId, clientSecretEnc })
    .onConflictDoUpdate({
      target: linkedinApps.userId,
      set: { clientId, clientSecretEnc, updatedAt: new Date() },
    });
}

/** The `linkedin_apps -> linkedin_connections` foreign key cascades on delete. */
export async function removeLinkedInAppCredentials(userId: string): Promise<void> {
  await getDb().delete(linkedinApps).where(eq(linkedinApps.userId, userId));
}
