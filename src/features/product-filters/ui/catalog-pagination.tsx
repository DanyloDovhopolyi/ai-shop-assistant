import Link from "next/link";

import type { ProductFilters } from "../model/product-filters";
import { catalogHref } from "../model/search-params";

export interface CatalogPaginationProps {
  readonly filters: ProductFilters;
  readonly page: number;
  readonly pageCount: number;
}

/** Real links, so pages are crawlable, open in new tabs, and get prefetched. */
export function CatalogPagination({
  filters,
  page,
  pageCount,
}: CatalogPaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-4 text-sm"
    >
      <PageLink
        label="Previous page"
        href={page > 1 ? catalogHref(filters, page - 1) : null}
      >
        ← Previous
      </PageLink>
      <span className="text-zinc-500">
        Page {page} of {pageCount}
      </span>
      <PageLink
        label="Next page"
        href={page < pageCount ? catalogHref(filters, page + 1) : null}
      >
        Next →
      </PageLink>
    </nav>
  );
}

function PageLink({
  label,
  href,
  children,
}: {
  readonly label: string;
  readonly href: string | null;
  readonly children: React.ReactNode;
}) {
  const className = "rounded-full border px-4 py-2";
  if (href === null) {
    return (
      <span
        aria-hidden="true"
        className={`${className} border-zinc-100 text-zinc-300 dark:border-zinc-800 dark:text-zinc-700`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900`}
    >
      {children}
    </Link>
  );
}
