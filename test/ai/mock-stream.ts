import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

/** A model turn that calls one tool and stops for its result. */
export function toolCallTurn(toolName: string, input: unknown) {
  return turn([
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName,
      input: JSON.stringify(input),
    },
    {
      type: "finish",
      finishReason: { unified: "tool-calls", raw: undefined },
      usage,
    },
  ]);
}

/** A model turn that answers with plain text. */
export function textTurn(text: string) {
  return turn([
    { type: "text-start", id: "text-1" },
    { type: "text-delta", id: "text-1", delta: text },
    { type: "text-end", id: "text-1" },
    {
      type: "finish",
      finishReason: { unified: "stop", raw: undefined },
      usage,
    },
  ]);
}

function turn(chunks: LanguageModelV4StreamPart[]) {
  return { stream: simulateReadableStream({ chunks }) };
}
