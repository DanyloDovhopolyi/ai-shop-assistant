import { DEFAULT_FILTERS, type ProductFilters } from "@/entities/product";

export type FilterKey = keyof ProductFilters;

/**
 * Filters on screen that still hold the value the assistant chose. Editing a
 * filter by hand takes it back, so the mark always tells the truth.
 */
export function assistantFilterKeys(
  current: ProductFilters,
  assistant: ProductFilters | null,
): ReadonlySet<FilterKey> {
  if (assistant === null) return new Set();
  const keys = Object.keys(assistant) as FilterKey[];
  return new Set(
    keys.filter(
      (key) =>
        assistant[key] !== undefined &&
        assistant[key] !== DEFAULT_FILTERS[key] &&
        current[key] === assistant[key],
    ),
  );
}
