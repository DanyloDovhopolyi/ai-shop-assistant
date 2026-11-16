import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/shared/ui/card";

import { formatCategory, type Product } from "../model/product";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export interface ProductCardProps {
  readonly product: Product;
  readonly imageLoading?: "eager" | "lazy";
  readonly highPriority?: boolean;
}

export function ProductCard({
  product,
  imageLoading = "lazy",
  highPriority = false,
}: ProductCardProps) {
  const titleId = `product-${String(product.id)}-title`;
  return (
    <article aria-labelledby={titleId} className="h-full">
      <Card className="h-full gap-3 bg-transparent py-0 ring-0">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            loading={imageLoading}
            {...(highPriority && { fetchPriority: "high" })}
            sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 50vw"
            className="object-contain p-6 mix-blend-multiply dark:mix-blend-normal"
          />
        </div>
        <CardContent className="flex flex-1 flex-col gap-0.5 px-0">
          <CardTitle id={titleId} className="line-clamp-2 text-[15px]">
            {product.title}
          </CardTitle>
          <CardDescription className="text-xs">
            {product.brand ?? formatCategory(product.category)}
          </CardDescription>
        </CardContent>
        <CardFooter className="items-baseline justify-between border-t-0 bg-transparent px-0 pt-0 pb-1">
          <span className="text-base font-semibold tabular-nums">
            {usd.format(product.price)}
          </span>
          <span
            className="text-sm text-muted-foreground tabular-nums"
            aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}
          >
            ★ {product.rating.toFixed(1)}
          </span>
        </CardFooter>
      </Card>
    </article>
  );
}
