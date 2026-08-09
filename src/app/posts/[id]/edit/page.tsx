import { notFound } from "next/navigation";

import { AppHeader } from "@/app/_components/app-header";
import { updatePostAction } from "@/app/posts/actions";
import { PostComposer } from "@/app/posts/_components/post-composer";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { getEditablePostForUser } from "@/lib/posts/posts";
import { listSupportedTimeZones, utcToZonedInputValue } from "@/lib/time/timezone";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuthenticatedUserId();
  const { id } = await params;

  const post = await getEditablePostForUser(userId, id);
  if (!post) notFound();

  const timezone = post.timezone ?? "UTC";
  const scheduledAtLocal = post.scheduledAt ? utcToZonedInputValue(post.scheduledAt, timezone) : "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <AppHeader title="Edit post" />
      <div className="mt-8">
        <PostComposer
          action={updatePostAction.bind(null, post.id)}
          existing={{
            heading: post.heading ?? "",
            subHeading: post.subHeading ?? "",
            content: post.content,
            imageUrl: post.imageUrl,
            scheduledAtLocal,
            timezone,
          }}
          submitLabel="Save changes"
          timeZones={listSupportedTimeZones()}
        />
      </div>
    </main>
  );
}
