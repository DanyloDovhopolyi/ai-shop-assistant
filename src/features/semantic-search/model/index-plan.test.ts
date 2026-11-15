import { describe, expect, it } from "vitest";

import { type ProductId, ProductIdSchema } from "@/entities/product";

import { makeProduct } from "@test/fixtures/product";

import { planIndexing, toEmbeddingText } from "./index-plan";

const hash = (text: string) => `h:${String(text.length)}:${text.slice(0, 12)}`;
const id = (value: number): ProductId => ProductIdSchema.parse(value);

const scarf = makeProduct({
  id: 1,
  title: "Wool Scarf",
  description: "Warm knitted scarf.",
  category: "womens-accessories",
  brand: "Nordic",
});
const kettle = makeProduct({ id: 2, title: "Kettle", brand: undefined });

describe("toEmbeddingText", () => {
  it("describes a product by its title, brand, readable category, and description", () => {
    expect(toEmbeddingText(scarf)).toBe(
      "Wool Scarf\nNordic\nWomens accessories\nWarm knitted scarf.",
    );
  });

  it("leaves out a missing brand", () => {
    expect(toEmbeddingText(kettle)).not.toContain("undefined");
  });
});

describe("planIndexing", () => {
  it("embeds products the index has never seen", () => {
    const plan = planIndexing([scarf, kettle], new Map(), hash);

    expect(plan.toEmbed.map((item) => item.id)).toEqual([id(1), id(2)]);
    expect(plan.unchanged).toBe(0);
  });

  it("skips products whose text has not changed", () => {
    const indexed = new Map([[id(1), hash(toEmbeddingText(scarf))]]);

    const plan = planIndexing([scarf, kettle], indexed, hash);

    expect(plan.toEmbed.map((item) => item.id)).toEqual([id(2)]);
    expect(plan.unchanged).toBe(1);
  });

  it("re-embeds a product whose text changed", () => {
    const indexed = new Map([[id(1), "an old hash"]]);

    const plan = planIndexing([scarf], indexed, hash);

    expect(plan.toEmbed).toEqual([
      {
        id: id(1),
        content: toEmbeddingText(scarf),
        hash: hash(toEmbeddingText(scarf)),
      },
    ]);
  });

  it("removes products that left the catalog", () => {
    const indexed = new Map([
      [id(1), hash(toEmbeddingText(scarf))],
      [id(99), "gone"],
    ]);

    expect(planIndexing([scarf], indexed, hash).toRemove).toEqual([id(99)]);
  });
});
