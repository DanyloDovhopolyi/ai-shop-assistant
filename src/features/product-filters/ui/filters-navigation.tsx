"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useState,
  useTransition,
} from "react";

import { DEFAULT_FILTERS, type ProductFilters } from "@/entities/product";

import { FiltersPanel, type FiltersPanelProps } from "./filters-panel";
import { assistantFilterKeys } from "../model/assistant-filters";
import { catalogHref } from "../model/search-params";

interface FiltersNavigation {
  readonly isPending: boolean;
  /** Filters the user picked by hand; they refine the current search, if any. */
  readonly navigate: (filters: ProductFilters) => void;
  /** Filters the assistant picked; the panel marks them as the assistant's. */
  readonly applyFromAssistant: (filters: ProductFilters) => void;
  /** A new search over the whole catalog: filters start from scratch. */
  readonly searchFor: (query: string) => void;
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

  const go = (filters: ProductFilters, query: string) => {
    const href = catalogHref(filters, 1, query);
    startTransition(() => {
      // push, not replace: Back returns to the previous filters.
      router.push(href === "?" ? pathname : `${pathname}${href}`, {
        scroll: false,
      });
    });
  };

  // Read in event handlers only, so rendering never depends on the URL here
  // and the provider needs no Suspense boundary.
  const currentQuery = () =>
    new URLSearchParams(window.location.search).get("q") ?? "";

  const navigate = (filters: ProductFilters) => {
    go(filters, currentQuery());
  };

  const applyFromAssistant = (filters: ProductFilters) => {
    setAssistantFilters(filters);
    // The assistant's filters describe the whole answer; an old search would hide it.
    go(filters, "");
  };

  const searchFor = (query: string) => {
    setAssistantFilters(null);
    go(DEFAULT_FILTERS, query);
  };

  return (
    <FiltersNavigationContext
      value={{
        isPending,
        navigate,
        applyFromAssistant,
        searchFor,
        assistantFilters,
      }}
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
