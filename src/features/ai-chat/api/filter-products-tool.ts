import { tool } from "ai";

import { type ProductCatalog, ProductFiltersSchema } from "@/entities/product";

import { toFilterResult } from "../model/filter-result";

/**
 * The model fills the same ProductFiltersSchema the UI and URL use, so its
 * input is validated by the domain contract before anything runs.
 */
export function createFilterProductsTool({
  catalog,
}: {
  readonly catalog: ProductCatalog;
}) {
  return tool({
    description:
      "Filter and sort the product catalog the user is looking at. The catalog on screen updates to match.",
    inputSchema: ProductFiltersSchema,
    execute: async (filters, { abortSignal }) =>
      toFilterResult(await catalog.list({ signal: abortSignal }), filters),
  });
}
