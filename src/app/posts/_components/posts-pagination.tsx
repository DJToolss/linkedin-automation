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
    <nav aria-label="Posts pagination" className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-zinc-600">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          className={`rounded border px-3 py-1.5 text-sm font-medium ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-zinc-50"}`}
          href={pageHref(tab, page - 1)}
        >
          Previous
        </Link>
        {pages.map((pageNumber) => (
          <Link
            aria-current={pageNumber === page ? "page" : undefined}
            className={`min-w-9 rounded border px-3 py-1.5 text-center text-sm font-medium ${
              pageNumber === page ? "border-blue-700 bg-blue-700 text-white" : "hover:bg-zinc-50"
            }`}
            href={pageHref(tab, pageNumber)}
            key={pageNumber}
          >
            {pageNumber}
          </Link>
        ))}
        <Link
          aria-disabled={page >= totalPages}
          className={`rounded border px-3 py-1.5 text-sm font-medium ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-zinc-50"}`}
          href={pageHref(tab, page + 1)}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
