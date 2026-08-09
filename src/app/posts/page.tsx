import Link from "next/link";

import { AppHeader } from "@/app/_components/app-header";
import { PostTabs, type PostsTab } from "@/app/posts/_components/post-tabs";
import { deletePostAction } from "@/app/posts/actions";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { EDITABLE_STATUSES, listPostsForUser, type Post } from "@/lib/posts/posts";
import { formatZonedDateTime } from "@/lib/time/timezone";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  posted: "Posted",
  failed: "Failed",
  requires_reconnect: "Needs reconnect",
  cancelled: "Cancelled",
};

function isEditable(status: string): boolean {
  return (EDITABLE_STATUSES as readonly string[]).includes(status);
}

function isScheduledTabPost(post: Post): boolean {
  return post.status !== "posted" && post.status !== "cancelled";
}

function resolveTab(tab: string | undefined): PostsTab {
  return tab === "posted" ? "posted" : "scheduled";
}

function PostCard({ post, tab }: { post: Post; tab: PostsTab }) {
  const timezone = post.timezone ?? "UTC";
  const scheduledLabel = post.scheduledAt ? formatZonedDateTime(post.scheduledAt, timezone) : null;

  return (
    <li className="rounded-xl border bg-zinc-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {tab === "scheduled" && <p className="text-sm font-medium">{STATUS_LABEL[post.status] ?? post.status}</p>}
          <p className={`line-clamp-2 text-sm text-zinc-700 ${tab === "scheduled" ? "mt-1" : ""}`}>{post.content}</p>
          {post.imageUrl && (
            <p className="mt-1 text-xs text-zinc-500">{tab === "posted" ? "Includes image" : "Image attached"}</p>
          )}
          <p className="mt-2 text-xs text-zinc-600">
            {tab === "posted"
              ? `Posted ${formatZonedDateTime(post.updatedAt, timezone)} (${timezone})`
              : scheduledLabel
                ? `Scheduled for ${scheduledLabel} (${timezone})`
                : "Not scheduled"}
          </p>
          {post.errorMessage && <p className="mt-1 text-xs text-red-700">{post.errorMessage}</p>}
        </div>

        <div className="flex shrink-0 gap-2">
          {tab === "posted" ? (
            <Link className="rounded border px-3 py-1.5 text-sm font-medium" href={`/posts/${post.id}`}>
              Open
            </Link>
          ) : (
            isEditable(post.status) && (
              <>
                <Link className="rounded border px-3 py-1.5 text-sm font-medium" href={`/posts/${post.id}/edit`}>
                  Edit
                </Link>
                <form action={deletePostAction.bind(null, post.id)}>
                  <button className="rounded border px-3 py-1.5 text-sm font-medium text-red-700" type="submit">
                    Delete
                  </button>
                </form>
              </>
            )
          )}
        </div>
      </div>
    </li>
  );
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const userId = await requireAuthenticatedUserId();
  const { tab: tabParam } = await searchParams;
  const activeTab = resolveTab(tabParam);

  const posts = await listPostsForUser(userId);
  const scheduledPosts = posts.filter(isScheduledTabPost);
  const postedPosts = posts.filter((post) => post.status === "posted");
  const visiblePosts = activeTab === "posted" ? postedPosts : scheduledPosts;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <AppHeader title="Your posts" />

      <div className="mt-8 flex justify-end">
        <Link className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white" href="/posts/new">
          New post
        </Link>
      </div>

      <PostTabs activeTab={activeTab} postedCount={postedPosts.length} scheduledCount={scheduledPosts.length} />

      {visiblePosts.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          {activeTab === "posted" ? "No posted posts yet." : "No scheduled posts yet. Create your first one."}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} tab={activeTab} />
          ))}
        </ul>
      )}
    </main>
  );
}
