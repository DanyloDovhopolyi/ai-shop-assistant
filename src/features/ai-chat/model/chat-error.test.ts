import { describe, expect, it } from "vitest";

import { describeChatError, toChatErrorCode } from "./chat-error";

describe("toChatErrorCode", () => {
  it("reports a provider 429 as rate-limited", () => {
    expect(toChatErrorCode({ statusCode: 429 })).toBe("rate-limited");
  });

  it("sees a 429 through the SDK's retry wrapper", () => {
    const retriesExhausted = {
      reason: "maxRetriesExceeded",
      lastError: { statusCode: 429 },
    };

    expect(toChatErrorCode(retriesExhausted)).toBe("rate-limited");
  });

  it("hides every other failure behind one generic code", () => {
    expect(toChatErrorCode({ statusCode: 500 })).toBe("unavailable");
    expect(toChatErrorCode(new Error("API key leaked in message"))).toBe(
      "unavailable",
    );
  });
});

describe("describeChatError", () => {
  it("asks the user to wait when the stream reports rate limiting", () => {
    expect(describeChatError(new Error("rate-limited"))).toMatch(/wait/i);
  });

  it("asks the user to wait when our own endpoint answers 429", () => {
    const httpError = Object.assign(new Error("Too many requests"), {
      statusCode: 429,
    });

    expect(describeChatError(httpError)).toMatch(/wait/i);
  });

  it("says the assistant was too slow when the server timed it out", () => {
    expect(describeChatError(new Error("timeout"))).toMatch(/too long/i);
  });

  it("shows a generic message for anything else", () => {
    expect(describeChatError(new Error("unavailable"))).toMatch(/unavailable/i);
  });
});
