import Link from "next/link";

import { AdminShell } from "@/app/_components/admin-shell";
import { PostTabs, type PostsTab } from "@/app/posts/_components/post-tabs";
import { PostsPagination } from "@/app/posts/_components/posts-pagination";
import { deletePostAction, publishNowAction } from "@/app/posts/actions";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { postListPreview } from "@/lib/linkedin/commentary-format";
import { DEFAULT_TIMEZONE } from "@/lib/posts/constants";
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

const STATUS_TONE: Record<string, "positive" | "negative" | "warn" | "neutral"> = {
  posted: "positive",
  failed: "negative",
  requires_reconnect: "negative",
  cancelled: "neutral",
  scheduled: "warn",
  publishing: "warn",
  draft: "neutral",
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

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "warn";
  const tones = {
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
    warn: "bg-warn-soft text-warn",
    neutral: "bg-neutral-badge text-slate",
  };
  const dots = {
    positive: "bg-positive",
    negative: "bg-negative",
    warn: "bg-warn",
    neutral: "bg-slate-light",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 font-mono text-[11.5px] font-medium ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function PostCard({ post, tab }: { post: Post; tab: PostsTab }) {
  const timezone = post.timezone ?? DEFAULT_TIMEZONE;
  const scheduledLabel = post.scheduledAt ? formatZonedDateTime(post.scheduledAt, timezone) : null;

  return (
    <li className="ui-panel p-[18px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {tab === "scheduled" && <StatusBadge status={post.status} />}
          <p className={`line-clamp-2 text-[13.5px] text-text ${tab === "scheduled" ? "mt-2" : ""}`}>
            {postListPreview({ heading: post.heading, subHeading: post.subHeading, description: post.content })}
          </p>
          {post.imageUrl && (
            <p className="mt-1 text-[12px] text-text-faint">{tab === "posted" ? "Includes image" : "Image attached"}</p>
          )}
          <p className="mt-2 font-mono text-[12px] text-text-muted">
            {tab === "posted"
              ? `Posted ${formatZonedDateTime(post.updatedAt, timezone)} (${timezone})`
              : scheduledLabel
                ? `Scheduled for ${scheduledLabel} (${timezone})`
                : "Not scheduled"}
          </p>
          {post.errorMessage && <p className="ui-error">{post.errorMessage}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {tab === "posted" ? (
            <>
              <Link className="ui-btn-secondary px-3 py-1.5 text-[13px]" href={`/posts/${post.id}`}>
                Open
              </Link>
              <Link className="ui-btn-secondary px-3 py-1.5 text-[13px]" href={`/posts/${post.id}/reschedule`}>
                Reschedule
              </Link>
            </>
          ) : (
            isEditable(post.status) && (
              <>
                <Link className="ui-btn-secondary px-3 py-1.5 text-[13px]" href={`/posts/${post.id}/edit`}>
                  Edit
                </Link>
                <form action={publishNowAction.bind(null, post.id)}>
                  <button className="ui-btn-secondary px-3 py-1.5 text-[13px]" type="submit">
                    Post now
                  </button>
                </form>
                <form action={deletePostAction.bind(null, post.id)}>
                  <button className="ui-btn-danger px-3 py-1.5 text-[13px]" type="submit">
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
    <AdminShell
      action={
        <Link className="ui-btn-primary" href="/posts/new">
          New post
        </Link>
      }
      breadcrumb="Posts"
      title="Your posts"
    >
      <div className="max-w-4xl">
        <PostTabs activeTab={activeTab} postedCount={postedCount} scheduledCount={scheduledCount} />

        {paginated.items.length === 0 ? (
          <div className="ui-panel mt-4 p-[18px]">
            <p className="text-[13.5px] text-text-muted">
              {activeTab === "posted" ? "No posted posts yet." : "No scheduled posts yet. Create your first one."}
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
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
      </div>
    </AdminShell>
  );
}
