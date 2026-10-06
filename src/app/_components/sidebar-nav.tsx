"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const workspaceLinks = [
  { href: "/dashboard", label: "Dashboard", match: (path: string) => path === "/dashboard" },
  { href: "/posts", label: "Posts", match: (path: string) => path.startsWith("/posts") },
];

const accountLinks = [{ href: "/settings", label: "Settings", match: (path: string) => path.startsWith("/settings") }];

function DashboardIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function PostsIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
    </svg>
  );
}

const ICONS: Record<string, () => ReactNode> = {
  "/dashboard": DashboardIcon,
  "/posts": PostsIcon,
  "/settings": SettingsIcon,
};

function NavGroup({ label, links, pathname }: { label: string; links: typeof workspaceLinks; pathname: string }) {
  return (
    <div>
      <p className="sidebar-section px-2.5 pb-2">{label}</p>
      <div className="space-y-0.5">
        {links.map((link) => {
          const Icon = ICONS[link.href];
          const active = link.match(pathname);
          return (
            <Link aria-current={active ? "page" : undefined} className="sidebar-link" href={link.href} key={link.href}>
              {Icon ? <Icon /> : null}
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="space-y-6">
      <NavGroup label="Workspace" links={workspaceLinks} pathname={pathname} />
      <NavGroup label="Account" links={accountLinks} pathname={pathname} />
    </nav>
  );
}
