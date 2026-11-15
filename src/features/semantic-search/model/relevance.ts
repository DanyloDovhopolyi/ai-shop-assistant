import type { SearchHit } from "./product-search";

/**
 * Hits within `margin` of the best one. Embedding similarities sit in a narrow
 * band (about 0.60 to 0.68 here) and shift with the query, so a fixed cut-off
 * would drop good matches for one query and keep noise for another. Measuring
 * against the best hit adapts to each query.
 */
export function relevantHits(
  hits: readonly SearchHit[],
  margin: number,
): readonly SearchHit[] {
  const best = Math.max(...hits.map((hit) => hit.similarity));
  return hits.filter((hit) => hit.similarity >= best - margin);
}
