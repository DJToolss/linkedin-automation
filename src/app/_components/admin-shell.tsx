import type { ReactNode } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { SidebarNav } from "@/app/_components/sidebar-nav";
import { ThemeSwitcher } from "@/app/_components/theme-switcher";
import { getCurrentUser } from "@/lib/auth/user";

export async function AdminShell({
  title,
  breadcrumb,
  action,
  children,
}: {
  title: string;
  breadcrumb?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  const initials = (user?.name?.trim()?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="min-h-full bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col bg-nav-bg md:flex">
        <div className="px-4 py-5">
          <p className="text-[13.5px] font-bold tracking-[-0.015em] text-nav-text">LinkedIn Automation</p>
          <p className="mt-1 text-[11.5px] text-nav-text/70">Publishing workspace</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav />
        </div>
        <div className="border-t border-nav-text/15 px-3 py-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-nav-text/12 text-[12px] font-semibold text-nav-text">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-nav-text">{user?.name ?? "Account"}</p>
              <p className="truncate font-mono text-[11.5px] text-nav-text/70">{user?.email}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button className="sidebar-link w-full" type="submit">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="md:pl-[232px]">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft bg-bg px-7 py-3">
          <div>
            <p className="text-[11.5px] text-text-faint">{breadcrumb ?? "Workspace"}</p>
            <h1 className="ui-title mt-0.5">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {action}
          </div>
        </header>

        <div className="border-b border-border-soft bg-nav-bg px-4 py-3 md:hidden">
          <p className="text-[13px] font-bold text-nav-text">LinkedIn Automation</p>
          <div className="mt-2">
            <SidebarNav />
          </div>
        </div>

        <div className="px-7 py-6">{children}</div>
      </div>
    </div>
  );
}
