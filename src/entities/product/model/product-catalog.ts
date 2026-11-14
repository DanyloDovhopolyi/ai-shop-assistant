import type { Product } from "./product";

/** Port: where the full product catalog comes from. Adapters live in `api/`. */
export interface ProductCatalog {
  list(options?: {
    readonly signal?: AbortSignal | undefined;
  }): Promise<readonly Product[]>;
}
