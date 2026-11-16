import { Skeleton } from "@/shared/ui/skeleton";

import { ProductCard } from "./product-card";
import type { Product } from "../model/product";

/**
 * The first row is the Largest Contentful Paint (up to four columns), so it
 * must not wait for lazy loading. Only the first two get a high fetch priority:
 * boosting more images makes them compete with each other.
 */
const EAGER_IMAGES = 4;
const HIGH_PRIORITY_IMAGES = 2;

const gridClassName =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4";

export function ProductGrid({
  products,
}: {
  readonly products: readonly Product[];
}) {
  return (
    <ul aria-label="Products" className={gridClassName}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            imageLoading={index < EAGER_IMAGES ? "eager" : "lazy"}
            highPriority={index < HIGH_PRIORITY_IMAGES}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({
  count = 8,
}: {
  readonly count?: number;
}) {
  return (
    <ul
      aria-label="Loading products"
      aria-busy="true"
      className={gridClassName}
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton className="aspect-[3/4] rounded-xl" />
        </li>
      ))}
    </ul>
  );
}
