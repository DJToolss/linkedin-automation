import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { posts } from "@/lib/db/schema";
import { createPost, deletePendingPost, duplicatePostedPost, EDITABLE_STATUSES, getEditablePostForUser, getPostedPostForUser, listPendingScheduledAtIsosForUser, listPostsForUser, markEditablePostForImmediatePublish, updatePendingPost } from "@/lib/posts/posts";
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

  it("marks an owned pending post as due now so it can publish immediately", async () => {
    const future = new Date(Date.now() + 60 * 60_000);
    const created = await createPost(userId, {
      heading: null, subHeading: null, content: "post me now",
      scheduledAt: future, timezone: "UTC", imageUrl: null, imagePublicId: null,
    });
    await setPostStatus(created!.id, "failed");

    const marked = await markEditablePostForImmediatePublish(userId, created!.id);
    expect(marked?.id).toBe(created!.id);

    const post = await getEditablePostForUser(userId, created!.id);
    expect(post?.status).toBe("scheduled");
    expect(post?.scheduledAt).not.toBeNull();
    expect(post!.scheduledAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("refuses to mark another user's post for immediate publish", async () => {
    const created = await createPost(otherUserId, { heading: null, subHeading: null, content: "not yours", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    expect(await markEditablePostForImmediatePublish(userId, created!.id)).toBeNull();
  });

  it.each(["publishing", "posted"] as const)("refuses to mark a %s post for immediate publish", async (status) => {
    const created = await createPost(userId, { heading: null, subHeading: null, content: "locked", scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null });
    await setPostStatus(created!.id, status);
    expect(await markEditablePostForImmediatePublish(userId, created!.id)).toBeNull();
  });

  it("duplicates a posted post into a new scheduled copy without mutating the original", async () => {
    const created = await createPost(userId, {
      heading: "Heading",
      subHeading: "Sub",
      content: "Body",
      scheduledAt: new Date(Date.now() + 60_000),
      timezone: "America/New_York",
      imageUrl: "https://example.com/orig.png",
      imagePublicId: "users/x/posts/orig",
    });
    await getTestDb()
      .update(posts)
      .set({ status: "posted", linkedinPostUrn: "urn:li:share:1", attemptCount: 2 })
      .where(eq(posts.id, created!.id));

    const copy = await duplicatePostedPost(userId, created!.id, {
      heading: "Heading",
      subHeading: "Sub",
      content: "Body",
      scheduledAt: new Date(Date.now() + 120_000),
      timezone: "America/New_York",
      imageUrl: "https://example.com/copy.png",
      imagePublicId: "users/x/posts/copy",
    });
    expect(copy?.id).toBeDefined();
    expect(copy!.id).not.toBe(created!.id);

    const original = await getPostedPostForUser(userId, created!.id);
    expect(original?.status).toBe("posted");
    expect(original?.linkedinPostUrn).toBe("urn:li:share:1");
    expect(original?.attemptCount).toBe(2);
    expect(original?.imagePublicId).toBe("users/x/posts/orig");

    const duplicated = await getEditablePostForUser(userId, copy!.id);
    expect(duplicated?.status).toBe("scheduled");
    expect(duplicated?.heading).toBe("Heading");
    expect(duplicated?.content).toBe("Body");
    expect(duplicated?.imagePublicId).toBe("users/x/posts/copy");
    expect(duplicated?.linkedinPostUrn).toBeNull();
    expect(duplicated?.attemptCount).toBe(0);
    expect(duplicated?.claimToken).toBeNull();
  });

  it("refuses to duplicate another user's posted post", async () => {
    const created = await createPost(otherUserId, {
      heading: null, subHeading: null, content: "not yours",
      scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null,
    });
    await setPostStatus(created!.id, "posted");
    expect(
      await duplicatePostedPost(userId, created!.id, {
        heading: null, subHeading: null, content: "not yours",
        scheduledAt: new Date(Date.now() + 120_000), timezone: "UTC", imageUrl: null, imagePublicId: null,
      }),
    ).toBeNull();
    expect(await listPostsForUser(userId)).toHaveLength(0);
  });

  it.each(["draft", "scheduled", "publishing", "failed"] as const)("refuses to duplicate a %s post", async (status) => {
    const created = await createPost(userId, {
      heading: null, subHeading: null, content: "not posted",
      scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null,
    });
    await setPostStatus(created!.id, status);
    expect(
      await duplicatePostedPost(userId, created!.id, {
        heading: null, subHeading: null, content: "copy",
        scheduledAt: new Date(Date.now() + 120_000), timezone: "UTC", imageUrl: null, imagePublicId: null,
      }),
    ).toBeNull();
    expect(await listPostsForUser(userId)).toHaveLength(1);
  });

  it("returns posted posts from getPostedPostForUser and ignores other statuses", async () => {
    const created = await createPost(userId, {
      heading: null, subHeading: null, content: "hello",
      scheduledAt: new Date(Date.now() + 60_000), timezone: "UTC", imageUrl: null, imagePublicId: null,
    });
    expect(await getPostedPostForUser(userId, created!.id)).toBeNull();
    await setPostStatus(created!.id, "posted");
    expect(await getPostedPostForUser(userId, created!.id)).not.toBeNull();
    expect(await getPostedPostForUser(otherUserId, created!.id)).toBeNull();
  });

  it("lists pending scheduled instants for the owner and skips posted or foreign posts", async () => {
    const pending = await createPost(userId, {
      heading: null, subHeading: null, content: "pending",
      scheduledAt: new Date("2026-10-01T12:00:00.000Z"), timezone: "UTC", imageUrl: null, imagePublicId: null,
    });
    const posted = await createPost(userId, {
      heading: null, subHeading: null, content: "already posted",
      scheduledAt: new Date("2026-10-02T12:00:00.000Z"), timezone: "UTC", imageUrl: null, imagePublicId: null,
    });
    await setPostStatus(posted!.id, "posted");
    await createPost(otherUserId, {
      heading: null, subHeading: null, content: "someone else",
      scheduledAt: new Date("2026-10-03T12:00:00.000Z"), timezone: "UTC", imageUrl: null, imagePublicId: null,
    });

    const instants = await listPendingScheduledAtIsosForUser(userId);
    expect(instants).toEqual(["2026-10-01T12:00:00.000Z"]);
    expect(pending?.id).toBeDefined();
  });
});
