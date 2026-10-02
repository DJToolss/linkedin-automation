import Link from "next/link";

type PostsPaginationProps = {
  tab: "scheduled" | "posted";
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

function pageHref(tab: "scheduled" | "posted", page: number): string {
  const params = new URLSearchParams();
  if (tab === "posted") params.set("tab", "posted");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/posts?${query}` : "/posts";
}

export function PostsPagination({ tab, page, totalPages, total, pageSize }: PostsPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, index) => windowStart + index);

  return (
    <nav aria-label="Posts pagination" className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="font-mono text-[12.5px] text-text-muted">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          className={`ui-btn-secondary px-3 py-1.5 text-[13px] ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          href={pageHref(tab, page - 1)}
        >
          Previous
        </Link>
        {pages.map((pageNumber) => (
          <Link
            aria-current={pageNumber === page ? "page" : undefined}
            className={`min-w-9 rounded-[8px] border px-3 py-1.5 text-center font-mono text-[13px] font-medium ${
              pageNumber === page ? "border-accent bg-accent text-nav-text" : "border-border bg-surface text-text hover:bg-surface-2"
            }`}
            href={pageHref(tab, pageNumber)}
            key={pageNumber}
          >
            {pageNumber}
          </Link>
        ))}
        <Link
          aria-disabled={page >= totalPages}
          className={`ui-btn-secondary px-3 py-1.5 text-[13px] ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          href={pageHref(tab, page + 1)}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
