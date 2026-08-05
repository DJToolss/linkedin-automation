import Link from "next/link";

import { logoutAction } from "@/app/(auth)/actions";

/** Shared chrome for every signed-in page, so navigation between them is consistent and always reachable. */
export function AppHeader({ title }: { title: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
      <div>
        <p className="text-sm font-medium text-blue-700">LinkedIn Automation</p>
        <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
      </div>
      <nav aria-label="Primary" className="flex items-center gap-4 text-sm font-medium">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/posts">Posts</Link>
        <Link href="/settings">Settings</Link>
        <form action={logoutAction}>
          <button className="rounded border px-3 py-2" type="submit">Sign out</button>
        </form>
      </nav>
    </header>
  );
}
