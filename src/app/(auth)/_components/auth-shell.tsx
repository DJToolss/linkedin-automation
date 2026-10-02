import type { ReactNode } from "react";

import { ThemeSwitcher } from "@/app/_components/theme-switcher";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center bg-bg px-4 py-12">
      <div className="absolute right-6 top-6">
        <ThemeSwitcher />
      </div>
      <section className="ui-panel w-full max-w-md p-8">
        <p className="text-[12.5px] font-semibold text-accent">LinkedIn Automation</p>
        <h1 className="ui-title mt-2">{title}</h1>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
