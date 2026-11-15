import { describe, expect, it } from "vitest";

import { ChatMetadataSchema, describeRun } from "./run-details";

describe("describeRun", () => {
  it("lists every tool the model called, with its input and outcome", () => {
    const run = describeRun({
      metadata: { model: "gemini-test", durationMs: 1234 },
      parts: [
        { type: "step-start" },
        {
          type: "tool-filterProducts",
          state: "output-available",
          input: { category: "laptops" },
        },
        { type: "step-start" },
        {
          type: "tool-compareProducts",
          state: "output-error",
          input: { productIds: [1] },
        },
        { type: "text" },
      ],
    });

    expect(run.tools).toEqual([
      { name: "filterProducts", input: { category: "laptops" }, ok: true },
      { name: "compareProducts", input: { productIds: [1] }, ok: false },
    ]);
    expect(run.steps).toBe(2);
    expect(run.model).toBe("gemini-test");
  });

  it("adds up tokens only when the provider reported both sides", () => {
    expect(
      describeRun({
        metadata: { inputTokens: 800, outputTokens: 45 },
        parts: [],
      }).tokens,
    ).toEqual({ input: 800, output: 45, total: 845 });
    expect(
      describeRun({ metadata: { inputTokens: 800 }, parts: [] }).tokens,
    ).toBeUndefined();
  });

  it("describes a run that has not finished yet", () => {
    const run = describeRun({ metadata: undefined, parts: [{ type: "text" }] });

    expect(run).toEqual({ tools: [], steps: 0 });
  });
});

describe("ChatMetadataSchema", () => {
  it("rejects negative durations from a broken server clock", () => {
    expect(ChatMetadataSchema.safeParse({ durationMs: -5 }).success).toBe(
      false,
    );
  });
});
