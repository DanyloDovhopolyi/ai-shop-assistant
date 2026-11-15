import { describe, expect, it } from "vitest";

import { type ProductId, ProductIdSchema } from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import { toComparison } from "./comparison";

const catalog = [
  makeProduct({ id: 1, title: "A", price: 300, rating: 4.1 }),
  makeProduct({ id: 2, title: "B", price: 200, rating: 4.8 }),
  makeProduct({ id: 3, title: "C", price: 200, rating: 3.9 }),
];
const ids = (...values: number[]): ProductId[] =>
  values.map((value) => ProductIdSchema.parse(value));

describe("toComparison", () => {
  it("keeps the order the user asked for", () => {
    const { products } = toComparison(catalog, ids(3, 1));

    expect(products.map((product) => product.title)).toEqual(["C", "A"]);
  });

  it("reports ids that are not in the catalog instead of failing", () => {
    const { products, notFound } = toComparison(catalog, ids(1, 99));

    expect(products.map((product) => product.id)).toEqual(ids(1));
    expect(notFound).toEqual(ids(99));
  });

  it("lists a product once even if it was asked for twice", () => {
    const { products } = toComparison(catalog, ids(1, 1, 2));

    expect(products.map((product) => product.id)).toEqual(ids(1, 2));
  });

  it("marks every product tied for the lowest price and the best rating", () => {
    const { cheapest, bestRated } = toComparison(catalog, ids(1, 2, 3));

    expect(cheapest).toEqual(ids(2, 3));
    expect(bestRated).toEqual(ids(2));
  });

  it("marks nothing when fewer than two products can be compared", () => {
    const { cheapest, bestRated } = toComparison(catalog, ids(1, 99));

    expect(cheapest).toEqual([]);
    expect(bestRated).toEqual([]);
  });
});
