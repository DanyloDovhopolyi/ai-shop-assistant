import { MockLanguageModelV4, mockValues } from "ai/test";
import { describe, expect, it } from "vitest";

import { createInMemoryProductCatalog } from "@/entities/product";

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

function chatRequest(text: string, init: RequestInit = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
    }),
    ...init,
  });
}

function modelThatFilters(input: unknown, reply = "Here you go.") {
  const turns = mockValues(
    toolCallTurn("filterProducts", input),
    textTurn(reply),
  );
  return new MockLanguageModelV4({ doStream: () => Promise.resolve(turns()) });
}

describe("chat handler", () => {
  it("turns a request into a filterProducts call and streams its result and reply", async () => {
    const handle = createChatHandler({
      model: modelThatFilters({ category: "laptops", maxPrice: 1500 }),
      catalog,
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

  it("tells the model which categories exist so it picks real ones", async () => {
    const model = modelThatFilters({});
    await readUiChunks(
      await createChatHandler({ model, catalog })(chatRequest("hi")),
    );

    expect(JSON.stringify(model.doStreamCalls[0]?.prompt)).toContain(
      "laptops, smartphones",
    );
  });

  it("stops generating when the client disconnects", async () => {
    const model = modelThatFilters({});
    const client = new AbortController();

    const response = await createChatHandler({ model, catalog })(
      chatRequest("hi", { signal: client.signal }),
    );
    client.abort();
    await response.text().catch(() => undefined);

    expect(model.doStreamCalls[0]?.abortSignal?.aborted).toBe(true);
  });

  it("rejects a malformed request with 400", async () => {
    const handle = createChatHandler({ model: modelThatFilters({}), catalog });

    const response = await handle(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: '{"messages":"nope"}',
      }),
    );

    expect(response.status).toBe(400);
  });
});
