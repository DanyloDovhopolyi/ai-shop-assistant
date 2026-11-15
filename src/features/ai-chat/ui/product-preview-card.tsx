import { Card } from "@/shared/ui/card";

import { ProductPhoto } from "./product-photo";
import { usd } from "./usd";
import type { ProductPreview } from "../model/filter-result";

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
  return (
    <article aria-label={product.title} className="h-full">
      <Card size="sm" className="h-full w-32 shrink-0 gap-0 py-0">
        <ProductPhoto id={product.id} title={product.title} sizes="128px" />
        <div className="flex flex-1 flex-col gap-0.5 border-t p-2">
          <p className="line-clamp-2 text-xs font-medium">{product.title}</p>
          <div className="mt-auto flex items-center justify-between text-[11px]">
            <span className="font-semibold tabular-nums">
              {usd.format(product.price)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              ★ {product.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </Card>
    </article>
  );
}
