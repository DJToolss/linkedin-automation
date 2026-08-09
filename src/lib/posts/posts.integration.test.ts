import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { posts } from "@/lib/db/schema";
import { createPost, deletePendingPost, EDITABLE_STATUSES, getEditablePostForUser, listPostsForUser, updatePendingPost } from "@/lib/posts/posts";
import { createTestUser, ensureMigrated, getTestDb, hasTestDatabase, resetTestDatabase } from "@/test/db";

/** Bypasses the app's own status guard to plant a post directly in a given state for setup. */
async function setPostStatus(postId: string, status: (typeof posts.$inferInsert)["status"]): Promise<void> {
  await getTestDb().update(posts).set({ status }).where(eq(posts.id, postId));
}

/**
 * Requires a real, disposable Postgres database (set TEST_DATABASE_URL) —
 * see src/test/db.ts. Skips itself otherwise rather than mocking the
 * database layer these functions exist to make ownership/status-safe.
 */
describe.skipIf(!hasTestDatabase())("posts data access (integration)", () => {
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await ensureMigrated();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    userId = await createTestUser("owner@example.com");
    otherUserId = await createTestUser("someone-else@example.com");
  });

  it("creates a post scoped to its owner", async () => {
    const created = await createPost(userId, {
      heading: null, subHeading: null, content: "hello world",
      scheduledAt: new Date(Date.now() + 60_000),
      timezone: "UTC",
      imageUrl: null,
      imagePublicId: null,
    });
    expect(created?.id).toBeDefined();

    const posts = await listPostsForUser(userId);
    expect(posts).toHaveLength(1);
    expect(posts[0].content).toBe("hello world");
    expect(posts[0].status).toBe("scheduled");
  });

  it("never lists another user's posts", async () => {
    await createPost(otherUserId, { heading: null, subHeading: null, content: "not yours", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    expect(await listPostsForUser(userId)).toHaveLength(0);
  });

  it("refuses to fetch another user's post as editable, even by its real id", async () => {
    const created = await createPost(otherUserId, { heading: null, subHeading: null, content: "not yours", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    expect(await getEditablePostForUser(userId, created!.id)).toBeNull();
  });

  it.each(EDITABLE_STATUSES)("treats a %s post as editable and updatable", async (status) => {
    const created = await createPost(userId, { heading: null, subHeading: null, content: "draft me", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    await setPostStatus(created!.id, status);

    const editable = await getEditablePostForUser(userId, created!.id);
    expect(editable).not.toBeNull();

    const updated = await updatePendingPost(userId, created!.id, {
      heading: null, subHeading: null, content: "updated",
      scheduledAt: new Date(Date.now() + 120_000),
      timezone: "UTC",
      imageUrl: null,
      imagePublicId: null,
    });
    expect(updated?.id).toBe(created!.id);
  });

  it.each(["publishing", "posted"] as const)("refuses to update or fetch-as-editable a %s post", async (status) => {
    const created = await createPost(userId, { heading: null, subHeading: null, content: "locked", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    await setPostStatus(created!.id, status);

    expect(await getEditablePostForUser(userId, created!.id)).toBeNull();
    const updated = await updatePendingPost(userId, created!.id, {
      heading: null, subHeading: null, content: "should not apply",
      scheduledAt: new Date(Date.now() + 120_000),
      timezone: "UTC",
      imageUrl: null,
      imagePublicId: null,
    });
    expect(updated).toBeNull();
  });

  it("deletes a pending post owned by the caller and returns its image public id", async () => {
    const created = await createPost(userId, { heading: null, subHeading: null, content: "delete me", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: "https://example.com/x.png", imagePublicId: "users/x/posts/1" });
    const deleted = await deletePendingPost(userId, created!.id);
    expect(deleted?.imagePublicId).toBe("users/x/posts/1");
    expect(await listPostsForUser(userId)).toHaveLength(0);
  });

  it("refuses to delete another user's post", async () => {
    const created = await createPost(otherUserId, { heading: null, subHeading: null, content: "not yours", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    expect(await deletePendingPost(userId, created!.id)).toBeNull();
    expect(await listPostsForUser(otherUserId)).toHaveLength(1);
  });
});
