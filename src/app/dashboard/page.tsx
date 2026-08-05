import Link from "next/link";
import { AppHeader } from "@/app/_components/app-header";
import { getCurrentUser } from "@/lib/auth/user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12"><AppHeader title={`Welcome${user?.name ? `, ${user.name}` : ""}`} /><section className="mt-10 rounded-xl border bg-zinc-50 p-6"><h2 className="text-lg font-semibold">Your workspace is ready</h2><p className="mt-2 text-zinc-600">Connect LinkedIn, then schedule your first post.</p><div className="mt-5 flex gap-3"><Link className="rounded bg-blue-700 px-4 py-2 font-medium text-white" href="/settings">Connect LinkedIn</Link><Link className="rounded border px-4 py-2 font-medium" href="/posts/new">New post</Link></div></section></main>;
}
