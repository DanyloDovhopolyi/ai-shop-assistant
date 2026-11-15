import Link from "next/link";
import { Suspense } from "react";

import {
  applyFilters,
  listCategories,
  ProductGrid,
  ProductGridSkeleton,
} from "@/entities/product";
import {
  CATALOG_PAGE_SIZE,
  CatalogPagination,
  filtersFromSearchParams,
  FiltersNavigationProvider,
  FiltersPendingRegion,
  pageFromSearchParams,
  queryFromSearchParams,
  catalogHref,
  UrlFiltersPanel,
} from "@/features/product-filters";
import { paginate } from "@/shared/lib";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";

import { CatalogSearch } from "./_components/catalog-search";
import { ShopAssistant } from "./_components/shop-assistant";
import { getCatalog } from "./_lib/catalog";
import { searchCatalog } from "./_lib/search";

export default function CatalogPage({ searchParams }: PageProps<"/">) {
  return (
    <FiltersNavigationProvider>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-[88rem] items-center px-4 sm:px-6 lg:px-8">
          <span className="text-base font-semibold tracking-tight">
            AI Shop Assistant
          </span>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[88rem] flex-1 gap-8 px-4 pt-6 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8 lg:pb-10">
        <main className="min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              All products
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter by hand, or ask the assistant to do it for you.
            </p>
          </div>
          {/* Needs only the URL, so it shows before the catalog has loaded. */}
          <div className="mb-4">
            <Suspense fallback={<SearchBoxPlaceholder />}>
              <SearchFromUrl searchParams={searchParams} />
            </Suspense>
          </div>
          {/* searchParams are request-time data: the shell prerenders, the catalog streams in. */}
          <Suspense fallback={<ProductGridSkeleton />}>
            <FilteredCatalog searchParams={searchParams} />
          </Suspense>
        </main>
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100dvh-6.5rem)] lg:self-start">
          <ShopAssistant />
        </aside>
      </div>
    </FiltersNavigationProvider>
  );
}

async function SearchFromUrl({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  return <CatalogSearch query={queryFromSearchParams(await searchParams)} />;
}

/** Same size as the search box, so nothing jumps when it hydrates. */
function SearchBoxPlaceholder() {
  return <div aria-hidden className="h-10 rounded-lg border bg-card" />;
}

async function FilteredCatalog({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  // Await request data first: prerendering stops here, so the build never calls the
  // upstream API and a DummyJSON outage cannot fail a deploy. The catalog is fetched
  // and cached on the first request instead.
  const params = await searchParams;
  const filters = filtersFromSearchParams(params);
  const query = queryFromSearchParams(params);
  const catalog = await getCatalog();
  // A search narrows the catalog to matches in order of relevance; filters and
  // sorting then apply on top ("Featured" keeps the relevance order).
  const base = query ? await searchCatalog(query, catalog) : catalog;
  const results = paginate(
    applyFilters(base, filters),
    pageFromSearchParams(params),
    CATALOG_PAGE_SIZE,
  );

  return (
    <>
      {query && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Results for</span>
          <Badge variant="secondary" className="text-sm font-normal">
            {query}
          </Badge>
          <Link
            href={catalogHref(filters, 1)}
            className="text-sm underline-offset-4 hover:underline"
          >
            Clear search
          </Link>
        </div>
      )}
      <div className="mb-6 border-b pb-5">
        <UrlFiltersPanel
          filters={filters}
          categories={listCategories(catalog)}
        />
      </div>
      <FiltersPendingRegion>
        {results.total === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">
              {query
                ? "Nothing matches this search with these filters."
                : "No products match these filters."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Widen the price range or pick another category.
            </p>
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                className: "mt-4",
              })}
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground tabular-nums">
              Showing {results.firstIndex + 1}–
              {results.firstIndex + results.items.length} of {results.total}{" "}
              products
            </p>
            <ProductGrid products={results.items} />
            <CatalogPagination
              filters={filters}
              page={results.page}
              pageCount={results.pageCount}
              query={query}
            />
          </>
        )}
      </FiltersPendingRegion>
    </>
  );
}
