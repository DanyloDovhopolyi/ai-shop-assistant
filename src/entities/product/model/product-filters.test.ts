import { describe, expect, it } from "vitest";

import { ProductFiltersSchema } from "./product-filters";

describe("ProductFiltersSchema", () => {
  it("fills defaults for an empty request", () => {
    expect(ProductFiltersSchema.parse({})).toEqual({ sort: "featured" });
  });

  it("rejects a price range whose minimum exceeds its maximum", () => {
    const result = ProductFiltersSchema.safeParse({
      minPrice: 100,
      maxPrice: 50,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown sort order", () => {
    expect(ProductFiltersSchema.safeParse({ sort: "cheapest" }).success).toBe(
      false,
    );
  });
});
