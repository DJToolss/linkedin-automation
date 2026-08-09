import Link from "next/link";

export type PostsTab = "scheduled" | "posted";

export function PostTabs({
  activeTab,
  scheduledCount,
  postedCount,
}: {
  activeTab: PostsTab;
  scheduledCount: number;
  postedCount: number;
}) {
  const tabs: { id: PostsTab; label: string; count: number }[] = [
    { id: "scheduled", label: "Scheduled", count: scheduledCount },
    { id: "posted", label: "Posted", count: postedCount },
  ];

  return (
    <div className="border-b">
      <nav aria-label="Post lists" className="-mb-px flex gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                isActive ? "border-blue-700 text-blue-700" : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
              href={tab.id === "scheduled" ? "/posts" : `/posts?tab=${tab.id}`}
              key={tab.id}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{tab.count}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
