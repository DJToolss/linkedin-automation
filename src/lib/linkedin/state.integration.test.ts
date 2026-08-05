import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { oauthStates } from "@/lib/db/schema";
import { consumeOAuthState, createOAuthState } from "@/lib/linkedin/state";
import { createTestUser, ensureMigrated, getTestDb, hasTestDatabase, resetTestDatabase } from "@/test/db";

/** Requires TEST_DATABASE_URL — see src/test/db.ts. */
describe.skipIf(!hasTestDatabase())("OAuth state (integration)", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    userId = await createTestUser("connector@example.com");
  });

  it("consumes a freshly issued state exactly once", async () => {
    const state = await createOAuthState(userId);

    const first = await consumeOAuthState(state);
    expect(first?.userId).toBe(userId);

    const replay = await consumeOAuthState(state);
    expect(replay).toBeNull();
  });

  it("rejects a state string that was never issued", async () => {
    expect(await consumeOAuthState("forged-state-value-that-was-never-issued")).toBeNull();
  });

  it("rejects an expired state even though it was never consumed", async () => {
    const state = await createOAuthState(userId);
    await getTestDb().update(oauthStates).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(oauthStates.userId, userId));

    expect(await consumeOAuthState(state)).toBeNull();
  });

  it("lets two different users each consume their own state independently", async () => {
    const otherUserId = await createTestUser("other-connector@example.com");
    const stateA = await createOAuthState(userId);
    const stateB = await createOAuthState(otherUserId);

    expect((await consumeOAuthState(stateA))?.userId).toBe(userId);
    expect((await consumeOAuthState(stateB))?.userId).toBe(otherUserId);
  });
});
