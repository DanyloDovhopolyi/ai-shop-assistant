import Link from "next/link";
import { Suspense } from "react";

import {
  listCategories,
  ProductGrid,
  ProductGridSkeleton,
} from "@/entities/product";
import {
  applyFilters,
  filtersFromSearchParams,
  FiltersNavigationProvider,
  FiltersPendingRegion,
  UrlFiltersPanel,
} from "@/features/product-filters";

import { getCatalog } from "./_lib/catalog";

export default function CatalogPage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">AI Shop Assistant</h1>
      <FiltersNavigationProvider>
        {/* searchParams are request-time data: the shell prerenders, the catalog streams in. */}
        <Suspense fallback={<ProductGridSkeleton />}>
          <FilteredCatalog searchParams={searchParams} />
        </Suspense>
      </FiltersNavigationProvider>
    </main>
  );
}

async function FilteredCatalog({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  // Await request data first: prerendering stops here, so the build never calls the
  // upstream API and a DummyJSON outage cannot fail a deploy. The catalog is fetched
  // and cached on the first request instead.
  const filters = filtersFromSearchParams(await searchParams);
  const catalog = await getCatalog();
  const products = applyFilters(catalog, filters);

  return (
    <>
      <UrlFiltersPanel filters={filters} categories={listCategories(catalog)} />
      <FiltersPendingRegion>
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
            <p className="font-medium">No products match these filters.</p>
            <Link href="/" className="mt-2 inline-block text-sm underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-500">
              {products.length} products
            </p>
            <ProductGrid products={products} />
          </>
        )}
      </FiltersPendingRegion>
    </>
  );
}
