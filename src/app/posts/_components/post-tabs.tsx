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
    <div className="ui-tabs">
      <nav aria-label="Post lists" className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium ${
                isActive ? "bg-card text-text shadow-card" : "text-slate hover:text-text"
              }`}
              href={tab.id === "scheduled" ? "/posts" : `/posts?tab=${tab.id}`}
              key={tab.id}
            >
              {tab.label}
              <span className={`ml-2 rounded-[6px] px-2 py-0.5 font-mono text-[11.5px] ${isActive ? "bg-paper-2 text-text" : "bg-paper text-slate"}`}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
