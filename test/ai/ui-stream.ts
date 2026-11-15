import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessageChunk,
} from "ai";

/** A /api/chat response in the real wire format, built from UI message chunks. */
export function uiStreamResponse(chunks: UIMessageChunk[]): Response {
  return createUIMessageStreamResponse({
    stream: simulateReadableStream({ chunks, chunkDelayInMs: null }),
  });
}

/** An answer that calls filterProducts, then replies with text. */
export function filteringAnswer(output: unknown, reply: string) {
  return toolAnswer("filterProducts", output, reply);
}

/** An answer that calls one tool, gets `output`, then replies with text. */
export function toolAnswer(toolName: string, output: unknown, reply: string) {
  return uiStreamResponse([
    { type: "start" },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: "call-1",
      toolName,
      input: {},
    },
    { type: "tool-output-available", toolCallId: "call-1", output },
    { type: "finish-step" },
    { type: "start-step" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: reply },
    { type: "text-end", id: "t1" },
    { type: "finish-step" },
    { type: "finish" },
  ]);
}
