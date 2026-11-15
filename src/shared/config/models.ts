/**
 * The chat model, shared by the API route and the evals so they always test
 * what production runs. Fast, GA, and accurate on tool calls in a live
 * comparison; larger flash models took 11-24 s per tool call or timed out.
 */
export const CHAT_MODEL_ID = "gemini-3.1-flash-lite";
