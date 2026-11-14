import { describe, expect, it } from "vitest";

import { AbortedError } from "@/shared/api";

import { makeProduct } from "@test/fixtures/product";

import type { Product } from "../model/product";
import type { ProductCatalog } from "../model/product-catalog";

/**
 * Behaviour every ProductCatalog adapter must share. Each adapter's test file
 * calls this with a `setup` that makes the adapter serve exactly `products`.
 */
export function describeProductCatalogContract(
  name: string,
  setup: (products: readonly Product[]) => ProductCatalog,
) {
  describe(`${name} (ProductCatalog contract)`, () => {
    it("lists every product the source holds", async () => {
      const products = [
        makeProduct({ id: 1, title: "Phone" }),
        makeProduct({ id: 2, title: "Laptop", brand: undefined }),
      ];

      await expect(setup(products).list()).resolves.toEqual(products);
    });

    it("lists nothing when the source is empty", async () => {
      await expect(setup([]).list()).resolves.toEqual([]);
    });

    it("rejects with AbortedError when the caller has already aborted", async () => {
      const catalog = setup([makeProduct()]);

      await expect(
        catalog.list({ signal: AbortSignal.abort() }),
      ).rejects.toBeInstanceOf(AbortedError);
    });
  });
}
