import { describe, expect, it } from "vitest";

import { MAX_HISTORY, MAX_MESSAGE_LENGTH, limitChat } from "./chat-limits";

const message = (role: string, text: string) => ({
  role,
  parts: [{ type: "text", text }],
});

describe("limitChat", () => {
  it("accepts a normal conversation unchanged", () => {
    const messages = [message("user", "laptops"), message("assistant", "ok")];

    expect(limitChat(messages)).toEqual({ ok: true, messages });
  });

  it("refuses an oversized message instead of sending it to the model", () => {
    expect(
      limitChat([message("user", "x".repeat(MAX_MESSAGE_LENGTH + 1))]),
    ).toEqual({ ok: false, reason: "too-long" });
  });

  it("keeps only the most recent part of a long conversation", () => {
    const messages = Array.from({ length: MAX_HISTORY + 5 }, (_, index) =>
      message(index % 2 === 0 ? "user" : "assistant", `m${String(index)}`),
    );

    const result = limitChat(messages);

    expect(result.ok && result.messages).toHaveLength(MAX_HISTORY);
    expect(result.ok && result.messages.at(-1)).toEqual(messages.at(-1));
  });
});
