import { z } from "zod";

import {
  type Product,
  type ProductId,
  ProductIdSchema,
} from "@/entities/product";

export const CompareProductsInputSchema = z.object({
  productIds: z
    .array(ProductIdSchema)
    .min(2)
    .max(4)
    .describe(
      "Ids of 2 to 4 products to compare, taken from earlier filterProducts results",
    ),
});

export type ComparedProduct = Pick<
  Product,
  "id" | "title" | "category" | "brand" | "price" | "rating"
>;

/**
 * What compareProducts returns. The model reads it to explain the trade-offs;
 * the chat renders it as a table, highlighting the best value per row.
 */
export interface Comparison {
  readonly products: readonly ComparedProduct[];
  readonly notFound: readonly ProductId[];
  readonly cheapest: readonly ProductId[];
  readonly bestRated: readonly ProductId[];
}

export function toComparison(
  catalog: readonly Product[],
  ids: readonly ProductId[],
): Comparison {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  const unique = [...new Set(ids)];
  const products = unique
    .map((id) => byId.get(id))
    .filter((product) => product !== undefined)
    .map(({ id, title, category, brand, price, rating }) => ({
      id,
      title,
      category,
      price,
      rating,
      ...(brand === undefined ? {} : { brand }),
    }));

  return {
    products,
    notFound: unique.filter((id) => !byId.has(id)),
    // A single product has nothing to beat, so nothing is highlighted.
    cheapest: products.length < 2 ? [] : idsWithBest(products, (p) => -p.price),
    bestRated:
      products.length < 2 ? [] : idsWithBest(products, (p) => p.rating),
  };
}

/** Ids of every product that ties for the highest score. */
function idsWithBest(
  products: readonly ComparedProduct[],
  score: (product: ComparedProduct) => number,
): ProductId[] {
  const best = Math.max(...products.map(score));
  return products.filter((p) => score(p) === best).map((p) => p.id);
}
