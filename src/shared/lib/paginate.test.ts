import { describe, expect, it } from "vitest";

import { paginate } from "./paginate";

const items = Array.from({ length: 10 }, (_, i) => i + 1);

describe("paginate", () => {
  it("returns the requested page and where it sits in the whole", () => {
    expect(paginate(items, 2, 4)).toEqual({
      items: [5, 6, 7, 8],
      page: 2,
      pageCount: 3,
      total: 10,
      firstIndex: 4,
    });
  });

  it("returns a shorter last page", () => {
    expect(paginate(items, 3, 4)).toMatchObject({ items: [9, 10], page: 3 });
  });

  it.each([
    ["past the end", 99, 3],
    ["below the first page", 0, 1],
  ])(
    "clamps a page %s to the nearest real page",
    (_case, requested, expected) => {
      expect(paginate(items, requested, 4).page).toBe(expected);
    },
  );

  it("treats an empty list as a single empty page", () => {
    expect(paginate([], 5, 4)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      firstIndex: 0,
    });
  });
});
