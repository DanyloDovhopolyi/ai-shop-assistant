import {
  formatCategory,
  type Product,
  type ProductId,
} from "@/entities/product";

/** The text that stands for a product in vector space. */
export function toEmbeddingText(product: Product): string {
  return [
    product.title,
    product.brand,
    formatCategory(product.category),
    product.description,
  ]
    .filter((part) => part !== undefined && part !== "")
    .join("\n");
}

export interface IndexItem {
  readonly id: ProductId;
  readonly content: string;
  readonly hash: string;
}

export interface IndexPlan {
  readonly toEmbed: readonly IndexItem[];
  readonly toRemove: readonly ProductId[];
  readonly unchanged: number;
}

/**
 * What re-indexing must do: embed new or edited products, drop products that
 * left the catalog, and leave the rest alone so a re-run costs no API calls.
 * `hash` is injected to keep this module free of Node APIs.
 */
export function planIndexing(
  products: readonly Product[],
  indexed: ReadonlyMap<ProductId, string>,
  hash: (content: string) => string,
): IndexPlan {
  const items = products.map((product) => {
    const content = toEmbeddingText(product);
    return { id: product.id, content, hash: hash(content) };
  });
  const toEmbed = items.filter((item) => indexed.get(item.id) !== item.hash);
  const inCatalog = new Set(products.map((product) => product.id));

  return {
    toEmbed,
    toRemove: [...indexed.keys()].filter((key) => !inCatalog.has(key)),
    unchanged: items.length - toEmbed.length,
  };
}
