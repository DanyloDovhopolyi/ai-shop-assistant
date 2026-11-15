import "server-only";

import { pickProducts, type Product } from "@/entities/product";
import {
  createDbClient,
  createGeminiEmbeddings,
  createPgvectorProductSearch,
  type ProductSearch,
  relevantHits,
  SearchError,
} from "@/features/semantic-search";
import { ConfigError, getServerEnv, getSupabaseEnv } from "@/shared/config";

let search: ProductSearch | undefined;

/**
 * Composition root for product search: pgvector in Supabase, embedded with
 * Gemini. Without Supabase settings the chat still works; only searching fails.
 * The same instance serves the chat tool, `/api/search`, and the catalog page.
 */
export function getProductSearch(): ProductSearch {
  search ??= createSearch();
  return search;
}

function createSearch(): ProductSearch {
  try {
    const { SUPABASE_URL, SUPABASE_SECRET_KEY } = getSupabaseEnv();
    const { GOOGLE_GENERATIVE_AI_API_KEY } = getServerEnv();
    return createPgvectorProductSearch({
      db: createDbClient({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET_KEY }),
      embedQuery: createGeminiEmbeddings({
        apiKey: GOOGLE_GENERATIVE_AI_API_KEY,
      }).embedQuery,
    });
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    console.error(error.message);
    return {
      search: () =>
        Promise.reject(new SearchError("Product search is not configured.")),
    };
  }
}

/**
 * How far below the best match a result may score and still be shown. Measured
 * on real queries: 0.03 keeps every exact match ("headphones": 3, "laptop": 5)
 * and trims vague ones ("something for running": 24 → 18); 0.02 already drops
 * AirPods from "headphones".
 */
const RELEVANCE_MARGIN = 0.03;
const PAGE_CANDIDATES = 24;

export type CatalogSearchResult =
  | { readonly kind: "found"; readonly products: readonly Product[] }
  | { readonly kind: "unavailable" };

/** Catalog products matching `query` by meaning, most relevant first. */
export async function searchCatalog(
  query: string,
  catalog: readonly Product[],
): Promise<CatalogSearchResult> {
  try {
    const hits = await getProductSearch().search(query, {
      limit: PAGE_CANDIDATES,
    });
    const ids = relevantHits(hits, RELEVANCE_MARGIN).map((hit) => hit.id);
    return { kind: "found", products: pickProducts(catalog, ids) };
  } catch (error) {
    if (!(error instanceof SearchError)) throw error;
    console.error(error.message);
    return { kind: "unavailable" };
  }
}
