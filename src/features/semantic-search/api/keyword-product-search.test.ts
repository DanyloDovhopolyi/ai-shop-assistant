import { describe, expect, it } from "vitest";

import { createInMemoryProductCatalog } from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import { createKeywordProductSearch } from "./keyword-product-search";
import { describeProductSearchContract } from "./product-search.contract";

describeProductSearchContract("keyword search", (products) =>
  createKeywordProductSearch({
    catalog: createInMemoryProductCatalog(products),
  }),
);

describe("keyword search", () => {
  const search = createKeywordProductSearch({
    catalog: createInMemoryProductCatalog([
      makeProduct({ id: 1, title: "Phone Case", description: "Fits a phone." }),
      makeProduct({ id: 2, title: "Desk", description: "A case for a phone." }),
      makeProduct({ id: 3, title: "Lamp", description: "Warm light." }),
    ]),
  });

  it("weighs a match in the title above one in the description", async () => {
    const hits = await search.search("phone case");

    expect(hits.map((hit) => hit.id)).toEqual([1, 2]);
  });

  it("matches word forms: a plural query finds the singular, a stem finds the word", async () => {
    await expect(search.search("lamps")).resolves.toHaveLength(1);
    await expect(search.search("ligh")).resolves.toHaveLength(1);
  });

  it("ignores filler words, so they match nothing on their own", async () => {
    await expect(search.search("something for the")).resolves.toEqual([]);
  });
});
