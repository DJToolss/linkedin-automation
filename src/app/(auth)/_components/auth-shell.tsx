import type { ReactNode } from "react";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12"><section className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-zinc-600">LinkedIn Automation</p><div className="mt-8">{children}</div></section></main>;
}
