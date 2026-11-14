export interface Page<T> {
  readonly items: readonly T[];
  /** 1-based, clamped into [1, pageCount]. */
  readonly page: number;
  readonly pageCount: number;
  readonly total: number;
  /** 0-based index of the first item on this page, for "Showing 25–48 of 194". */
  readonly firstIndex: number;
}

/** Slices one page out of a list. Out-of-range pages snap to the nearest real page. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const firstIndex = (current - 1) * pageSize;

  return {
    items: items.slice(firstIndex, firstIndex + pageSize),
    page: current,
    pageCount,
    total: items.length,
    firstIndex,
  };
}
