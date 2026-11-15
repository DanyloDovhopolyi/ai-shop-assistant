import type { ProductId } from "@/entities/product";

/** A product that matched a free-text query; higher similarity is closer in meaning. */
export interface SearchHit {
  readonly id: ProductId;
  readonly similarity: number;
}

export interface SearchOptions {
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

/**
 * Port: free-text query in, products ranked by relevance out. Adapters: pgvector
 * (semantic) now, keyword search as the fallback in stage 6.
 */
export interface ProductSearch {
  search(query: string, options?: SearchOptions): Promise<readonly SearchHit[]>;
}
