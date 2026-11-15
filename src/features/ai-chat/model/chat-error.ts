/**
 * Stable error codes sent to the client in place of raw provider errors, so the
 * UI can react to rate limiting without seeing keys, URLs, or stack traces.
 */
export const CHAT_ERROR_CODES = [
  "rate-limited",
  "timeout",
  "unavailable",
] as const;
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

const MESSAGES: Record<ChatErrorCode, string> = {
  "rate-limited": "The assistant is busy right now. Wait a moment and retry.",
  timeout: "The assistant took too long to answer. Try again.",
  unavailable: "The assistant is unavailable. Try again.",
};

/** Server side: map any model failure to a code that is safe to send. */
export function toChatErrorCode(error: unknown): ChatErrorCode {
  return statusOf(error) === 429 ? "rate-limited" : "unavailable";
}

/**
 * Client side: a 429 arrives either as an HTTP status (our endpoint refused the
 * request) or as a code inside the stream (the provider refused mid-response).
 */
export function describeChatError(error: Error): string {
  if (statusOf(error) === 429) return MESSAGES["rate-limited"];
  const code = CHAT_ERROR_CODES.find((known) => known === error.message);
  return MESSAGES[code ?? "unavailable"];
}

/**
 * Reads `statusCode` structurally so model/ stays SDK-free. The SDK wraps
 * retried failures and keeps the last attempt in `lastError`.
 */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  return "lastError" in error ? statusOf(error.lastError) : undefined;
}
