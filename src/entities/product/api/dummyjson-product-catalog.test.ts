import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";

import { InvalidResponseError } from "@/shared/api";

import { makeProduct } from "@test/fixtures/product";
import { server } from "@test/msw/server";

import { createDummyJsonProductCatalog } from "./dummyjson-product-catalog";
import { describeProductCatalogContract } from "./product-catalog.contract";
import type { Product } from "../model/product";

const BASE_URL = "https://dummyjson.test";

/** The upstream wire format: DummyJSON calls the image `thumbnail` and paginates by default. */
function toDummyJson(product: Product) {
  const { imageUrl, ...rest } = product;
  return { ...rest, thumbnail: imageUrl };
}

function serveUpstream(products: readonly unknown[]) {
  server.use(
    http.get(`${BASE_URL}/products`, ({ request }) => {
      const limit = Number(
        new URL(request.url).searchParams.get("limit") ?? 30,
      );
      const page = limit === 0 ? products : products.slice(0, limit);
      return HttpResponse.json({
        products: page,
        total: products.length,
        skip: 0,
        limit,
      });
    }),
  );
}

const catalog = () =>
  createDummyJsonProductCatalog({ baseUrl: BASE_URL, retries: 0 });

describeProductCatalogContract("DummyJSON", (products) => {
  serveUpstream(products.map(toDummyJson));
  return catalog();
});

describe("DummyJSON catalog", () => {
  it("returns the whole catalog, not just the first upstream page", async () => {
    const upstream = Array.from({ length: 45 }, (_, i) =>
      toDummyJson(makeProduct({ id: i + 1 })),
    );
    serveUpstream(upstream);

    await expect(catalog().list()).resolves.toHaveLength(45);
  });

  it("rejects upstream data that breaks the product contract", async () => {
    serveUpstream([{ id: -1, title: "", price: "free" }]);

    await expect(catalog().list()).rejects.toBeInstanceOf(InvalidResponseError);
  });
});
