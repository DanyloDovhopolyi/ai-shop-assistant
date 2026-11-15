import { expect, it } from "vitest";

import { makeProduct } from "@test/fixtures/product";

import { listCategories, type ProductId, ProductIdSchema } from "./product";

it("only accepts product ids that went through the schema", () => {
  const id: ProductId = ProductIdSchema.parse(7);
  expect(id).toBe(7);

  // @ts-expect-error a plain number is not a ProductId: ids must be parsed, never invented
  const invented: ProductId = 7;
  expect(invented).toBe(7);
});

it("lists each catalog category once, alphabetically", () => {
  const products = [
    makeProduct({ id: 1, category: "smartphones" }),
    makeProduct({ id: 2, category: "laptops" }),
    makeProduct({ id: 3, category: "smartphones" }),
  ];

  expect(listCategories(products)).toEqual(["laptops", "smartphones"]);
});
