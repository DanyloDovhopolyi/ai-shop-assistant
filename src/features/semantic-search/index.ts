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
export { createSearchHandler } from "./api/search-handler";
export { searchQueries } from "./api/search-queries";
export type {
  ProductSearch,
  SearchHit,
  SearchOptions,
} from "./model/product-search";
export { relevantHits } from "./model/relevance";
export {
  type Suggestion,
  type SuggestionsResponse,
  SuggestionsResponseSchema,
} from "./model/suggestions";
export { SearchBox, type SearchBoxProps } from "./ui/search-box";
