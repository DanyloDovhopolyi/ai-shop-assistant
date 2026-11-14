import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS } from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import { toFilterResult } from "./filter-result";

const catalog = Array.from({ length: 8 }, (_, i) =>
  makeProduct({
    id: i + 1,
    title: `Laptop ${String(i + 1)}`,
    category: "laptops",
    price: 100 * (i + 1),
  }),
);

describe("toFilterResult", () => {
  it("reports how many products match and previews the first few for the model", () => {
    const result = toFilterResult(catalog, {
      ...DEFAULT_FILTERS,
      maxPrice: 600,
      sort: "price-desc",
    });

    expect(result.total).toBe(6);
    expect(result.preview.map((p) => p.title)).toEqual([
      "Laptop 6",
      "Laptop 5",
      "Laptop 4",
      "Laptop 3",
      "Laptop 2",
    ]);
  });

  it("returns the applied filters so the client can show the same results", () => {
    const filters = { ...DEFAULT_FILTERS, category: "laptops" };

    expect(toFilterResult(catalog, filters).filters).toEqual(filters);
  });

  it("keeps only what the model needs to talk about a product", () => {
    const [first] = toFilterResult(catalog, DEFAULT_FILTERS).preview;

    expect(first).toEqual({
      id: 1,
      title: "Laptop 1",
      category: "laptops",
      price: 100,
      rating: 4.5,
    });
  });
});
