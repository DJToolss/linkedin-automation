import { AppHeader } from "@/app/_components/app-header";
import { createPostAction } from "@/app/posts/actions";
import { PostComposer } from "@/app/posts/_components/post-composer";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { listPendingScheduledAtIsosForUser } from "@/lib/posts/posts";
import { listSupportedTimeZones } from "@/lib/time/timezone";

export default async function NewPostPage() {
  const userId = await requireAuthenticatedUserId();
  const scheduledAtIsos = await listPendingScheduledAtIsosForUser(userId);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <AppHeader title="New post" />
      <div className="mt-8">
        <PostComposer action={createPostAction} scheduledAtIsos={scheduledAtIsos} submitLabel="Schedule post" timeZones={listSupportedTimeZones()} />
      </div>
    </main>
  );
}
