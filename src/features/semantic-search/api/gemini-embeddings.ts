import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

import type { EmbedQuery } from "./pgvector-product-search";
import type { EmbedDocuments } from "./product-indexer";

/** Must match the vector(768) column in supabase/migrations. */
export const EMBEDDING_DIMENSIONS = 768;
const MODEL_ID = "gemini-embedding-001";

/**
 * Gemini embeddings for both sides of the search. Queries and products use
 * different task types: the model is trained to place a short question near
 * the longer documents that answer it.
 */
export function createGeminiEmbeddings({
  apiKey,
}: {
  readonly apiKey: string;
}) {
  const model = createGoogleGenerativeAI({ apiKey }).embedding(MODEL_ID);
  const options = (taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT") => ({
    google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
  });

  const embedQuery: EmbedQuery = async (query, signal) => {
    const { embedding } = await embed({
      model,
      value: query,
      providerOptions: options("RETRIEVAL_QUERY"),
      ...(signal ? { abortSignal: signal } : {}),
    });
    return embedding;
  };

  const embedDocuments: EmbedDocuments = async (texts) => {
    const { embeddings } = await embedMany({
      model,
      values: [...texts],
      providerOptions: options("RETRIEVAL_DOCUMENT"),
    });
    return embeddings;
  };

  return { embedQuery, embedDocuments };
}
