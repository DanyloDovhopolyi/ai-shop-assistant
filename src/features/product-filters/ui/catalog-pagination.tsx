import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import type { ProductFilters } from "@/entities/product";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/shared/ui/pagination";

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
    <Pagination className="mt-10">
      <PaginationContent>
        <PaginationItem>
          <PageLink
            label="Previous page"
            href={page > 1 ? catalogHref(filters, page - 1) : null}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </PageLink>
        </PaginationItem>
        <PaginationItem>
          <span className="px-3 text-sm text-muted-foreground tabular-nums">
            Page {page} of {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PageLink
            label="Next page"
            href={page < pageCount ? catalogHref(filters, page + 1) : null}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </PageLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/**
 * shadcn's PaginationLink renders a plain <a>. A Next Link with the same
 * button styles keeps prefetching and client-side navigation, and stays a
 * real link (Base UI's Button would give it role="button").
 */
function PageLink({
  label,
  href,
  children,
}: {
  readonly label: string;
  readonly href: string | null;
  readonly children: React.ReactNode;
}) {
  if (href === null) {
    return (
      <Button variant="ghost" disabled aria-hidden="true" tabIndex={-1}>
        {children}
      </Button>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={buttonVariants({ variant: "outline" })}
    >
      {children}
    </Link>
  );
}
