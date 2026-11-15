import { describe, expect, it, vi } from "vitest";

import { ProductIdSchema } from "@/entities/product";

import { withFallback } from "./fallback-search";
import type { ProductSearch } from "./product-search";

const hit = (id: number) => ({ id: ProductIdSchema.parse(id), similarity: 1 });
const answering = (id: number) => {
  const search = vi.fn(() => Promise.resolve([hit(id)]));
  return { adapter: { search } satisfies ProductSearch, search };
};
const failing = (error = new Error("embedding model is down")) => ({
  search: vi.fn(() => Promise.reject(error)),
});

describe("withFallback", () => {
  it("uses the primary search while it works", async () => {
    const fallback = answering(2);

    const hits = await withFallback(
      answering(1).adapter,
      fallback.adapter,
    ).search("phone");

    expect(hits).toEqual([hit(1)]);
    expect(fallback.search).not.toHaveBeenCalled();
  });

  it("answers from the fallback when the primary fails, and reports why", async () => {
    const onFallback = vi.fn();
    const outage = new Error("embedding model is down");

    const hits = await withFallback(
      failing(outage),
      answering(2).adapter,
      onFallback,
    ).search("phone", { limit: 3 });

    expect(hits).toEqual([hit(2)]);
    expect(onFallback).toHaveBeenCalledWith(outage);
  });

  it("does not fall back when the caller cancelled the search", async () => {
    const fallback = answering(2);
    const controller = new AbortController();
    controller.abort();

    await expect(
      withFallback(failing(), fallback.adapter).search("phone", {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(fallback.search).not.toHaveBeenCalled();
  });
});
