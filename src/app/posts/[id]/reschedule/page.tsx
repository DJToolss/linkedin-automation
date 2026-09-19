import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/app/_components/app-header";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <AppHeader title="Reschedule post" />

      <div className="mt-8">
        <Link className="text-sm font-medium text-blue-700 hover:underline" href={`/posts/${post.id}`}>
          ← Back to posted post
        </Link>
      </div>

      <p className="mt-6 text-sm text-zinc-600">
        This creates a new copy in Scheduled. The original posted post stays in Posted and is not changed.
      </p>

      <div className="mt-6">
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
    </main>
  );
}
