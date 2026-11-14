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
    <article
      aria-label={product.title}
      className="flex w-32 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    >
      <ProductPhoto id={product.id} title={product.title} sizes="128px" />
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
