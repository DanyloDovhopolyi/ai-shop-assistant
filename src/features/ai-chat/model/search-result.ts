import { z } from "zod";

import type { Product, ProductId } from "@/entities/product";

import type { ProductPreview } from "./filter-result";

/**
 * What the chat needs from a search engine: free text in, product ids out,
 * most relevant first. Declared here so this slice does not depend on the
 * semantic-search slice; the composition root passes any adapter that fits.
 */
export interface ProductMatcher {
  search(
    query: string,
    options?: { readonly limit?: number; readonly signal?: AbortSignal },
  ): Promise<readonly { readonly id: ProductId }[]>;
}

const PriceSchema = z.number().nonnegative();

export const SearchProductsInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(2)
      .describe(
        "What the user is looking for, in their own terms, e.g. 'wireless headphones' or 'warm gift for winter'",
      ),
    minPrice: PriceSchema.optional().describe("Lowest price in USD, inclusive"),
    maxPrice: PriceSchema.optional().describe(
      "Highest price in USD, inclusive",
    ),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: "minPrice must not exceed maxPrice", path: ["minPrice"] },
  );

export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

export interface SearchResult {
  readonly query: string;
  readonly products: readonly ProductPreview[];
}

/** How many products an answer shows; the search is asked for more so a price range still leaves enough. */
export const SEARCH_RESULT_SIZE = 6;
export const SEARCH_CANDIDATES = 24;

/** Turns ranked search hits into what the chat shows, applying the price range. */
export function toSearchResult(
  catalog: readonly Product[],
  rankedIds: readonly ProductId[],
  { query, minPrice, maxPrice }: SearchProductsInput,
  size = SEARCH_RESULT_SIZE,
): SearchResult {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  const products = rankedIds
    .map((id) => byId.get(id))
    .filter((product) => product !== undefined)
    .filter(
      (product) =>
        (minPrice === undefined || product.price >= minPrice) &&
        (maxPrice === undefined || product.price <= maxPrice),
    )
    .slice(0, size)
    .map(({ id, title, category, price, rating }) => ({
      id,
      title,
      category,
      price,
      rating,
    }));

  return { query, products };
}
