import type { ProductCatalog } from "@/entities/product";
import { createSearchHandler } from "@/features/semantic-search";
import { withRateLimit } from "@/shared/api";

import { getCatalog } from "../../_lib/catalog";
import { searchRateLimiter } from "../../_lib/rate-limits";
import { getProductSearch } from "../../_lib/search";

const catalog: ProductCatalog = { list: () => getCatalog() };

export const GET = withRateLimit(
  (request) =>
    createSearchHandler({ search: getProductSearch(), catalog })(request),
  { limiter: searchRateLimiter },
);
