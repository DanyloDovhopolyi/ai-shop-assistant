import Link from "next/link";

import type { ProductFilters } from "@/entities/product";
import { buttonVariants } from "@/shared/ui/button";

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
      className="mt-10 flex items-center justify-center gap-4 text-sm"
    >
      <PageLink
        label="Previous page"
        href={page > 1 ? catalogHref(filters, page - 1) : null}
      >
        Previous
      </PageLink>
      <span className="text-muted-foreground tabular-nums">
        Page {page} of {pageCount}
      </span>
      <PageLink
        label="Next page"
        href={page < pageCount ? catalogHref(filters, page + 1) : null}
      >
        Next
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
  const className = buttonVariants({ variant: "outline" });
  if (href === null) {
    return (
      <span aria-hidden="true" className={`${className} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
