import Link from "next/link";

import { AppHeader } from "@/app/_components/app-header";
import { PostTabs, type PostsTab } from "@/app/posts/_components/post-tabs";
import { PostsPagination } from "@/app/posts/_components/posts-pagination";
import { deletePostAction } from "@/app/posts/actions";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { postListPreview } from "@/lib/linkedin/commentary-format";
import { EDITABLE_STATUSES, countPostsForUserByTab, listPostsForUserPaginated, type Post } from "@/lib/posts/posts";
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

function resolveTab(tab: string | undefined): PostsTab {
  return tab === "posted" ? "posted" : "scheduled";
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function PostCard({ post, tab }: { post: Post; tab: PostsTab }) {
  const timezone = post.timezone ?? "UTC";
  const scheduledLabel = post.scheduledAt ? formatZonedDateTime(post.scheduledAt, timezone) : null;

  return (
    <li className="rounded-xl border bg-zinc-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {tab === "scheduled" && <p className="text-sm font-medium">{STATUS_LABEL[post.status] ?? post.status}</p>}
          <p className={`line-clamp-2 text-sm text-zinc-700 ${tab === "scheduled" ? "mt-1" : ""}`}>
            {postListPreview({ heading: post.heading, subHeading: post.subHeading, description: post.content })}
          </p>
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

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const userId = await requireAuthenticatedUserId();
  const { tab: tabParam, page: pageParam } = await searchParams;
  const activeTab = resolveTab(tabParam);
  const requestedPage = parsePage(pageParam);

  const [scheduledCount, postedCount, paginated] = await Promise.all([
    countPostsForUserByTab(userId, "scheduled"),
    countPostsForUserByTab(userId, "posted"),
    listPostsForUserPaginated(userId, activeTab, requestedPage),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <AppHeader title="Your posts" />

      <div className="mt-8 flex justify-end">
        <Link className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white" href="/posts/new">
          New post
        </Link>
      </div>

      <PostTabs activeTab={activeTab} postedCount={postedCount} scheduledCount={scheduledCount} />

      {paginated.items.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          {activeTab === "posted" ? "No posted posts yet." : "No scheduled posts yet. Create your first one."}
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-4">
            {paginated.items.map((post) => (
              <PostCard key={post.id} post={post} tab={activeTab} />
            ))}
          </ul>
          <PostsPagination
            page={paginated.page}
            pageSize={paginated.pageSize}
            tab={activeTab}
            total={paginated.total}
            totalPages={paginated.totalPages}
          />
        </>
      )}
    </main>
  );
}
