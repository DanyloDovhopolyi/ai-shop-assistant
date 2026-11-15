import "server-only";

import { pickProducts, type Product } from "@/entities/product";
import {
  createDbClient,
  createGeminiEmbeddings,
  createKeywordProductSearch,
  createPgvectorProductSearch,
  type ProductSearch,
  relevantHits,
  withFallback,
} from "@/features/semantic-search";
import { ConfigError, getServerEnv, getSupabaseEnv } from "@/shared/config";

import { getCatalog } from "./catalog";

let search: ProductSearch | undefined;

/**
 * Composition root for product search, shared by the chat tool, `/api/search`,
 * and the catalog page. Semantic search (Gemini embeddings + pgvector) when it
 * is configured and up; keyword search over the cached catalog otherwise.
 */
export function getProductSearch(): ProductSearch {
  search ??= createSearch();
  return search;
}

function createSearch(): ProductSearch {
  const keywords = createKeywordProductSearch({
    catalog: { list: () => getCatalog() },
  });
  try {
    const { SUPABASE_URL, SUPABASE_SECRET_KEY } = getSupabaseEnv();
    const { GOOGLE_GENERATIVE_AI_API_KEY } = getServerEnv();
    const vectors = createPgvectorProductSearch({
      db: createDbClient({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET_KEY }),
      embedQuery: createGeminiEmbeddings({
        apiKey: GOOGLE_GENERATIVE_AI_API_KEY,
      }).embedQuery,
    });
    // The cut-off fits embedding scores only; keyword scores use another scale.
    const semantic: ProductSearch = {
      search: async (query, options) =>
        relevantHits(await vectors.search(query, options), RELEVANCE_MARGIN),
    };
    return withFallback(semantic, keywords, (error) => {
      // The user still gets results; the log says why they are keyword-only.
      console.warn("Semantic search failed, using keyword search:", error);
    });
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    console.warn(`Semantic search is not configured: ${error.message}`);
    return keywords;
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

/** Catalog products matching `query`, most relevant first. */
export async function searchCatalog(
  query: string,
  catalog: readonly Product[],
): Promise<readonly Product[]> {
  const hits = await getProductSearch().search(query, {
    limit: PAGE_CANDIDATES,
  });
  return pickProducts(
    catalog,
    hits.map((hit) => hit.id),
  );
}
