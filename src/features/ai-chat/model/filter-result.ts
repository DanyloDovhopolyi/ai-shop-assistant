import {
  applyFilters,
  type Product,
  type ProductFilters,
} from "@/entities/product";

const PREVIEW_SIZE = 5;

export type ProductPreview = Pick<
  Product,
  "id" | "title" | "category" | "price" | "rating"
>;

/**
 * What the filterProducts tool returns. `filters` drives the catalog on the
 * client; `total` and `preview` give the model enough to describe the result
 * without the full catalog in its context.
 */
export interface FilterResult {
  readonly filters: ProductFilters;
  readonly total: number;
  readonly preview: readonly ProductPreview[];
}

export function toFilterResult(
  products: readonly Product[],
  filters: ProductFilters,
): FilterResult {
  const matching = applyFilters(products, filters);
  return {
    filters,
    total: matching.length,
    preview: matching
      .slice(0, PREVIEW_SIZE)
      .map(({ id, title, category, price, rating }) => ({
        id,
        title,
        category,
        price,
        rating,
      })),
  };
}
