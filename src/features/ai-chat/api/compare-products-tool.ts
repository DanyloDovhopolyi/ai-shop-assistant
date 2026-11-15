import { tool } from "ai";

import type { ProductCatalog } from "@/entities/product";

import { CompareProductsInputSchema, toComparison } from "../model/comparison";

export function createCompareProductsTool({
  catalog,
}: {
  readonly catalog: ProductCatalog;
}) {
  return tool({
    description:
      "Compare 2 to 4 specific products side by side. The chat shows a comparison table.",
    inputSchema: CompareProductsInputSchema,
    execute: async ({ productIds }, { abortSignal }) =>
      toComparison(await catalog.list({ signal: abortSignal }), productIds),
  });
}
