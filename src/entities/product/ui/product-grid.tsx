import { ProductCard } from "./product-card";
import type { Product } from "../model/product";

const gridClassName = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

export function ProductGrid({
  products,
}: {
  readonly products: readonly Product[];
}) {
  return (
    <ul aria-label="Products" className={gridClassName}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
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
        <li
          key={index}
          className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </ul>
  );
}
