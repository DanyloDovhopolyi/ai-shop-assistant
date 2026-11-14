import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS, type ProductFilters } from "@/entities/product";

import {
  catalogHref,
  filtersFromSearchParams,
  filtersToSearchParams,
  pageFromSearchParams,
} from "./search-params";

describe("filtersFromSearchParams", () => {
  it("falls back to defaults when the URL has no filters", () => {
    expect(filtersFromSearchParams({})).toEqual(DEFAULT_FILTERS);
  });

  it("reads every filter from its string form", () => {
    expect(
      filtersFromSearchParams({
        category: "laptops",
        minPrice: "100",
        maxPrice: "900.5",
        minRating: "4",
        sort: "price-desc",
      }),
    ).toEqual({
      category: "laptops",
      minPrice: 100,
      maxPrice: 900.5,
      minRating: 4,
      sort: "price-desc",
    });
  });

  it("drops only the broken values of a hand-edited URL", () => {
    expect(
      filtersFromSearchParams({
        minPrice: "cheap",
        maxPrice: "100",
        minRating: "9",
        sort: "random",
      }),
    ).toEqual({ maxPrice: 100, sort: "featured" });
  });

  it("swaps a reversed price range instead of discarding it", () => {
    expect(
      filtersFromSearchParams({ minPrice: "500", maxPrice: "100" }),
    ).toMatchObject({
      minPrice: 100,
      maxPrice: 500,
    });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(
      filtersFromSearchParams({ category: ["laptops", "tablets"] }),
    ).toMatchObject({
      category: "laptops",
    });
  });
});

describe("filtersToSearchParams", () => {
  it("writes nothing for default filters, keeping the URL clean", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("round-trips through the URL", () => {
    const filters: ProductFilters = {
      category: "laptops",
      minPrice: 100,
      maxPrice: 900,
      minRating: 4.5,
      sort: "rating-desc",
    };
    const params = Object.fromEntries(filtersToSearchParams(filters));

    expect(filtersFromSearchParams(params)).toEqual(filters);
  });
});

describe("pageFromSearchParams", () => {
  it.each([
    ["missing", undefined, 1],
    ["valid", "3", 3],
    ["zero", "0", 1],
    ["negative", "-2", 1],
    ["fractional", "2.5", 1],
    ["not a number", "two", 1],
  ])("reads a %s page", (_case, value, expected) => {
    expect(pageFromSearchParams({ page: value })).toBe(expected);
  });
});

describe("catalogHref", () => {
  const filters: ProductFilters = { ...DEFAULT_FILTERS, category: "laptops" };

  it("keeps the filters when moving between pages", () => {
    expect(catalogHref(filters, 2)).toBe("?category=laptops&page=2");
  });

  it("leaves the first page out of the URL", () => {
    expect(catalogHref(filters, 1)).toBe("?category=laptops");
  });

  it("starts from the first page whenever filters change", () => {
    // Filter changes serialise filters only, so a stale page can never survive them.
    expect(
      filtersToSearchParams({ ...filters, minRating: 4 }).has("page"),
    ).toBe(false);
  });
});
