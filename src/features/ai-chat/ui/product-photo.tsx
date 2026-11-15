"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

import { type ProductId, productQueries } from "@/entities/product";
import { Skeleton } from "@/shared/ui/skeleton";

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
    <div className="relative flex aspect-square items-center justify-center bg-card text-muted-foreground">
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
        <Skeleton aria-hidden className="size-full rounded-none" />
      )}
    </div>
  );
}
