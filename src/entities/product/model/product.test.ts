import { expect, it } from "vitest";

import { type ProductId, ProductIdSchema } from "./product";

it("only accepts product ids that went through the schema", () => {
  const id: ProductId = ProductIdSchema.parse(7);
  expect(id).toBe(7);

  // @ts-expect-error a plain number is not a ProductId: ids must be parsed, never invented
  const invented: ProductId = 7;
  expect(invented).toBe(7);
});
