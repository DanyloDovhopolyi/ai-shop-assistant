import { assertNever } from "@/shared/lib";

import type { Product } from "./product";
import type { ProductFilters, SortOrder } from "./product-filters";

type Comparator = (a: Product, b: Product) => number;

/** Pure: narrows the catalog to products matching every filter, then sorts it. */
export function applyFilters(
  products: readonly Product[],
  filters: ProductFilters,
): readonly Product[] {
  const matching = products.filter((product) => matches(product, filters));
  const compare = comparatorFor(filters.sort);
  // toSorted is stable, so ties keep catalog order.
  return compare ? matching.toSorted(compare) : matching;
}

function matches(
  product: Product,
  { category, minPrice, maxPrice, minRating }: ProductFilters,
) {
  return (
    (category === undefined || product.category === category) &&
    (minPrice === undefined || product.price >= minPrice) &&
    (maxPrice === undefined || product.price <= maxPrice) &&
    (minRating === undefined || product.rating >= minRating)
  );
}

function comparatorFor(sort: SortOrder): Comparator | undefined {
  switch (sort) {
    case "featured":
      return undefined;
    case "price-asc":
      return (a, b) => a.price - b.price;
    case "price-desc":
      return (a, b) => b.price - a.price;
    case "rating-desc":
      return (a, b) => b.rating - a.rating;
    default:
      return assertNever(sort);
  }
}
