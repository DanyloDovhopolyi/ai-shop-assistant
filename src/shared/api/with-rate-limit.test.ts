import { describe, expect, it, vi } from "vitest";

import { createInMemoryRateLimiter } from "@/shared/lib";

import { clientKey, withRateLimit } from "./with-rate-limit";

const request = (ip: string) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });

describe("withRateLimit", () => {
  it("passes requests through until the limit, then answers 429 with Retry-After", async () => {
    const handler = vi.fn(() => Promise.resolve(new Response("ok")));
    const limited = withRateLimit(handler, {
      limiter: createInMemoryRateLimiter({ limit: 1, windowMs: 30_000 }),
    });

    expect((await limited(request("1.1.1.1"))).status).toBe(200);
    const refused = await limited(request("1.1.1.1"));

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("limits each client on its own", async () => {
    const limited = withRateLimit(() => Promise.resolve(new Response("ok")), {
      limiter: createInMemoryRateLimiter({ limit: 1, windowMs: 30_000 }),
    });

    await limited(request("1.1.1.1"));

    expect((await limited(request("2.2.2.2"))).status).toBe(200);
  });
});

describe("clientKey", () => {
  it("uses the client address the proxy recorded first", () => {
    expect(clientKey(request("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("groups requests without a known address under one key", () => {
    expect(clientKey(new Request("http://localhost/"))).toBe("unknown");
  });
});
