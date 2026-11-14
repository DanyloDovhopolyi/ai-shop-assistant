"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

import { type ProductId, productQueries } from "@/entities/product";

/**
 * A product photo loaded by id. Every photo of one product shares a single
 * cached request, wherever in the chat it appears.
 */
export function ProductPhoto({
  id,
  title,
  sizes,
}: {
  readonly id: ProductId;
  readonly title: string;
  readonly sizes: string;
}) {
  const details = useQuery(productQueries.detail(id));

  return (
    <div className="relative flex aspect-square items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
      {details.isSuccess ? (
        <Image
          src={details.data.imageUrl}
          alt={title}
          fill
          sizes={sizes}
          className="object-contain p-2"
        />
      ) : details.isError ? (
        <span className="text-[10px]">No photo</span>
      ) : (
        <span aria-hidden className="size-full animate-pulse" />
      )}
    </div>
  );
}
