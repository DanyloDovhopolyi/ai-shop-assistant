import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter } from "./rate-limiter";

function clock(start = 0) {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("in-memory rate limiter", () => {
  it("allows up to the limit within the window, then refuses with a wait time", async () => {
    const time = clock();
    const limiter = createInMemoryRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: time.now,
    });

    await expect(limiter.check("ip-1")).resolves.toMatchObject({
      allowed: true,
    });
    time.advance(10_000);
    await expect(limiter.check("ip-1")).resolves.toMatchObject({
      allowed: true,
    });
    // The oldest request leaves the window 50 s from now.
    await expect(limiter.check("ip-1")).resolves.toEqual({
      allowed: false,
      retryAfterMs: 50_000,
    });
  });

  it("frees a slot as the oldest request leaves the sliding window", async () => {
    const time = clock();
    const limiter = createInMemoryRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: time.now,
    });

    await limiter.check("ip-1");
    time.advance(60_001);

    await expect(limiter.check("ip-1")).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("counts every client separately", async () => {
    const limiter = createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 });

    await limiter.check("ip-1");

    await expect(limiter.check("ip-2")).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("does not count refused requests, so hammering does not extend the wait", async () => {
    const time = clock();
    const limiter = createInMemoryRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: time.now,
    });

    await limiter.check("ip-1");
    for (let attempt = 0; attempt < 5; attempt += 1)
      await limiter.check("ip-1");
    time.advance(60_001);

    await expect(limiter.check("ip-1")).resolves.toMatchObject({
      allowed: true,
    });
  });
});
