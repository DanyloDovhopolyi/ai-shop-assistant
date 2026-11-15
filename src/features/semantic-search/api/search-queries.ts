import { queryOptions } from "@tanstack/react-query";

import { fetchJson } from "@/shared/api";

import {
  MIN_QUERY_LENGTH,
  SuggestionsResponseSchema,
} from "../model/suggestions";

/** Client-side search queries: one cache entry per typed query. */
export const searchQueries = {
  all: () => ["search"] as const,
  suggestions: (query: string) =>
    queryOptions({
      queryKey: [...searchQueries.all(), "suggestions", query] as const,
      // The signal lets TanStack Query abort a request whose query the user has
      // already typed past. Retries belong to TanStack Query, not fetchJson.
      queryFn: ({ signal }) =>
        fetchJson(
          `/api/search?q=${encodeURIComponent(query)}`,
          SuggestionsResponseSchema,
          { signal, retries: 0 },
        ),
      enabled: query.length >= MIN_QUERY_LENGTH,
      staleTime: 5 * 60 * 1000,
    }),
};
