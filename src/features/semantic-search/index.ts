export { createDbClient } from "./api/db-client";
export {
  createGeminiEmbeddings,
  EMBEDDING_DIMENSIONS,
} from "./api/gemini-embeddings";
export {
  createPgvectorProductSearch,
  type EmbedQuery,
  SearchError,
} from "./api/pgvector-product-search";
export {
  type EmbedDocuments,
  type IndexReport,
  indexProducts,
} from "./api/product-indexer";
export type {
  ProductSearch,
  SearchHit,
  SearchOptions,
} from "./model/product-search";
