import type { SubmitEvent } from "react";

import {
  DEFAULT_FILTERS,
  formatCategory,
  type ProductFilters,
  SORT_LABELS,
  SORT_ORDERS,
} from "@/entities/product";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";

import type { FilterKey } from "../model/assistant-filters";

const RATING_OPTIONS = [3, 4, 4.5] as const;
const NO_KEYS: ReadonlySet<FilterKey> = new Set();

type PriceKey = "minPrice" | "maxPrice";

export interface FiltersPanelProps {
  readonly filters: ProductFilters;
  readonly categories: readonly string[];
  readonly onChange: (next: ProductFilters) => void;
  /** Filters that still hold the value the assistant chose. */
  readonly assistantKeys?: ReadonlySet<FilterKey>;
}

/**
 * Presentational filter controls. Selects apply immediately; price fields apply
 * on Enter or blur so typing "150" does not trigger three searches.
 */
export function FiltersPanel({
  filters,
  categories,
  onChange,
  assistantKeys = NO_KEYS,
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

  const byAssistant = (key: FilterKey) => assistantKeys.has(key);
  const describedBy = (key: FilterKey) =>
    byAssistant(key) ? ASSISTANT_LEGEND_ID : undefined;

  return (
    <form
      // Remount when filters change from outside (URL, assistant) so uncontrolled
      // price inputs show the new values.
      key={JSON.stringify(filters)}
      aria-label="Product filters"
      onSubmit={submitPrices}
      className="flex flex-wrap items-end gap-x-3 gap-y-3"
    >
      <Field
        label="Category"
        htmlFor="filter-category"
        byAssistant={byAssistant("category")}
      >
        <NativeSelect
          id="filter-category"
          aria-describedby={describedBy("category")}
          value={filters.category ?? ""}
          onChange={(event) => {
            change("category", event.target.value || undefined);
          }}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {categories.map((category) => (
            <NativeSelectOption key={category} value={category}>
              {formatCategory(category)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {(["minPrice", "maxPrice"] as const).map((key) => (
        <Field
          key={key}
          label={key === "minPrice" ? "Min price" : "Max price"}
          htmlFor={`filter-${key}`}
          byAssistant={byAssistant(key)}
        >
          <Input
            id={`filter-${key}`}
            name={key}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="$"
            aria-describedby={describedBy(key)}
            defaultValue={filters[key] ?? ""}
            onBlur={(event) => {
              commitPrice(key, event.target.value);
            }}
            className="w-24 tabular-nums"
          />
        </Field>
      ))}

      <Field
        label="Minimum rating"
        htmlFor="filter-rating"
        byAssistant={byAssistant("minRating")}
      >
        <NativeSelect
          id="filter-rating"
          aria-describedby={describedBy("minRating")}
          value={filters.minRating ?? ""}
          onChange={(event) => {
            change(
              "minRating",
              event.target.value ? Number(event.target.value) : undefined,
            );
          }}
        >
          <NativeSelectOption value="">Any rating</NativeSelectOption>
          {RATING_OPTIONS.map((rating) => (
            <NativeSelectOption key={rating} value={rating}>
              {rating}+ stars
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Sort by"
        htmlFor="filter-sort"
        byAssistant={byAssistant("sort")}
      >
        <NativeSelect
          id="filter-sort"
          aria-describedby={describedBy("sort")}
          value={filters.sort}
          onChange={(event) => {
            change(
              "sort",
              SORT_ORDERS.find((order) => order === event.target.value),
            );
          }}
        >
          {SORT_ORDERS.map((order) => (
            <NativeSelectOption key={order} value={order}>
              {SORT_LABELS[order]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {/* Lets Enter in a price field submit the form. */}
      <button type="submit" hidden />
      <div className="ml-auto flex items-center gap-3">
        {assistantKeys.size > 0 && (
          <p
            id={ASSISTANT_LEGEND_ID}
            className="flex items-center gap-1.5 text-xs text-assistant"
          >
            <span aria-hidden className="size-2 rounded-full bg-assistant" />
            Set by the assistant
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onChange(DEFAULT_FILTERS);
          }}
        >
          Reset filters
        </Button>
      </div>
    </form>
  );
}

const ASSISTANT_LEGEND_ID = "filters-assistant-legend";

/**
 * A labelled control. Filters the assistant set wear its colour, so the user
 * can see at a glance what the assistant changed and what they chose.
 */
function Field({
  label,
  htmlFor,
  byAssistant,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly byAssistant: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      data-by-assistant={byAssistant || undefined}
      className="group flex flex-col gap-1"
    >
      <label
        htmlFor={htmlFor}
        className="text-xs text-muted-foreground group-data-by-assistant:text-assistant"
      >
        {label}
      </label>
      <div className="rounded-lg bg-card group-data-by-assistant:[&_input]:border-assistant group-data-by-assistant:[&_input]:bg-assistant-soft group-data-by-assistant:[&_select]:border-assistant group-data-by-assistant:[&_select]:bg-assistant-soft">
        {children}
      </div>
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
