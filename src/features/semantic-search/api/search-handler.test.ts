import { describe, expect, it, vi } from "vitest";

import {
  createInMemoryProductCatalog,
  ProductIdSchema,
} from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import { SearchError } from "./pgvector-product-search";
import { createSearchHandler } from "./search-handler";

const catalog = createInMemoryProductCatalog([
  makeProduct({ id: 1, title: "AirPods", price: 129 }),
  makeProduct({ id: 2, title: "Beats Flex", price: 49 }),
]);

function get(query: string) {
  return new Request(
    `http://localhost/api/search?q=${encodeURIComponent(query)}`,
  );
}

describe("search handler", () => {
  it("returns matching products in order of relevance", async () => {
    const search = {
      search: vi.fn(() =>
        Promise.resolve([
          { id: ProductIdSchema.parse(2), similarity: 0.7 },
          { id: ProductIdSchema.parse(1), similarity: 0.6 },
        ]),
      ),
    };

    const response = await createSearchHandler({ search, catalog })(
      get(" headphones "),
    );

    expect(await response.json()).toEqual({
      query: "headphones",
      products: [
        expect.objectContaining({ title: "Beats Flex", price: 49 }),
        expect.objectContaining({ title: "AirPods", price: 129 }),
      ],
    });
    expect(search.search).toHaveBeenCalledWith(
      "headphones",
      expect.objectContaining({ limit: 6 }),
    );
  });

  it("answers a too-short query with no suggestions and no search", async () => {
    const search = { search: vi.fn() };

    const response = await createSearchHandler({ search, catalog })(get("h"));

    expect(await response.json()).toEqual({ query: "h", products: [] });
    expect(search.search).not.toHaveBeenCalled();
  });

  it("rejects an oversized query", async () => {
    const search = { search: vi.fn() };

    const response = await createSearchHandler({ search, catalog })(
      get("x".repeat(201)),
    );

    expect(response.status).toBe(400);
    expect(search.search).not.toHaveBeenCalled();
  });

  it("reports an unavailable search as 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const search = {
      search: () => Promise.reject(new SearchError("not configured")),
    };

    const response = await createSearchHandler({ search, catalog })(
      get("headphones"),
    );

    expect(response.status).toBe(503);
  });
});
