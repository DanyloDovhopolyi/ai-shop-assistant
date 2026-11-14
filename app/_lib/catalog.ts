import "server-only";

import { cacheLife } from "next/cache";

import {
  createDummyJsonProductCatalog,
  type Product,
} from "@/entities/product";

// Composition root for the catalog: the only place that picks the adapter.
const catalog = createDummyJsonProductCatalog();

/** The whole catalog, cached across requests. A failed fetch throws and is never cached. */
export async function getCatalog(): Promise<readonly Product[]> {
  "use cache";
  cacheLife("hours");
  return catalog.list();
}
