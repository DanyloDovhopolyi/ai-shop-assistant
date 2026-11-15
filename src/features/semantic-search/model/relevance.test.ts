import { describe, expect, it } from "vitest";

import { ProductIdSchema } from "@/entities/product";

import { relevantHits } from "./relevance";

const hit = (id: number, similarity: number) => ({
  id: ProductIdSchema.parse(id),
  similarity,
});

describe("relevantHits", () => {
  it("keeps matches close to the best one and drops the long tail", () => {
    // Real scores for "headphones": AirPods Max, Beats, AirPods, then a speaker.
    const hits = [hit(1, 0.676), hit(2, 0.661), hit(3, 0.65), hit(4, 0.61)];

    expect(relevantHits(hits, 0.05).map((h) => h.id)).toEqual([1, 2, 3]);
  });

  it("keeps everything when all matches score alike", () => {
    const hits = [hit(1, 0.663), hit(2, 0.662), hit(3, 0.66)];

    expect(relevantHits(hits, 0.05)).toHaveLength(3);
  });

  it("returns nothing for no matches", () => {
    expect(relevantHits([], 0.05)).toEqual([]);
  });
});
