import type { ProductCatalog } from "@/entities/product";
import { createSearchHandler } from "@/features/semantic-search";

import { getCatalog } from "../../_lib/catalog";
import { getProductSearch } from "../../_lib/search";

const catalog: ProductCatalog = { list: () => getCatalog() };

export function GET(request: Request): Promise<Response> {
  return createSearchHandler({ search: getProductSearch(), catalog })(request);
}
