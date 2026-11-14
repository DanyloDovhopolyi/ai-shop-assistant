import { describe, expect, it } from "vitest";

import { computeBackoff } from "./backoff";

const half = () => 0.5;
const max = () => 0.999_999;

describe("computeBackoff", () => {
  it("grows exponentially per attempt", () => {
    const options = { baseMs: 100, maxMs: 10_000, random: max };

    expect(computeBackoff(0, options)).toBeCloseTo(100, 0);
    expect(computeBackoff(1, options)).toBeCloseTo(200, 0);
    expect(computeBackoff(2, options)).toBeCloseTo(400, 0);
  });

  it("never exceeds the cap", () => {
    expect(
      computeBackoff(20, { baseMs: 100, maxMs: 1_000, random: max }),
    ).toBeLessThanOrEqual(1_000);
  });

  it("applies full jitter: a random share of the exponential window", () => {
    expect(
      computeBackoff(1, { baseMs: 100, maxMs: 10_000, random: half }),
    ).toBe(100);
    expect(
      computeBackoff(1, { baseMs: 100, maxMs: 10_000, random: () => 0 }),
    ).toBe(0);
  });
});
