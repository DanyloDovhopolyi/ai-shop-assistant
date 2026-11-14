import { describe, expect, it } from "vitest";

import { makeProduct } from "@test/fixtures/product";

import { applyFilters } from "./apply-filters";
import { DEFAULT_FILTERS, type ProductFilters } from "./product-filters";

const phone = makeProduct({
  id: 1,
  title: "Phone",
  category: "smartphones",
  price: 500,
  rating: 4.2,
});
const case_ = makeProduct({
  id: 2,
  title: "Case",
  category: "mobile-accessories",
  price: 20,
  rating: 4.8,
});
const buds = makeProduct({
  id: 3,
  title: "Buds",
  category: "mobile-accessories",
  price: 80,
  rating: 3.9,
});
const watch = makeProduct({
  id: 4,
  title: "Watch",
  category: "mobile-accessories",
  price: 80,
  rating: 4.8,
});
const catalog = [phone, case_, buds, watch];

const filter = (filters: Partial<ProductFilters>) =>
  applyFilters(catalog, { ...DEFAULT_FILTERS, ...filters }).map((p) => p.title);

describe("applyFilters", () => {
  it("keeps the whole catalog in its original order by default", () => {
    expect(filter({})).toEqual(["Phone", "Case", "Buds", "Watch"]);
  });

  it("keeps only the chosen category", () => {
    expect(filter({ category: "smartphones" })).toEqual(["Phone"]);
  });

  it("treats price bounds as inclusive", () => {
    expect(filter({ minPrice: 20, maxPrice: 80 })).toEqual([
      "Case",
      "Buds",
      "Watch",
    ]);
  });

  it("keeps products rated at least the minimum", () => {
    expect(filter({ minRating: 4.5 })).toEqual(["Case", "Watch"]);
  });

  it("requires every filter to match", () => {
    expect(
      filter({ category: "mobile-accessories", maxPrice: 50, minRating: 4 }),
    ).toEqual(["Case"]);
  });

  it.each([
    ["price-asc", ["Case", "Buds", "Watch", "Phone"]],
    ["price-desc", ["Phone", "Buds", "Watch", "Case"]],
    ["rating-desc", ["Case", "Watch", "Phone", "Buds"]],
  ] as const)(
    "sorts by %s, keeping catalog order for ties",
    (sort, expected) => {
      expect(filter({ sort })).toEqual(expected);
    },
  );

  it("returns a new list and leaves the catalog untouched", () => {
    const snapshot = [...catalog];

    applyFilters(catalog, { ...DEFAULT_FILTERS, sort: "price-asc" });

    expect(catalog).toEqual(snapshot);
  });
});
