import { z } from "zod";

import {
  DEFAULT_FILTERS,
  type ProductFilters,
  ProductFiltersSchema,
  SortOrderSchema,
} from "./product-filters";

/** Shape of Next.js `searchParams`: a key may be missing, single, or repeated. */
export type SearchParamsRecord = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

const optionalNumber = (schema: z.ZodNumber) =>
  z.coerce.number().pipe(schema).optional().catch(undefined);

/** Lenient URL reader: a broken value is dropped on its own, never the whole set. */
const UrlFiltersSchema = z.object({
  category: z.string().min(1).optional().catch(undefined),
  minPrice: optionalNumber(z.number().nonnegative()),
  maxPrice: optionalNumber(z.number().nonnegative()),
  minRating: optionalNumber(z.number().min(0).max(5)),
  sort: SortOrderSchema.catch(DEFAULT_FILTERS.sort),
});

export function filtersFromSearchParams(
  params: SearchParamsRecord,
): ProductFilters {
  const raw = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, firstNonEmpty(value)]),
  );
  const { minPrice, maxPrice, ...rest } = UrlFiltersSchema.parse(raw);
  // A reversed range is a typo, not a request for nothing: honour the intent.
  const [low, high] =
    minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice
      ? [maxPrice, minPrice]
      : [minPrice, maxPrice];

  return ProductFiltersSchema.parse(
    withoutUndefined({ ...rest, minPrice: low, maxPrice: high }),
  );
}

export function filtersToSearchParams(
  filters: ProductFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  const { category, minPrice, maxPrice, minRating, sort } = filters;
  if (category !== undefined) params.set("category", category);
  if (minPrice !== undefined) params.set("minPrice", String(minPrice));
  if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
  if (minRating !== undefined) params.set("minRating", String(minRating));
  if (sort !== DEFAULT_FILTERS.sort) params.set("sort", sort);
  return params;
}

function firstNonEmpty(
  value: string | readonly string[] | undefined,
): string | undefined {
  const first = typeof value === "string" ? value : value?.[0];
  return first === "" ? undefined : first;
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export const CATALOG_PAGE_SIZE = 24;

const PageSchema = z.coerce.number().int().min(1).catch(1);

/** 1-based page from the URL; anything invalid means the first page. */
export function pageFromSearchParams(params: SearchParamsRecord): number {
  return PageSchema.parse(firstNonEmpty(params.page) ?? 1);
}

/**
 * Query string for a page of filtered results. Page 1 is left out so the
 * canonical URL of a filter set has no page parameter.
 */
export function catalogHref(filters: ProductFilters, page: number): string {
  const params = filtersToSearchParams(filters);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "?";
}
