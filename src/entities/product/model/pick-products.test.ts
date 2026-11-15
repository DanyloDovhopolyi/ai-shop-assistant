import { describe, expect, it } from "vitest";

import { makeProduct } from "@test/fixtures/product";

import { pickProducts } from "./pick-products";
import { ProductIdSchema } from "./product";

const catalog = [1, 2, 3].map((id) =>
  makeProduct({ id, title: `P${String(id)}` }),
);
const ids = (...values: number[]) =>
  values.map((value) => ProductIdSchema.parse(value));

describe("pickProducts", () => {
  it("returns products in the order of the ids, e.g. search relevance", () => {
    expect(pickProducts(catalog, ids(3, 1)).map((p) => p.title)).toEqual([
      "P3",
      "P1",
    ]);
  });

  it("skips ids that are not in the catalog and repeats", () => {
    expect(pickProducts(catalog, ids(2, 9, 2)).map((p) => p.title)).toEqual([
      "P2",
    ]);
  });
});
