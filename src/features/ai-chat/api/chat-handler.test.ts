import { APICallError } from "ai";
import { MockLanguageModelV4, mockValues } from "ai/test";
import { describe, expect, it, vi } from "vitest";

import {
  createInMemoryProductCatalog,
  ProductIdSchema,
} from "@/entities/product";

import { textTurn, toolCallTurn } from "@test/ai/mock-stream";
import { readUiChunks } from "@test/ai/read-ui-chunks";
import { makeProduct } from "@test/fixtures/product";

import { createChatHandler } from "./chat-handler";

const catalog = createInMemoryProductCatalog([
  makeProduct({
    id: 1,
    title: "Budget Laptop",
    category: "laptops",
    price: 900,
  }),
  makeProduct({ id: 2, title: "Pro Laptop", category: "laptops", price: 2400 }),
  makeProduct({ id: 3, title: "Phone", category: "smartphones", price: 700 }),
]);

const noSearch = { search: () => Promise.resolve([]) };

function chatRequest(text: string, init: RequestInit = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
    }),
    ...init,
  });
}

function modelThatCalls(
  toolName: string,
  input: unknown,
  reply = "Here you go.",
) {
  const turns = mockValues(toolCallTurn(toolName, input), textTurn(reply));
  return new MockLanguageModelV4({ doStream: () => Promise.resolve(turns()) });
}

function modelThatFilters(input: unknown, reply = "Here you go.") {
  return modelThatCalls("filterProducts", input, reply);
}

describe("chat handler", () => {
  it("turns a request into a filterProducts call and streams its result and reply", async () => {
    const handle = createChatHandler({
      model: modelThatFilters({ category: "laptops", maxPrice: 1500 }),
      catalog,
      search: noSearch,
    });

    const chunks = await readUiChunks(
      await handle(chatRequest("laptops under $1500")),
    );

    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-output-available",
        output: expect.objectContaining({
          filters: { category: "laptops", maxPrice: 1500, sort: "featured" },
          total: 1,
        }) as unknown,
      }),
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: "text-delta", delta: "Here you go." }),
    );
  });

  it("refuses tool input that breaks the filter contract instead of running it", async () => {
    const handle = createChatHandler({
      model: modelThatFilters({ minPrice: 500, maxPrice: 100 }),
      catalog,
      search: noSearch,
    });

    const chunks = await readUiChunks(
      await handle(chatRequest("between 500 and 100")),
    );

    expect(chunks).toContainEqual(
      expect.objectContaining({ type: "tool-input-error" }),
    );
    expect(chunks).not.toContainEqual(
      expect.objectContaining({ type: "tool-output-available" }),
    );
  });

  it("compares the products the model picked and streams the comparison", async () => {
    const handle = createChatHandler({
      model: modelThatCalls("compareProducts", { productIds: [3, 1] }),
      catalog,
      search: noSearch,
    });

    const chunks = await readUiChunks(
      await handle(chatRequest("compare the phone and the budget laptop")),
    );

    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-output-available",
        output: expect.objectContaining({
          products: [
            expect.objectContaining({ title: "Phone" }),
            expect.objectContaining({ title: "Budget Laptop" }),
          ],
          cheapest: [3],
        }) as unknown,
      }),
    );
  });

  it("searches by meaning and streams the matching products", async () => {
    const search = {
      search: vi.fn(() =>
        Promise.resolve([
          { id: ProductIdSchema.parse(3) },
          { id: ProductIdSchema.parse(1) },
        ]),
      ),
    };
    const handle = createChatHandler({
      model: modelThatCalls("searchProducts", {
        query: "something to call mom",
      }),
      catalog,
      search,
    });

    const chunks = await readUiChunks(await handle(chatRequest("phone?")));

    expect(search.search).toHaveBeenCalledWith(
      "something to call mom",
      expect.objectContaining({ limit: expect.any(Number) as unknown }),
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-output-available",
        output: {
          query: "something to call mom",
          products: [
            expect.objectContaining({ title: "Phone" }),
            expect.objectContaining({ title: "Budget Laptop" }),
          ],
        },
      }),
    );
  });

  it("tells the model which categories exist so it picks real ones", async () => {
    const model = modelThatFilters({});
    await readUiChunks(
      await createChatHandler({ model, catalog, search: noSearch })(
        chatRequest("hi"),
      ),
    );

    expect(JSON.stringify(model.doStreamCalls[0]?.prompt)).toContain(
      "laptops, smartphones",
    );
  });

  it("stops generating when the client disconnects", async () => {
    const model = modelThatFilters({});
    const client = new AbortController();

    const response = await createChatHandler({
      model,
      catalog,
      search: noSearch,
    })(chatRequest("hi", { signal: client.signal }));
    client.abort();
    await response.text().catch(() => undefined);

    expect(model.doStreamCalls[0]?.abortSignal?.aborted).toBe(true);
  });

  it("reports a provider rate limit as a code the client can show", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const model = new MockLanguageModelV4({
      doStream: () =>
        Promise.reject(
          new APICallError({
            message: "Quota exceeded for key AIza-secret",
            url: "https://provider.example",
            requestBodyValues: {},
            statusCode: 429,
            isRetryable: false,
          }),
        ),
    });

    const chunks = await readUiChunks(
      await createChatHandler({ model, catalog, search: noSearch })(
        chatRequest("hi"),
      ),
    );

    expect(chunks).toContainEqual({ type: "error", errorText: "rate-limited" });
    expect(JSON.stringify(chunks)).not.toContain("AIza");
  });

  it("rejects a malformed request with 400", async () => {
    const handle = createChatHandler({
      model: modelThatFilters({}),
      catalog,
      search: noSearch,
    });

    const response = await handle(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: '{"messages":"nope"}',
      }),
    );

    expect(response.status).toBe(400);
  });
});
