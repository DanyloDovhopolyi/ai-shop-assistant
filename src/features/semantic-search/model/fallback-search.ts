import type { ProductSearch } from "./product-search";

/**
 * A search that degrades instead of failing: if `primary` throws, `fallback`
 * answers. A search the caller cancelled is not an outage, so it is not retried.
 */
export function withFallback(
  primary: ProductSearch,
  fallback: ProductSearch,
  onFallback?: (error: unknown) => void,
): ProductSearch {
  return {
    async search(query, options) {
      try {
        return await primary.search(query, options);
      } catch (error) {
        if (options?.signal?.aborted) throw error;
        onFallback?.(error);
        return fallback.search(query, options);
      }
    },
  };
}
