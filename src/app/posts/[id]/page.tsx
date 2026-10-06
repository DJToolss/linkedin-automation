import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/app/_components/admin-shell";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { linkedInPostUrl } from "@/lib/linkedin/post-url";
import { DEFAULT_TIMEZONE } from "@/lib/posts/constants";
import { getPostedPostForUser } from "@/lib/posts/posts";
import { formatZonedDateTime } from "@/lib/time/timezone";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuthenticatedUserId();
  const { id } = await params;

  const post = await getPostedPostForUser(userId, id);
  if (!post) notFound();

  const timezone = post.timezone ?? DEFAULT_TIMEZONE;
  const scheduledLabel = post.scheduledAt ? formatZonedDateTime(post.scheduledAt, timezone) : null;
  const postedLabel = formatZonedDateTime(post.updatedAt, timezone);

  return (
    <AdminShell breadcrumb="Posts / Posted" title="Posted">
      <div className="max-w-2xl">
        <Link className="text-[13px] font-medium text-brass hover:text-brass-dark" href="/posts?tab=posted">
          ← Back to posted
        </Link>

        <article className="ui-panel mt-4 p-6">
          <dl className="grid gap-3 text-[12px] text-text-muted sm:grid-cols-2">
            {scheduledLabel && (
              <div>
                <dt className="font-semibold text-text">Scheduled for</dt>
                <dd className="font-mono">
                  {scheduledLabel} ({timezone})
                </dd>
              </div>
            )}
            <div>
              <dt className="font-semibold text-text">Posted at</dt>
              <dd className="font-mono">
                {postedLabel} ({timezone})
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            {post.heading?.trim() && <p className="text-[15px] font-semibold leading-relaxed text-text">{post.heading.trim()}</p>}
            {post.subHeading?.trim() && <p className="text-[13.5px] font-medium italic text-text-muted">{post.subHeading.trim()}</p>}
            {post.content.trim() && <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-text">{post.content.trim()}</div>}
          </div>

          {post.imageUrl && (
            <div className="mt-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL from user upload, not a static asset */}
              <img alt="Post image" className="max-h-[32rem] w-full rounded-[10px] border border-line object-contain" src={post.imageUrl} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {post.linkedinPostUrn && (
              <a className="ui-btn-primary" href={linkedInPostUrl(post.linkedinPostUrn)} rel="noopener noreferrer" target="_blank">
                View on LinkedIn
              </a>
            )}
            <Link className="ui-btn-secondary" href={`/posts/${post.id}/reschedule`}>
              Reschedule
            </Link>
            <Link className="ui-btn-secondary" href="/posts?tab=posted">
              Close
            </Link>
          </div>
        </article>
      </div>
    </AdminShell>
  );
}
