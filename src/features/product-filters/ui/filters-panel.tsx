import type { SubmitEvent } from "react";

import {
  DEFAULT_FILTERS,
  type ProductFilters,
  SORT_LABELS,
  SORT_ORDERS,
} from "@/entities/product";

const RATING_OPTIONS = [3, 4, 4.5] as const;

type PriceKey = "minPrice" | "maxPrice";

export interface FiltersPanelProps {
  readonly filters: ProductFilters;
  readonly categories: readonly string[];
  readonly onChange: (next: ProductFilters) => void;
}

/**
 * Presentational filter controls. Selects apply immediately; price fields apply
 * on Enter or blur so typing "150" does not trigger three searches.
 */
export function FiltersPanel({
  filters,
  categories,
  onChange,
}: FiltersPanelProps) {
  const change = <K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K] | undefined,
  ) => {
    const next = withFilter(filters, key, value);
    if (!sameFilters(next, filters)) onChange(next);
  };

  const commitPrice = (key: PriceKey, raw: string) => {
    change(key, parsePrice(raw));
  };

  const submitPrices = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = withFilter(
      withFilter(filters, "minPrice", parsePrice(form.get("minPrice"))),
      "maxPrice",
      parsePrice(form.get("maxPrice")),
    );
    if (!sameFilters(next, filters)) onChange(next);
  };

  return (
    <form
      // Re-mount when filters change from outside (URL, AI chat) so fields show them.
      key={JSON.stringify(filters)}
      aria-label="Product filters"
      onSubmit={submitPrices}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <Field label="Category" htmlFor="filter-category">
        <select
          id="filter-category"
          className={controlClassName}
          value={filters.category ?? ""}
          onChange={(event) => {
            change("category", event.target.value || undefined);
          }}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {formatCategory(category)}
            </option>
          ))}
        </select>
      </Field>

      {(["minPrice", "maxPrice"] as const).map((key) => (
        <Field
          key={key}
          label={key === "minPrice" ? "Min price" : "Max price"}
          htmlFor={`filter-${key}`}
        >
          <input
            id={`filter-${key}`}
            name={key}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="$"
            defaultValue={filters[key] ?? ""}
            onBlur={(event) => {
              commitPrice(key, event.target.value);
            }}
            className={`${controlClassName} w-24`}
          />
        </Field>
      ))}

      <Field label="Minimum rating" htmlFor="filter-rating">
        <select
          id="filter-rating"
          className={controlClassName}
          value={filters.minRating ?? ""}
          onChange={(event) => {
            change(
              "minRating",
              event.target.value ? Number(event.target.value) : undefined,
            );
          }}
        >
          <option value="">Any rating</option>
          {RATING_OPTIONS.map((rating) => (
            <option key={rating} value={rating}>
              {rating}+ stars
            </option>
          ))}
        </select>
      </Field>

      <Field label="Sort by" htmlFor="filter-sort">
        <select
          id="filter-sort"
          className={controlClassName}
          value={filters.sort}
          onChange={(event) => {
            change(
              "sort",
              SORT_ORDERS.find((order) => order === event.target.value),
            );
          }}
        >
          {SORT_ORDERS.map((order) => (
            <option key={order} value={order}>
              {SORT_LABELS[order]}
            </option>
          ))}
        </select>
      </Field>

      {/* Lets Enter in a price field submit the form. */}
      <button type="submit" hidden />
      <button
        type="button"
        onClick={() => {
          onChange(DEFAULT_FILTERS);
        }}
        className="ml-auto rounded-md px-3 py-2 text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Reset filters
      </button>
    </form>
  );
}

const controlClassName =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900";

function Field({
  label,
  htmlFor,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Sets a filter, or removes the key entirely when the value is cleared. */
function withFilter<K extends keyof ProductFilters>(
  filters: ProductFilters,
  key: K,
  value: ProductFilters[K] | undefined,
): ProductFilters {
  const { [key]: _removed, ...rest } = filters;
  const next = value === undefined ? rest : { ...rest, [key]: value };
  return { ...DEFAULT_FILTERS, ...next };
}

function sameFilters(a: ProductFilters, b: ProductFilters): boolean {
  return (
    JSON.stringify(Object.entries(a).sort()) ===
    JSON.stringify(Object.entries(b).sort())
  );
}

function parsePrice(raw: FormDataEntryValue | null): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function formatCategory(slug: string): string {
  const words = slug.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
