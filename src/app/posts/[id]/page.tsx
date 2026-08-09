import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/app/_components/app-header";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { linkedInPostUrl } from "@/lib/linkedin/post-url";
import { getPostForUser } from "@/lib/posts/posts";
import { formatZonedDateTime } from "@/lib/time/timezone";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuthenticatedUserId();
  const { id } = await params;

  const post = await getPostForUser(userId, id);
  if (!post || post.status !== "posted") notFound();

  const timezone = post.timezone ?? "UTC";
  const scheduledLabel = post.scheduledAt ? formatZonedDateTime(post.scheduledAt, timezone) : null;
  const postedLabel = formatZonedDateTime(post.updatedAt, timezone);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <AppHeader title="Posted" />

      <div className="mt-8">
        <Link className="text-sm font-medium text-blue-700 hover:underline" href="/posts?tab=posted">
          ← Back to posted
        </Link>
      </div>

      <article className="mt-6 rounded-xl border bg-zinc-50 p-6">
        <dl className="grid gap-1 text-xs text-zinc-600 sm:grid-cols-2">
          {scheduledLabel && (
            <div>
              <dt className="font-medium text-zinc-700">Scheduled for</dt>
              <dd>
                {scheduledLabel} ({timezone})
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-zinc-700">Posted at</dt>
            <dd>
              {postedLabel} ({timezone})
            </dd>
          </div>
        </dl>

        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900">{post.content}</div>

        {post.imageUrl && (
          <div className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL from user upload, not a static asset */}
            <img alt="Post image" className="max-h-[32rem] w-full rounded-lg border object-contain" src={post.imageUrl} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {post.linkedinPostUrn && (
            <a
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white"
              href={linkedInPostUrl(post.linkedinPostUrn)}
              rel="noopener noreferrer"
              target="_blank"
            >
              View on LinkedIn
            </a>
          )}
          <Link className="rounded border px-4 py-2 text-sm font-medium" href="/posts?tab=posted">
            Close
          </Link>
        </div>
      </article>
    </main>
  );
}
