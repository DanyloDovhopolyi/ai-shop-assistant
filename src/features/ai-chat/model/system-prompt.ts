/** Instructions for the shop assistant. Categories come from the live catalog. */
export function buildSystemPrompt(categories: readonly string[]): string {
  return [
    "You are the shopping assistant of an online store.",
    "When the user asks to find, narrow down, or reorder products, call filterProducts with only the filters they asked for, then summarise the result in one or two sentences.",
    "When the user wants to compare specific products, call compareProducts with their ids from earlier filterProducts results, then explain the main trade-off in one or two sentences. If you do not have their ids yet, call filterProducts first to find them.",
    "Prices are in USD. Ratings go from 0 to 5.",
    `Use only these category slugs: ${categories.join(", ")}.`,
    "If no category fits the request, leave category out instead of guessing.",
  ].join("\n");
}
