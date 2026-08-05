import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth/user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12"><header className="flex items-center justify-between border-b pb-6"><div><p className="text-sm font-medium text-blue-700">LinkedIn Automation</p><h1 className="mt-1 text-3xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ""}</h1></div><form action={logoutAction}><button className="rounded border px-3 py-2 text-sm font-medium" type="submit">Sign out</button></form></header><section className="mt-10 rounded-xl border bg-zinc-50 p-6"><h2 className="text-lg font-semibold">Your workspace is ready</h2><p className="mt-2 text-zinc-600">Next, connect LinkedIn and schedule your first post.</p><Link className="mt-5 inline-block rounded bg-blue-700 px-4 py-2 font-medium text-white" href="/settings">Continue to settings</Link></section></main>;
}
