import { describe, expect, it } from "vitest";

import type { Product } from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import type { ProductSearch } from "../model/product-search";

const catalog = [
  makeProduct({
    id: 1,
    title: "Wireless Headphones",
    description: "Over-ear headphones with noise cancelling.",
    category: "mobile-accessories",
    brand: "Sonic",
  }),
  makeProduct({
    id: 2,
    title: "Running Sneakers",
    description: "Light shoes for running and the gym.",
    category: "mens-shoes",
    brand: "Stride",
  }),
  makeProduct({
    id: 3,
    title: "Chef Knife",
    description: "Sharp steel knife for the kitchen.",
    category: "kitchen-accessories",
    brand: "Edge",
  }),
];

/**
 * Behaviour every ProductSearch adapter must share. Each adapter's test file
 * calls this with a `setup` that makes the adapter search exactly `products`.
 */
export function describeProductSearchContract(
  name: string,
  setup: (products: readonly Product[]) => ProductSearch,
) {
  describe(`${name} (ProductSearch contract)`, () => {
    it("finds a product by what it is, first", async () => {
      const hits = await setup(catalog).search("headphones");

      expect(hits[0]?.id).toBe(1);
    });

    it("ranks results from most to least similar", async () => {
      const hits = await setup(catalog).search("running shoes for the gym");
      const scores = hits.map((hit) => hit.similarity);

      expect(scores).toEqual(scores.toSorted((a, b) => b - a));
    });

    it("returns at most `limit` results", async () => {
      const hits = await setup(catalog).search("headphones shoes knife", {
        limit: 2,
      });

      expect(hits.length).toBeLessThanOrEqual(2);
    });

    it("returns nothing for a blank query", async () => {
      await expect(setup(catalog).search("   ")).resolves.toEqual([]);
    });

    it("returns only products the catalog holds", async () => {
      const ids = new Set(catalog.map((product) => product.id));
      const hits = await setup(catalog).search("knife headphones sneakers");

      expect(hits.every((hit) => ids.has(hit.id))).toBe(true);
    });
  });
}
