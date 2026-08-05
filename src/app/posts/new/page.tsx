import { AppHeader } from "@/app/_components/app-header";
import { createPostAction } from "@/app/posts/actions";
import { PostComposer } from "@/app/posts/_components/post-composer";
import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { listSupportedTimeZones } from "@/lib/time/timezone";

export default async function NewPostPage() {
  await requireAuthenticatedUserId();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <AppHeader title="New post" />
      <div className="mt-8">
        <PostComposer action={createPostAction} submitLabel="Schedule post" timeZones={listSupportedTimeZones()} />
      </div>
    </main>
  );
}
