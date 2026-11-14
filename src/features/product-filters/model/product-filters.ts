import { z } from "zod";

export const SORT_ORDERS = [
  "featured",
  "price-asc",
  "price-desc",
  "rating-desc",
] as const;

export const SortOrderSchema = z
  .enum(SORT_ORDERS)
  .describe(
    "featured keeps the catalog order; price-asc is cheapest first; price-desc is most expensive first; rating-desc is best rated first",
  );
export type SortOrder = z.infer<typeof SortOrderSchema>;

const PriceSchema = z.number().nonnegative();

/**
 * The single filter contract: manual controls, the URL, and the AI
 * `filterProducts` tool all speak this shape. Descriptions are written for the
 * model that fills the tool input.
 */
export const ProductFiltersSchema = z
  .object({
    category: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Exact category slug from the catalog, e.g. "laptops" or "mobile-accessories"',
      ),
    minPrice: PriceSchema.optional().describe("Lowest price in USD, inclusive"),
    maxPrice: PriceSchema.optional().describe(
      "Highest price in USD, inclusive",
    ),
    minRating: z
      .number()
      .min(0)
      .max(5)
      .optional()
      .describe("Lowest average rating, 0 to 5"),
    sort: SortOrderSchema.default("featured"),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: "minPrice must not exceed maxPrice", path: ["minPrice"] },
  );

export type ProductFilters = z.infer<typeof ProductFiltersSchema>;

export const DEFAULT_FILTERS: ProductFilters = ProductFiltersSchema.parse({});
