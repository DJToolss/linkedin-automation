import "server-only";

import { and, count, desc, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { POSTS_PAGE_SIZE } from "@/lib/posts/constants";

/**
 * Statuses a user may still edit or delete ("pending", per implementation.MD
 * Scope for version 1). `publishing` and `posted` are excluded because a
 * publish attempt is in flight or already succeeded; `cancelled` is excluded
 * so a user can't silently resurrect a post the system deliberately retired.
 */
export const EDITABLE_STATUSES = ["draft", "scheduled", "failed", "requires_reconnect"] as const;

export type Post = typeof posts.$inferSelect;
export type PostsListTab = "scheduled" | "posted";

export type PaginatedPosts = {
  items: Post[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function tabFilter(userId: string, tab: PostsListTab) {
  if (tab === "posted") return and(eq(posts.userId, userId), eq(posts.status, "posted"));
  return and(eq(posts.userId, userId), ne(posts.status, "posted"), ne(posts.status, "cancelled"));
}

function tabOrder(tab: PostsListTab) {
  return tab === "posted" ? [desc(posts.updatedAt), desc(posts.createdAt)] : [desc(posts.scheduledAt), desc(posts.createdAt)];
}

export async function listPostsForUser(userId: string): Promise<Post[]> {
  return getDb().select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.scheduledAt), desc(posts.createdAt));
}

export async function countPostsForUserByTab(userId: string, tab: PostsListTab): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(posts).where(tabFilter(userId, tab));
  return Number(row?.total ?? 0);
}

export async function listPostsForUserPaginated(
  userId: string,
  tab: PostsListTab,
  page: number,
  pageSize: number = POSTS_PAGE_SIZE,
): Promise<PaginatedPosts> {
  const total = await countPostsForUserByTab(userId, tab);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  const items =
    total === 0
      ? []
      : await getDb()
          .select()
          .from(posts)
          .where(tabFilter(userId, tab))
          .orderBy(...tabOrder(tab))
          .limit(pageSize)
          .offset(offset);

  return { items, total, page: safePage, pageSize, totalPages };
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
  heading: string | null;
  subHeading: string | null;
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
      heading: input.heading,
      subHeading: input.subHeading,
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
      heading: input.heading,
      subHeading: input.subHeading,
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