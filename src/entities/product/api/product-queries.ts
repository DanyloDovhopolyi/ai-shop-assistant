import { queryOptions } from "@tanstack/react-query";

import { fetchJson } from "@/shared/api";

import { type ProductId, ProductSchema } from "../model/product";

/**
 * Client-side product queries. One key per product id, so every place that
 * shows a product (chat cards, comparison table) shares one cached request.
 */
export const productQueries = {
  all: () => ["products"] as const,
  detail: (id: ProductId) =>
    queryOptions({
      queryKey: [...productQueries.all(), "detail", id] as const,
      // TanStack Query owns retries on the client; fetchJson must not add its own.
      queryFn: ({ signal }) =>
        fetchJson(`/api/products/${String(id)}`, ProductSchema, {
          signal,
          retries: 0,
        }),
      // The server catalog is cached for hours; a product rarely changes mid-session.
      staleTime: 5 * 60 * 1000,
    }),
};
