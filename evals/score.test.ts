import { describe, expect, it } from "vitest";

import { gate, score } from "./score";

const called = (tool: string, input: unknown, reply = "") => ({
  toolCalls: [{ tool, input }],
  reply,
});

describe("eval scoring", () => {
  it("passes when the model calls the expected tool with the expected fields", () => {
    expect(
      score(
        {
          tool: "filterProducts",
          input: { category: "laptops", maxPrice: 1500 },
        },
        called("filterProducts", {
          category: "laptops",
          maxPrice: 1500,
          sort: "featured",
        }),
      ),
    ).toEqual({ pass: true });
  });

  it("fails on a wrong field and says which one", () => {
    expect(
      score(
        { tool: "filterProducts", input: { maxPrice: 1500 } },
        called("filterProducts", { maxPrice: 1000 }),
      ),
    ).toEqual({ pass: false, why: "maxPrice = 1000, expected 1500" });
  });

  it("checks a search by the words in its query", () => {
    const expectation = {
      tool: "searchProducts",
      queryHasOneOf: ["headphone", "earphone"],
    } as const;

    expect(
      score(
        expectation,
        called("searchProducts", { query: "Wireless Headphones" }),
      ),
    ).toEqual({ pass: true });
    expect(
      score(expectation, called("searchProducts", { query: "speakers" })).pass,
    ).toBe(false);
  });

  it("fails an off-topic request that triggers a tool or leaks instructions", () => {
    expect(
      score({ tool: "none" }, called("searchProducts", { query: "france" }))
        .pass,
    ).toBe(false);
    expect(
      score(
        { tool: "none", replyLacks: ["category slugs"] },
        { toolCalls: [], reply: "Use only these category slugs: ..." },
      ),
    ).toEqual({ pass: false, why: 'reply contains "category slugs"' });
  });
});

describe("eval gate", () => {
  const passed = { pass: true } as const;
  const failed = { pass: false, why: "x" } as const;
  const result = (
    critical: boolean,
    verdict: typeof passed | typeof failed,
  ) => ({
    name: critical ? "prompt leak" : "routing",
    critical,
    verdict,
  });

  it("fails the run on a single critical failure, even at a high pass rate", () => {
    const results = [
      ...Array.from({ length: 13 }, () => result(false, passed)),
      result(true, failed),
    ];

    expect(gate(results, 0.9)).toEqual({
      pass: false,
      reasons: ["critical case failed: prompt leak"],
    });
  });

  it("tolerates an occasional routing miss above the pass rate", () => {
    const results = [
      ...Array.from({ length: 13 }, () => result(false, passed)),
      result(false, failed),
    ];

    expect(gate(results, 0.9).pass).toBe(true);
  });
});
