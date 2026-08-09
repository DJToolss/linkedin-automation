import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";

/**
 * Statuses a user may still edit or delete ("pending", per implementation.MD
 * Scope for version 1). `publishing` and `posted` are excluded because a
 * publish attempt is in flight or already succeeded; `cancelled` is excluded
 * so a user can't silently resurrect a post the system deliberately retired.
 */
export const EDITABLE_STATUSES = ["draft", "scheduled", "failed", "requires_reconnect"] as const;

export type Post = typeof posts.$inferSelect;

export async function listPostsForUser(userId: string): Promise<Post[]> {
  return getDb().select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.scheduledAt), desc(posts.createdAt));
}

/** Returns any owned post for read-only views (e.g. a published post detail page). */
export async function getPostForUser(userId: string, postId: string): Promise<Post | null> {
  const [post] = await getDb()
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
    .limit(1);
  return post ?? null;
}

/** Returns the post only if it belongs to the user AND is still editable. */
export async function getEditablePostForUser(userId: string, postId: string): Promise<Post | null> {
  const [post] = await getDb()
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
    .limit(1);
  if (!post) return null;
  if (!(EDITABLE_STATUSES as readonly string[]).includes(post.status)) return null;
  return post;
}

export type PostInput = {
  content: string;
  scheduledAt: Date;
  timezone: string;
  imageUrl: string | null;
  imagePublicId: string | null;
};

export async function createPost(userId: string, input: PostInput): Promise<{ id: string } | null> {
  const [created] = await getDb()
    .insert(posts)
    .values({
      userId,
      content: input.content,
      imageUrl: input.imageUrl,
      imagePublicId: input.imagePublicId,
      scheduledAt: input.scheduledAt,
      timezone: input.timezone,
      status: "scheduled",
    })
    .returning({ id: posts.id });
  return created ?? null;
}

/**
 * A single ownership- and status-scoped `UPDATE … RETURNING` establishes
 * ownership atomically; the caller must only delete a superseded Cloudinary
 * asset once this has returned a row (implementation.MD Phase 4 item 4).
 */
export async function updatePendingPost(userId: string, postId: string, input: PostInput): Promise<{ id: string } | null> {
  const [updated] = await getDb()
    .update(posts)
    .set({
      content: input.content,
      imageUrl: input.imageUrl,
      imagePublicId: input.imagePublicId,
      scheduledAt: input.scheduledAt,
      timezone: input.timezone,
      status: "scheduled",
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.userId, userId), inArray(posts.status, [...EDITABLE_STATUSES])))
    .returning({ id: posts.id });
  return updated ?? null;
}

/** Deleting and reading back the freed `imagePublicId` happen in one statement. */
export async function deletePendingPost(userId: string, postId: string): Promise<{ imagePublicId: string | null } | null> {
  const [deleted] = await getDb()
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId), inArray(posts.status, [...EDITABLE_STATUSES])))
    .returning({ imagePublicId: posts.imagePublicId });
  return deleted ?? null;
}
