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

export function ProductCard({ product }: { readonly product: Product }) {
  const titleId = `product-${String(product.id)}-title`;
  return (
    <article aria-labelledby={titleId} className="h-full">
      <Card className="h-full gap-3 pt-0 transition-shadow hover:ring-foreground/25">
        <div className="relative aspect-square border-b">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 50vw"
            className="object-contain p-5"
          />
        </div>
        <CardContent className="flex flex-col gap-1">
          <CardTitle id={titleId} className="line-clamp-2 text-[15px]">
            {product.title}
          </CardTitle>
          <CardDescription className="text-xs">
            {product.brand ?? formatCategory(product.category)}
          </CardDescription>
        </CardContent>
        <CardFooter className="mt-auto items-baseline justify-between">
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
