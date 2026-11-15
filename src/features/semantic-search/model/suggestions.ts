import { z } from "zod";

import { ProductSchema } from "@/entities/product";

/** A product suggested while typing; carries its photo so no extra request is needed. */
export const SuggestionSchema = ProductSchema.pick({
  id: true,
  title: true,
  category: true,
  price: true,
  imageUrl: true,
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

/** Shared by the API route and the client query: one contract for both sides. */
export const SuggestionsResponseSchema = z.object({
  query: z.string(),
  products: z.array(SuggestionSchema),
});
export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>;

/** Shorter queries carry too little meaning to search on. */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 200;
export const SUGGESTION_LIMIT = 6;
