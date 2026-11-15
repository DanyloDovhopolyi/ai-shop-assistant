import type { Product, ProductCatalog } from "@/entities/product";

import type { ProductSearch } from "../model/product-search";

const DEFAULT_LIMIT = 10;

/** Words that carry no meaning about the product on their own. */
const FILLER = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "my",
  "of",
  "on",
  "or",
  "some",
  "something",
  "the",
  "to",
  "with",
]);

/** A match in the title says more than one in the description. */
const FIELD_WEIGHTS = [
  { weight: 3, text: (product: Product) => product.title },
  {
    weight: 2,
    text: (product: Product) => `${product.brand ?? ""} ${product.category}`,
  },
  { weight: 1, text: (product: Product) => product.description },
] as const;
const MAX_WEIGHT = 3;

/**
 * ProductSearch by keywords, with no AI involved: the fallback when the
 * embedding model or the vector database is unavailable. Weaker than semantic
 * search ("headphones" will not find "earphones"), but it always answers.
 */
export function createKeywordProductSearch({
  catalog,
}: {
  readonly catalog: ProductCatalog;
}): ProductSearch {
  return {
    async search(query, { limit = DEFAULT_LIMIT, signal } = {}) {
      const terms = tokenize(query);
      if (terms.length === 0) return [];

      const products = await catalog.list({ signal });
      return products
        .map((product) => ({
          id: product.id,
          similarity: score(product, terms) / (MAX_WEIGHT * terms.length),
        }))
        .filter((hit) => hit.similarity > 0)
        .toSorted((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    },
  };
}

function score(product: Product, terms: readonly string[]): number {
  const fields = FIELD_WEIGHTS.map(({ weight, text }) => ({
    weight,
    words: tokenize(text(product)),
  }));
  return terms.reduce((total, term) => {
    const best = fields
      .filter(({ words }) => words.some((word) => sameWord(word, term)))
      .reduce((max, { weight }) => Math.max(max, weight), 0);
    return total + best;
  }, 0);
}

/**
 * Prefix matching stands in for stemming: "runn" finds "running", and
 * "headphones" finds "headphone". Short words must match exactly.
 */
function sameWord(word: string, term: string): boolean {
  return (
    word === term ||
    (term.length >= 3 && word.startsWith(term)) ||
    (word.length >= 4 && term.startsWith(word))
  );
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (word) => word.length >= 2 && !FILLER.has(word),
  );
}
