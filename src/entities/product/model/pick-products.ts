import type { Product, ProductId } from "./product";

/**
 * Catalog products for a ranked list of ids (e.g. search hits), in that order.
 * Ids the catalog no longer has are skipped, and each product appears once.
 */
export function pickProducts(
  catalog: readonly Product[],
  ids: readonly ProductId[],
): readonly Product[] {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  return [...new Set(ids)]
    .map((id) => byId.get(id))
    .filter((product) => product !== undefined);
}
