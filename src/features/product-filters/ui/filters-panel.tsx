import type { SubmitEvent } from "react";

import {
  DEFAULT_FILTERS,
  formatCategory,
  type ProductFilters,
  SORT_LABELS,
  SORT_ORDERS,
} from "@/entities/product";
import { cn } from "@/shared/lib";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/shared/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

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

  const categoryItems: Record<string, string> = {
    [ANY]: "All categories",
    ...Object.fromEntries(
      categories.map((category) => [category, formatCategory(category)]),
    ),
  };
  const ratingItems: Record<string, string> = {
    [ANY]: "Any rating",
    ...Object.fromEntries(
      RATING_OPTIONS.map((rating) => [
        String(rating),
        `${String(rating)}+ stars`,
      ]),
    ),
  };

  return (
    <form
      // Remount when filters change from outside (URL, assistant) so uncontrolled
      // price inputs show the new values.
      key={JSON.stringify(filters)}
      aria-label="Product filters"
      onSubmit={submitPrices}
      className="flex flex-wrap items-end gap-3"
    >
      <Field
        label="Category"
        htmlFor="filter-category"
        byAssistant={byAssistant("category")}
      >
        <FilterSelect
          id="filter-category"
          items={categoryItems}
          value={filters.category ?? ANY}
          highlighted={byAssistant("category")}
          describedBy={describedBy("category")}
          className="w-44"
          onValueChange={(value) => {
            change("category", value === ANY ? undefined : value);
          }}
        />
      </Field>

      {(["minPrice", "maxPrice"] as const).map((key) => (
        <Field
          key={key}
          label={key === "minPrice" ? "Min price" : "Max price"}
          htmlFor={`filter-${key}`}
          byAssistant={byAssistant(key)}
        >
          <InputGroup
            className={cn(
              "w-28 bg-card",
              byAssistant(key) && "border-foreground/50",
            )}
          >
            <InputGroupAddon>
              <InputGroupText>$</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id={`filter-${key}`}
              name={key}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={key === "minPrice" ? "0" : "Any"}
              aria-describedby={describedBy(key)}
              defaultValue={filters[key] ?? ""}
              onBlur={(event) => {
                commitPrice(key, event.target.value);
              }}
              className="tabular-nums"
            />
          </InputGroup>
        </Field>
      ))}

      <Field
        label="Minimum rating"
        htmlFor="filter-rating"
        byAssistant={byAssistant("minRating")}
      >
        <FilterSelect
          id="filter-rating"
          items={ratingItems}
          value={
            filters.minRating === undefined ? ANY : String(filters.minRating)
          }
          highlighted={byAssistant("minRating")}
          describedBy={describedBy("minRating")}
          className="w-36"
          onValueChange={(value) => {
            change("minRating", value === ANY ? undefined : Number(value));
          }}
        />
      </Field>

      <Field
        label="Sort by"
        htmlFor="filter-sort"
        byAssistant={byAssistant("sort")}
      >
        <FilterSelect
          id="filter-sort"
          items={SORT_LABELS}
          value={filters.sort}
          highlighted={byAssistant("sort")}
          describedBy={describedBy("sort")}
          className="w-44"
          onValueChange={(value) => {
            change(
              "sort",
              SORT_ORDERS.find((order) => order === value),
            );
          }}
        />
      </Field>

      {/* Lets Enter in a price field submit the form. */}
      <button type="submit" hidden />
      <div className="ml-auto flex items-center gap-3">
        {assistantKeys.size > 0 && (
          // Read as the description of every field the assistant set.
          <span id={ASSISTANT_LEGEND_ID} className="sr-only">
            Set by the assistant
          </span>
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
/** Select value for "no filter"; Base UI treats an empty string as a real value. */
const ANY = "any";

function FilterSelect({
  id,
  items,
  value,
  highlighted,
  describedBy,
  className,
  onValueChange,
}: {
  readonly id: string;
  readonly items: Readonly<Record<string, string>>;
  readonly value: string;
  readonly highlighted: boolean;
  readonly describedBy: string | undefined;
  readonly className: string;
  readonly onValueChange: (value: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        aria-describedby={describedBy}
        className={cn(
          "bg-card",
          className,
          highlighted && "border-foreground/50",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([itemValue, label]) => (
          <SelectItem key={itemValue} value={itemValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * A labelled control. Filters the assistant set get an "AI" mark and a darker
 * border, so the user sees what the assistant changed and what they chose.
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
          {label}
        </label>
        {byAssistant && (
          <Badge
            variant="secondary"
            aria-hidden
            title="Set by the assistant"
            className="h-4 px-1.5 text-[10px]"
          >
            AI
          </Badge>
        )}
      </div>
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
