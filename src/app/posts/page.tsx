import Link from "next/link";

import { AppHeader } from "@/app/_components/app-header";
import { deletePostAction } from "@/app/posts/actions";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { EDITABLE_STATUSES, listPostsForUser } from "@/lib/posts/posts";

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

export default async function PostsPage() {
  const userId = await requireAuthenticatedUserId();
  const posts = await listPostsForUser(userId);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <AppHeader title="Your posts" />

      <div className="mt-8 flex justify-end">
        <Link className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white" href="/posts/new">
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">No posts yet. Create your first one.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {posts.map((post) => (
            <li className="rounded-xl border bg-zinc-50 p-5" key={post.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{STATUS_LABEL[post.status] ?? post.status}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-700">{post.content}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {post.scheduledAt ? `Scheduled for ${post.scheduledAt.toLocaleString()} (${post.timezone})` : "Not scheduled"}
                  </p>
                  {post.errorMessage && <p className="mt-1 text-xs text-red-700">{post.errorMessage}</p>}
                </div>
                {isEditable(post.status) && (
                  <div className="flex shrink-0 gap-2">
                    <Link className="rounded border px-3 py-1.5 text-sm font-medium" href={`/posts/${post.id}/edit`}>
                      Edit
                    </Link>
                    <form action={deletePostAction.bind(null, post.id)}>
                      <button className="rounded border px-3 py-1.5 text-sm font-medium text-red-700" type="submit">
                        Delete
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
