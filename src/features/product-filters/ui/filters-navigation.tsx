"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useTransition } from "react";

import type { ProductFilters } from "@/entities/product";

import { FiltersPanel, type FiltersPanelProps } from "./filters-panel";
import { filtersToSearchParams } from "../model/search-params";

interface FiltersNavigation {
  readonly isPending: boolean;
  readonly navigate: (filters: ProductFilters) => void;
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

  const navigate = (filters: ProductFilters) => {
    const query = filtersToSearchParams(filters).toString();
    startTransition(() => {
      // push, not replace: Back returns to the previous filters.
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <FiltersNavigationContext value={{ isPending, navigate }}>
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

export function UrlFiltersPanel(props: Omit<FiltersPanelProps, "onChange">) {
  const { navigate } = useFiltersNavigation();
  return <FiltersPanel {...props} onChange={navigate} />;
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
