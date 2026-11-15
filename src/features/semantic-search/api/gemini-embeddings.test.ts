import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";

import { server } from "@test/msw/server";

import {
  createGeminiEmbeddings,
  EMBEDDING_DIMENSIONS,
} from "./gemini-embeddings";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001";

/**
 * The vector size must match the vector(768) column, and queries and products
 * must use their own task types; a mistake in either only shows up as bad search.
 */
describe("Gemini embeddings", () => {
  it("embeds a query as a retrieval query at the column's dimensions", async () => {
    let body: unknown;
    server.use(
      http.post(`${MODEL_URL}:embedContent`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ embedding: { values: [0.1, 0.2] } });
      }),
    );

    const vector = await createGeminiEmbeddings({ apiKey: "key" }).embedQuery(
      "winter gift",
    );

    expect(vector).toEqual([0.1, 0.2]);
    expect(body).toMatchObject({
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    });
  });

  it("embeds products as retrieval documents at the column's dimensions", async () => {
    let body: { requests?: unknown[] } = {};
    server.use(
      http.post(`${MODEL_URL}:batchEmbedContents`, async ({ request }) => {
        body = (await request.json()) as { requests: unknown[] };
        return HttpResponse.json({
          embeddings: [{ values: [1] }, { values: [2] }],
        });
      }),
    );

    const vectors = await createGeminiEmbeddings({
      apiKey: "key",
    }).embedDocuments(["scarf", "kettle"]);

    expect(vectors).toEqual([[1], [2]]);
    expect(body.requests).toEqual([
      expect.objectContaining({
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      expect.objectContaining({ taskType: "RETRIEVAL_DOCUMENT" }),
    ]);
  });
});
