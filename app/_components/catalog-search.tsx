"use client";

import { useFiltersNavigation } from "@/features/product-filters";
import { SearchBox } from "@/features/semantic-search";

/** Connects the search box (semantic-search) to catalog navigation (product-filters). */
export function CatalogSearch({ query }: { readonly query: string }) {
  const { searchFor } = useFiltersNavigation();
  // Keyed by the URL's query, so the box resets when something else clears it.
  return <SearchBox key={query} defaultQuery={query} onSearch={searchFor} />;
}
