import Link from "next/link";

import { AdminShell } from "@/app/_components/admin-shell";
import { getCurrentUser } from "@/lib/auth/user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <AdminShell breadcrumb="Workspace" title={`Welcome${user?.name ? `, ${user.name}` : ""}`}>
      <section className="ui-panel max-w-3xl p-[18px]">
        <h2 className="ui-panel-title">Your workspace is ready</h2>
        <p className="mt-2 text-[13.5px] text-text-muted">Connect LinkedIn, then schedule your first post.</p>
        <div className="mt-5 flex gap-3">
          <Link className="ui-btn-primary" href="/settings">
            Connect LinkedIn
          </Link>
          <Link className="ui-btn-secondary" href="/posts/new">
            New post
          </Link>
        </div>
      </section>
    </AdminShell>
  );
}
