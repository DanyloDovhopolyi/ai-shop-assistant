import { z } from "zod";

import { pickProducts, type ProductCatalog } from "@/entities/product";

import { SearchError } from "./pgvector-product-search";
import type { ProductSearch } from "../model/product-search";
import {
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  SUGGESTION_LIMIT,
  type SuggestionsResponse,
} from "../model/suggestions";

const QuerySchema = z.string().trim().max(MAX_QUERY_LENGTH);

/** Framework-agnostic GET handler for search-as-you-type: `?q=` in, suggestions out. */
export function createSearchHandler({
  search,
  catalog,
}: {
  readonly search: ProductSearch;
  readonly catalog: ProductCatalog;
}) {
  return async function handleSearch(request: Request): Promise<Response> {
    const parsed = QuerySchema.safeParse(
      new URL(request.url).searchParams.get("q") ?? "",
    );
    if (!parsed.success) {
      return Response.json({ error: "Query is too long" }, { status: 400 });
    }
    const query = parsed.data;
    if (query.length < MIN_QUERY_LENGTH) {
      return Response.json({
        query,
        products: [],
      } satisfies SuggestionsResponse);
    }

    try {
      const [hits, products] = await Promise.all([
        search.search(query, {
          limit: SUGGESTION_LIMIT,
          signal: request.signal,
        }),
        catalog.list({ signal: request.signal }),
      ]);
      const body: SuggestionsResponse = {
        query,
        products: pickProducts(
          products,
          hits.map((hit) => hit.id),
        ).map(({ id, title, category, price, imageUrl }) => ({
          id,
          title,
          category,
          price,
          imageUrl,
        })),
      };
      return Response.json(body);
    } catch (error) {
      if (!(error instanceof SearchError)) throw error;
      console.error(error.message);
      return Response.json({ error: "Search is unavailable" }, { status: 503 });
    }
  };
}
