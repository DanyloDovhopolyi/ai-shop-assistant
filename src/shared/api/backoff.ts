export interface BackoffOptions {
  readonly baseMs: number;
  readonly maxMs: number;
  /** Injected for deterministic tests; defaults to Math.random. */
  readonly random?: () => number;
}

/**
 * Exponential backoff with full jitter: a random delay in
 * [0, min(maxMs, baseMs * 2^attempt)). Jitter spreads retries from many
 * clients so they do not hit a recovering server at the same moment.
 */
export function computeBackoff(
  attempt: number,
  { baseMs, maxMs, random = Math.random }: BackoffOptions,
): number {
  const window = Math.min(maxMs, baseMs * 2 ** attempt);
  return random() * window;
}
