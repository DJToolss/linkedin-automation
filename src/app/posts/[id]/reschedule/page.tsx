import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/app/_components/admin-shell";
import { reschedulePostedPostAction } from "@/app/posts/actions";
import { PostComposer } from "@/app/posts/_components/post-composer";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { DEFAULT_TIMEZONE } from "@/lib/posts/constants";
import { getPostedPostForUser, listPendingScheduledAtIsosForUser } from "@/lib/posts/posts";
import { listSupportedTimeZones } from "@/lib/time/timezone";

export default async function ReschedulePostedPostPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuthenticatedUserId();
  const { id } = await params;

  const [post, scheduledAtIsos] = await Promise.all([getPostedPostForUser(userId, id), listPendingScheduledAtIsosForUser(userId)]);
  if (!post) notFound();

  return (
    <AdminShell breadcrumb="Posts / Reschedule" title="Reschedule post">
      <div className="max-w-2xl">
        <Link className="text-[13px] font-medium text-brass hover:text-brass-dark" href={`/posts/${post.id}`}>
          ← Back to posted post
        </Link>

        <p className="mt-4 text-[13.5px] text-text-muted">
          This creates a new copy in Scheduled. The original posted post stays in Posted and is not changed.
        </p>

        <div className="ui-panel mt-4 p-[18px]">
          <PostComposer
            action={reschedulePostedPostAction.bind(null, post.id)}
            existing={{
              heading: post.heading ?? "",
              subHeading: post.subHeading ?? "",
              content: post.content,
              imageUrl: post.imageUrl,
              scheduledAtLocal: "",
              timezone: post.timezone ?? DEFAULT_TIMEZONE,
            }}
            submitLabel="Schedule copy"
            scheduledAtIsos={scheduledAtIsos}
            timeZones={listSupportedTimeZones()}
          />
        </div>
      </div>
    </AdminShell>
  );
}
