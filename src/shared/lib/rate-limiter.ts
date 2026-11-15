export type RateLimitDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterMs: number };

/**
 * Port: may this client make another request now? Async so a shared store
 * (e.g. Redis) can implement it; the in-memory adapter below is per process.
 */
export interface RateLimiter {
  check(key: string): Promise<RateLimitDecision>;
}

/**
 * Sliding-window limiter in process memory: at most `limit` requests per
 * `windowMs` for each key. On serverless every instance counts on its own, so
 * production with many instances needs a shared-store adapter of the same port.
 */
export function createInMemoryRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  maxKeys = 10_000,
}: {
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: () => number;
  /** Bounds memory; the least recently seen client is forgotten first. */
  readonly maxKeys?: number;
}): RateLimiter {
  const requests = new Map<string, number[]>();

  return {
    check(key) {
      const time = now();
      const recent = (requests.get(key) ?? []).filter(
        (at) => at > time - windowMs,
      );
      requests.delete(key);

      const oldest = recent[0];
      if (recent.length >= limit && oldest !== undefined) {
        requests.set(key, recent);
        return Promise.resolve({
          allowed: false,
          retryAfterMs: oldest + windowMs - time,
        });
      }

      requests.set(key, [...recent, time]);
      if (requests.size > maxKeys) {
        const stalest = requests.keys().next().value;
        if (stalest !== undefined) requests.delete(stalest);
      }
      return Promise.resolve({ allowed: true });
    },
  };
}
