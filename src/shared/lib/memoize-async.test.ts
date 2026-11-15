import { describe, expect, it, vi } from "vitest";

import { memoizeAsync } from "./memoize-async";

describe("memoizeAsync", () => {
  it("computes a value once and serves it from memory after that", async () => {
    const load = vi.fn((key: string) => Promise.resolve(key.length));
    const cached = memoizeAsync(load, { maxEntries: 10 });

    await cached("warm gift");
    await expect(cached("warm gift")).resolves.toBe(9);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one call between callers asking for the same key at once", async () => {
    const load = vi.fn((key: string) => Promise.resolve(key));
    const cached = memoizeAsync(load, { maxEntries: 10 });

    await Promise.all([cached("scarf"), cached("scarf"), cached("scarf")]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not remember failures, so the next call tries again", async () => {
    const load = vi
      .fn<(key: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce("ok");
    const cached = memoizeAsync(load, { maxEntries: 10 });

    await expect(cached("scarf")).rejects.toThrow("quota");
    await expect(cached("scarf")).resolves.toBe("ok");
  });

  it("forgets the least recently used key when full", async () => {
    const load = vi.fn((key: string) => Promise.resolve(key));
    const cached = memoizeAsync(load, { maxEntries: 2 });

    await cached("a");
    await cached("b");
    await cached("a"); // "a" is now the most recently used
    await cached("c"); // evicts "b"
    await cached("a");
    await cached("b");

    expect(load.mock.calls.map(([key]) => key)).toEqual(["a", "b", "c", "b"]);
  });
});
