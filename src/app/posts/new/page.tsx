import { AdminShell } from "@/app/_components/admin-shell";
import { createPostAction } from "@/app/posts/actions";
import { PostComposer } from "@/app/posts/_components/post-composer";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { listPendingScheduledAtIsosForUser } from "@/lib/posts/posts";
import { listSupportedTimeZones } from "@/lib/time/timezone";

export default async function NewPostPage() {
  const userId = await requireAuthenticatedUserId();
  const scheduledAtIsos = await listPendingScheduledAtIsosForUser(userId);
  return (
    <AdminShell breadcrumb="Posts / New" title="New post">
      <div className="ui-panel max-w-2xl p-[18px]">
        <PostComposer action={createPostAction} scheduledAtIsos={scheduledAtIsos} submitLabel="Schedule post" timeZones={listSupportedTimeZones()} />
      </div>
    </AdminShell>
  );
}
