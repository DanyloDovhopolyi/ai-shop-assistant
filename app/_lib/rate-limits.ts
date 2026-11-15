import "server-only";

import { createInMemoryRateLimiter } from "@/shared/lib";

// Composition root for rate limits. In-memory is per server instance; swap in
// a shared-store adapter of the RateLimiter port when running many instances.

/** Each chat message costs a paid model call: about one every 5 seconds. */
export const chatRateLimiter = createInMemoryRateLimiter({
  limit: 12,
  windowMs: 60_000,
});

/** Suggestions fire while typing (debounced), so they get more room. */
export const searchRateLimiter = createInMemoryRateLimiter({
  limit: 60,
  windowMs: 60_000,
});
