/** Longer than any real shopping request; long inputs are a cost and injection risk. */
export const MAX_MESSAGE_LENGTH = 1000;
/** Earlier turns rarely matter for shopping; dropping them bounds tokens per call. */
export const MAX_HISTORY = 20;

interface MessageLike {
  readonly role: string;
  readonly parts: readonly { readonly type: string; readonly text?: string }[];
}

export type LimitResult<M> =
  | { readonly ok: true; readonly messages: readonly M[] }
  | { readonly ok: false; readonly reason: "too-long" };

/**
 * Applies input limits before anything reaches the model: the newest user
 * message must be a reasonable length, and only recent history is sent.
 */
export function limitChat<M extends MessageLike>(
  messages: readonly M[],
): LimitResult<M> {
  const latest = messages.findLast((message) => message.role === "user");
  const length = (latest?.parts ?? []).reduce(
    (total, part) =>
      total + (part.type === "text" ? (part.text?.length ?? 0) : 0),
    0,
  );
  if (length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "too-long" };
  return { ok: true, messages: messages.slice(-MAX_HISTORY) };
}
