"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useState,
  useTransition,
} from "react";

import type { ProductFilters } from "@/entities/product";

import { FiltersPanel, type FiltersPanelProps } from "./filters-panel";
import { assistantFilterKeys } from "../model/assistant-filters";
import { filtersToSearchParams } from "../model/search-params";

interface FiltersNavigation {
  readonly isPending: boolean;
  /** Filters the user picked by hand. */
  readonly navigate: (filters: ProductFilters) => void;
  /** Filters the assistant picked; the panel marks them as the assistant's. */
  readonly applyFromAssistant: (filters: ProductFilters) => void;
  readonly assistantFilters: ProductFilters | null;
}

const FiltersNavigationContext = createContext<FiltersNavigation | null>(null);

/**
 * Writes filters to the URL inside a transition. The server re-renders the
 * results while `isPending` lets the old results stay visible but dimmed,
 * instead of falling back to a skeleton on every change.
 */
export function FiltersNavigationProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // Session-only: the URL stays the source of truth for the filters themselves.
  const [assistantFilters, setAssistantFilters] =
    useState<ProductFilters | null>(null);

  const navigate = (filters: ProductFilters) => {
    const query = filtersToSearchParams(filters).toString();
    startTransition(() => {
      // push, not replace: Back returns to the previous filters.
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const applyFromAssistant = (filters: ProductFilters) => {
    setAssistantFilters(filters);
    navigate(filters);
  };

  return (
    <FiltersNavigationContext
      value={{ isPending, navigate, applyFromAssistant, assistantFilters }}
    >
      {children}
    </FiltersNavigationContext>
  );
}

/** Filter navigation for controls outside this slice, e.g. the AI chat. */
export function useFiltersNavigation(): FiltersNavigation {
  const navigation = use(FiltersNavigationContext);
  if (!navigation)
    throw new Error("Wrap filter controls in <FiltersNavigationProvider>.");
  return navigation;
}

export function UrlFiltersPanel(
  props: Omit<FiltersPanelProps, "onChange" | "assistantKeys">,
) {
  const { navigate, assistantFilters } = useFiltersNavigation();
  return (
    <FiltersPanel
      {...props}
      assistantKeys={assistantFilterKeys(props.filters, assistantFilters)}
      onChange={navigate}
    />
  );
}

export function FiltersPendingRegion({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { isPending } = useFiltersNavigation();
  return (
    <div
      aria-busy={isPending}
      className={`transition-opacity ${isPending ? "pointer-events-none opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}
