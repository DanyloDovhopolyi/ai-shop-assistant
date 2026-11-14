import Link from "next/link";
import { Suspense } from "react";

import { ProductGrid, ProductGridSkeleton } from "@/entities/product";
import {
  applyFilters,
  filtersFromSearchParams,
} from "@/features/product-filters";

import { getCatalog } from "./_lib/catalog";

export default function CatalogPage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">AI Shop Assistant</h1>
      {/* searchParams are request-time data: the shell prerenders, the grid streams in. */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <FilteredCatalog searchParams={searchParams} />
      </Suspense>
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
  const products = applyFilters(await getCatalog(), filters);

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="font-medium">No products match these filters.</p>
        <Link href="/" className="mt-2 inline-block text-sm underline">
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-zinc-500">{products.length} products</p>
      <ProductGrid products={products} />
    </>
  );
}
