import "server-only";

import type { ProductMatcher } from "@/features/ai-chat";
import {
  createDbClient,
  createGeminiEmbeddings,
  createPgvectorProductSearch,
  SearchError,
} from "@/features/semantic-search";
import { ConfigError, getServerEnv, getSupabaseEnv } from "@/shared/config";

let search: ProductMatcher | undefined;

/**
 * Composition root for product search: pgvector in Supabase, embedded with
 * Gemini. Without Supabase settings the chat still works; only searching fails.
 */
export function getProductSearch(): ProductMatcher {
  search ??= createSearch();
  return search;
}

function createSearch(): ProductMatcher {
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
