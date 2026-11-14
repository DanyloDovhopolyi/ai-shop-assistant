"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

import { productQueries } from "@/entities/product";

import type { ProductPreview } from "../model/filter-result";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * A product in a chat answer. Title, price, and rating come with the tool
 * result and show at once; the photo is fetched by id, outside the model's
 * context, so it costs no tokens.
 */
export function ProductPreviewCard({
  product,
}: {
  readonly product: ProductPreview;
}) {
  const details = useQuery(productQueries.detail(product.id));

  return (
    <article
      aria-label={product.title}
      className="flex w-32 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    >
      <div className="relative flex aspect-square items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
        {details.isSuccess ? (
          <Image
            src={details.data.imageUrl}
            alt={product.title}
            fill
            sizes="128px"
            className="object-contain p-2"
          />
        ) : details.isError ? (
          <span className="text-[10px]">No photo</span>
        ) : (
          <span aria-hidden className="size-full animate-pulse" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium">{product.title}</p>
        <div className="mt-auto flex items-center justify-between text-[11px]">
          <span className="font-semibold">{usd.format(product.price)}</span>
          <span className="text-zinc-500">★ {product.rating.toFixed(1)}</span>
        </div>
      </div>
    </article>
  );
}
