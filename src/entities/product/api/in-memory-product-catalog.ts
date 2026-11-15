import { AbortedError } from "@/shared/api";

import type { Product } from "../model/product";
import type { ProductCatalog } from "../model/product-catalog";

/** Serves a fixed list. Used as a test double and for local experiments without network. */
export function createInMemoryProductCatalog(
  products: readonly Product[],
): ProductCatalog {
  return {
    list({ signal } = {}) {
      if (signal?.aborted)
        return Promise.reject(new AbortedError("memory://products"));
      return Promise.resolve(products);
    },
  };
}
