import Image from "next/image";

import type { Product } from "../model/product";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductCard({ product }: { readonly product: Product }) {
  return (
    <article
      aria-labelledby={`product-${String(product.id)}-title`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-4"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs tracking-wide text-zinc-500 uppercase">
          {product.category}
        </p>
        <h2
          id={`product-${String(product.id)}-title`}
          className="line-clamp-2 text-sm font-medium"
        >
          {product.title}
        </h2>
        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <span className="font-semibold">{usd.format(product.price)}</span>
          <span
            className="text-zinc-500"
            aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}
          >
            ★ {product.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </article>
  );
}
