import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ProductIdSchema } from "@/entities/product";
import type { Database } from "@/shared/api";
import { AppError } from "@/shared/lib";

import type { ProductSearch } from "../model/product-search";

/** Turns a search query into a vector. Injected, so the embedding provider can change. */
export type EmbedQuery = (
  query: string,
  signal?: AbortSignal,
) => Promise<readonly number[]>;

export class SearchError extends AppError {
  readonly kind = "search";
}

const DEFAULT_LIMIT = 10;

const MatchRowsSchema = z.array(
  z.object({ product_id: ProductIdSchema, similarity: z.number() }),
);

/** ProductSearch over pgvector: the `match_products` function ranks by cosine similarity. */
export function createPgvectorProductSearch({
  db,
  embedQuery,
}: {
  readonly db: SupabaseClient<Database>;
  readonly embedQuery: EmbedQuery;
}): ProductSearch {
  return {
    async search(query, { limit = DEFAULT_LIMIT, signal } = {}) {
      const text = query.trim();
      if (text === "") return [];

      const embedding = await embedQuery(text, signal);
      const request = db.rpc("match_products", {
        query_embedding: toVectorLiteral(embedding),
        match_count: limit,
      });
      const { data, error } = await (signal
        ? request.abortSignal(signal)
        : request);
      if (error) {
        throw new SearchError(`Vector search failed: ${error.message}`, {
          cause: error,
        });
      }

      const rows = MatchRowsSchema.safeParse(data);
      if (!rows.success) {
        throw new SearchError("Vector search returned unexpected rows", {
          cause: rows.error,
        });
      }
      return rows.data.map((row) => ({
        id: row.product_id,
        similarity: row.similarity,
      }));
    },
  };
}

/** pgvector's text input format, e.g. "[0.1,0.2]"; the generated types expect a string. */
export function toVectorLiteral(vector: readonly number[]): string {
  return `[${vector.join(",")}]`;
}
