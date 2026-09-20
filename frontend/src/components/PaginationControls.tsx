import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PaginationMeta } from "../lib/api";

type Props = {
  pagination: PaginationMeta;
  loading?: boolean;
  itemLabel?: string;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  pagination,
  loading = false,
  itemLabel = "élément",
  onPageChange,
}: Props) {
  const plural = pagination.total_items > 1 ? "s" : "";
  const first = Math.max(
    1,
    Math.min(pagination.page - 2, pagination.total_pages - 4),
  );
  const pages = Array.from(
    { length: Math.min(5, pagination.total_pages) },
    (_, index) => first + index,
  );
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-atlas-line bg-white px-5 py-4">
      <p className="text-xs font-semibold text-slate-500">
        {pagination.total_items} {itemLabel}
        {plural} · page {pagination.page}/{pagination.total_pages}
      </p>
      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          disabled={!pagination.has_previous || loading}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-atlas-line bg-white px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:border-atlas-teal hover:text-atlas-teal disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Précédent</span>
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            disabled={loading}
            onClick={() => onPageChange(page)}
            aria-current={page === pagination.page ? "page" : undefined}
            className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-black transition ${
              page === pagination.page
                ? "bg-atlas-teal text-white shadow-sm"
                : "border border-atlas-line bg-white text-slate-600 hover:border-atlas-teal hover:text-atlas-teal"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          disabled={!pagination.has_next || loading}
          onClick={() => onPageChange(pagination.page + 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-atlas-teal px-2.5 py-2 text-sm font-bold text-white transition hover:bg-atlas-petrol disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight size={16} />
        </button>
      </nav>
    </footer>
  );
}
