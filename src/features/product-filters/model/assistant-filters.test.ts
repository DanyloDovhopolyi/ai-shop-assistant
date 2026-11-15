import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS, type ProductFilters } from "@/entities/product";

import { assistantFilterKeys } from "./assistant-filters";

const chosen: ProductFilters = {
  ...DEFAULT_FILTERS,
  category: "laptops",
  maxPrice: 1500,
  sort: "rating-desc",
};

describe("assistantFilterKeys", () => {
  it("marks every filter the assistant set while it is still in place", () => {
    expect(assistantFilterKeys(chosen, chosen)).toEqual(
      new Set(["category", "maxPrice", "sort"]),
    );
  });

  it("unmarks a filter once the user changes it by hand", () => {
    const edited = { ...chosen, maxPrice: 900 };

    expect(assistantFilterKeys(edited, chosen)).toEqual(
      new Set(["category", "sort"]),
    );
  });

  it("does not mark defaults the assistant left alone", () => {
    const ratingOnly = { ...DEFAULT_FILTERS, minRating: 4 };

    expect(assistantFilterKeys(ratingOnly, ratingOnly)).toEqual(
      new Set(["minRating"]),
    );
  });

  it("marks nothing before the assistant has filtered", () => {
    expect(assistantFilterKeys(chosen, null).size).toBe(0);
  });
});
