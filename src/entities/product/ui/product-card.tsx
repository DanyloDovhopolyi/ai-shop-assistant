import Image from "next/image";

import { formatCategory, type Product } from "../model/product";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductCard({ product }: { readonly product: Product }) {
  const titleId = `product-${String(product.id)}-title`;
  return (
    <article
      aria-labelledby={titleId}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/30"
    >
      <div className="relative aspect-square">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-5"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t px-3.5 pt-3 pb-3.5">
        <h3
          id={titleId}
          className="line-clamp-2 text-[15px] leading-snug font-medium"
        >
          {product.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {product.brand ?? formatCategory(product.category)}
        </p>
        <div className="mt-auto flex items-baseline justify-between pt-3">
          <span className="text-base font-semibold tabular-nums">
            {usd.format(product.price)}
          </span>
          <span
            className="text-sm text-muted-foreground tabular-nums"
            aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}
          >
            ★ {product.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </article>
  );
}
