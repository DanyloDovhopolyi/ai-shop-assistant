import type { RateLimiter } from "@/shared/lib";

type Handler = (request: Request) => Promise<Response>;

/**
 * Wraps a route handler with a per-client rate limit. Refused requests get
 * 429 and `Retry-After`, and never reach the handler (or the paid model behind it).
 */
export function withRateLimit(
  handler: Handler,
  { limiter }: { readonly limiter: RateLimiter },
): Handler {
  return async (request) => {
    const decision = await limiter.check(clientKey(request));
    if (!decision.allowed) {
      return Response.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(decision.retryAfterMs / 1000)),
          },
        },
      );
    }
    return handler(request);
  };
}

/**
 * The client's address as the hosting proxy reports it: the first entry of
 * `x-forwarded-for` (later entries are proxies). Without one, all such
 * requests share a key, which errs on the side of limiting.
 */
export function clientKey(request: Request): string {
  const candidates = [
    request.headers.get("x-forwarded-for")?.split(",")[0],
    request.headers.get("x-real-ip"),
  ];
  return (
    candidates
      .map((value) => value?.trim())
      .find((value) => value !== undefined && value !== "") ?? "unknown"
  );
}
