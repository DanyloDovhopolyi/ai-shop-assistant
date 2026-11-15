import { describe, expect, it } from "vitest";

import { type ProductId, ProductIdSchema } from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import { SearchProductsInputSchema, toSearchResult } from "./search-result";

const catalog = [
  makeProduct({ id: 1, title: "AirPods Max", price: 549 }),
  makeProduct({ id: 2, title: "Beats Flex", price: 49 }),
  makeProduct({ id: 3, title: "AirPods", price: 129 }),
];
const ids = (...values: number[]): ProductId[] =>
  values.map((value) => ProductIdSchema.parse(value));
const titles = (result: ReturnType<typeof toSearchResult>) =>
  result.products.map((product) => product.title);

describe("toSearchResult", () => {
  it("keeps the order of relevance the search returned", () => {
    const result = toSearchResult(catalog, ids(3, 1, 2), {
      query: "headphones",
    });

    expect(titles(result)).toEqual(["AirPods", "AirPods Max", "Beats Flex"]);
  });

  it("drops matches that are no longer in the catalog", () => {
    expect(
      titles(toSearchResult(catalog, ids(9, 2), { query: "headphones" })),
    ).toEqual(["Beats Flex"]);
  });

  it("applies the price range the user asked for", () => {
    const result = toSearchResult(catalog, ids(1, 2, 3), {
      query: "headphones",
      maxPrice: 150,
    });

    expect(titles(result)).toEqual(["Beats Flex", "AirPods"]);
  });

  it("returns only the top matches", () => {
    const result = toSearchResult(
      catalog,
      ids(1, 2, 3),
      { query: "headphones" },
      2,
    );

    expect(result.products).toHaveLength(2);
  });
});

describe("SearchProductsInputSchema", () => {
  it("rejects a reversed price range, like the filter contract does", () => {
    expect(
      SearchProductsInputSchema.safeParse({
        query: "gift",
        minPrice: 100,
        maxPrice: 10,
      }).success,
    ).toBe(false);
  });
});
