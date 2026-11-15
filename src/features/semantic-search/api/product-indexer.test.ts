import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";

import { makeProduct } from "@test/fixtures/product";
import { server } from "@test/msw/server";

import { createDbClient } from "./db-client";
import { indexProducts } from "./product-indexer";
import { toEmbeddingText } from "../model/index-plan";

const URL_BASE = "https://project.supabase.test";
const TABLE_URL = `${URL_BASE}/rest/v1/product_embeddings`;
const hash = (text: string) => `hash-of-${text.slice(0, 20)}`;

const products = [1, 2, 3].map((id) =>
  makeProduct({ id, title: `Product ${String(id)}` }),
);

/** A PostgREST table that already holds `indexed` rows and records every write. */
function serveTable(indexed: { product_id: number; content_hash: string }[]) {
  const upserted: { product_id: number; embedding: string }[] = [];
  const deleted: string[] = [];
  server.use(
    http.get(TABLE_URL, () => HttpResponse.json(indexed)),
    http.post(TABLE_URL, async ({ request }) => {
      upserted.push(
        ...((await request.json()) as {
          product_id: number;
          embedding: string;
        }[]),
      );
      return new HttpResponse(null, { status: 201 });
    }),
    http.delete(TABLE_URL, ({ request }) => {
      deleted.push(new URL(request.url).searchParams.get("product_id") ?? "");
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { upserted, deleted };
}

function run(options: { batchSize?: number } = {}) {
  const embedDocuments = vi.fn((texts: readonly string[]) =>
    Promise.resolve(texts.map((_, index) => [index, 0.5])),
  );
  const beforeNextBatch = vi.fn(() => Promise.resolve());
  const report = indexProducts({
    products,
    db: createDbClient({ url: URL_BASE, secretKey: "test-key" }),
    embedDocuments,
    hash,
    beforeNextBatch,
    ...options,
  });
  return { report, embedDocuments, beforeNextBatch };
}

describe("indexProducts", () => {
  it("embeds only products that are new or changed, batch by batch", async () => {
    const table = serveTable([
      // Product 1 is indexed with its current text; product 2 with an old one.
      { product_id: 1, content_hash: hash(toEmbeddingText(products[0]!)) },
      { product_id: 2, content_hash: "stale" },
    ]);

    const { report, embedDocuments, beforeNextBatch } = run({ batchSize: 1 });

    await expect(report).resolves.toEqual({
      embedded: 2,
      unchanged: 1,
      removed: 0,
    });
    expect(embedDocuments.mock.calls).toEqual([
      [[toEmbeddingText(products[1]!)]],
      [[toEmbeddingText(products[2]!)]],
    ]);
    // Waits between batches (rate limits), not before the first one.
    expect(beforeNextBatch).toHaveBeenCalledExactlyOnceWith({
      done: 1,
      total: 2,
    });
    expect(table.upserted).toEqual([
      expect.objectContaining({ product_id: 2, embedding: "[0,0.5]" }),
      expect.objectContaining({ product_id: 3, embedding: "[0,0.5]" }),
    ]);
  });

  it("removes products that left the catalog", async () => {
    const table = serveTable([
      ...products.map((product) => ({
        product_id: product.id,
        content_hash: hash(toEmbeddingText(product)),
      })),
      { product_id: 99, content_hash: "gone" },
    ]);

    const { report, embedDocuments } = run();

    await expect(report).resolves.toEqual({
      embedded: 0,
      unchanged: 3,
      removed: 1,
    });
    expect(embedDocuments).not.toHaveBeenCalled();
    expect(table.deleted).toEqual(["in.(99)"]);
  });
});
