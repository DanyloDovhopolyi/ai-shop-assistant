import { tool } from "ai";

import type { ProductCatalog } from "@/entities/product";

import {
  type ProductMatcher,
  SEARCH_CANDIDATES,
  SearchProductsInputSchema,
  toSearchResult,
} from "../model/search-result";

/**
 * Finds products by meaning, for needs the filters cannot express
 * ("headphones", "a gift for a runner"). Results show as cards in the chat.
 */
export function createSearchProductsTool({
  catalog,
  search,
}: {
  readonly catalog: ProductCatalog;
  readonly search: ProductMatcher;
}) {
  return tool({
    description:
      "Search the catalog by meaning for products that match a need or description. Use it when no category or filter expresses what the user wants.",
    inputSchema: SearchProductsInputSchema,
    execute: async (input, { abortSignal }) => {
      const options = {
        limit: SEARCH_CANDIDATES,
        ...(abortSignal ? { signal: abortSignal } : {}),
      };
      const [hits, products] = await Promise.all([
        search.search(input.query, options),
        catalog.list({ signal: abortSignal }),
      ]);
      return toSearchResult(
        products,
        hits.map((hit) => hit.id),
        input,
      );
    },
  });
}
