import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  type InferUIMessageChunk,
  type InferUITools,
  isStepCount,
  type LanguageModel,
  type ToolSet,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { listCategories, type ProductCatalog } from "@/entities/product";

import { createCompareProductsTool } from "./compare-products-tool";
import { createFilterProductsTool } from "./filter-products-tool";
import { createSearchProductsTool } from "./search-products-tool";
import { toChatErrorCode } from "../model/chat-error";
import { limitChat } from "../model/chat-limits";
import type { ChatMetadata } from "../model/run-details";
import type { ProductMatcher } from "../model/search-result";
import { buildSystemPrompt } from "../model/system-prompt";

/** Find, then compare, then answer; stops runaway tool loops. */
const MAX_STEPS = 3;
const MAX_OUTPUT_TOKENS = 600;

const ChatRequestSchema = z.object({ messages: z.array(z.unknown()).min(1) });

export interface ChatHandlerDeps {
  readonly model: LanguageModel;
  readonly catalog: ProductCatalog;
  readonly search: ProductMatcher;
  /** A stalled model ends in an error the user can act on, not an endless "Thinking…". */
  readonly timeouts?: {
    readonly firstChunkMs: number;
    readonly totalMs: number;
  };
}

const DEFAULT_TIMEOUTS = { firstChunkMs: 20_000, totalMs: 45_000 };

function createChatTools({
  catalog,
  search,
}: Pick<ChatHandlerDeps, "catalog" | "search">) {
  return {
    filterProducts: createFilterProductsTool({ catalog }),
    searchProducts: createSearchProductsTool({ catalog, search }),
    compareProducts: createCompareProductsTool({ catalog }),
  } satisfies ToolSet;
}

export type ChatTools = InferUITools<ReturnType<typeof createChatTools>>;
export type ChatMessage = UIMessage<ChatMetadata, UIDataTypes, ChatTools>;

/** Framework-agnostic POST handler: Request in, streamed UI messages out. */
export function createChatHandler({
  model,
  catalog,
  search,
  timeouts = DEFAULT_TIMEOUTS,
}: ChatHandlerDeps) {
  const tools = createChatTools({ catalog, search });

  return async function handleChat(request: Request): Promise<Response> {
    const body = ChatRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    const messages = body.success
      ? await safeValidateUIMessages<ChatMessage>({
          messages: body.data.messages,
          tools,
        })
      : body;
    if (!messages.success) {
      return Response.json({ error: "Invalid chat request" }, { status: 400 });
    }
    const limited = limitChat(messages.data);
    if (!limited.ok) {
      return Response.json({ error: "Message is too long" }, { status: 400 });
    }

    const categories = listCategories(
      await catalog.list({ signal: request.signal }),
    );
    const startedAt = performance.now();
    const result = streamText({
      model,
      instructions: buildSystemPrompt(categories),
      messages: await convertToModelMessages([...limited.messages], { tools }),
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      // Answers are a few sentences; the cap keeps the bot from being used as a
      // free text generator and bounds the cost of every call.
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      timeout: timeouts,
      // Closing the tab or pressing Stop aborts the request; stop paying for tokens.
      abortSignal: request.signal,
    });

    return createUIMessageStreamResponse({
      stream: reportTimeouts(
        request.signal,
        toUIMessageStream<typeof tools, ChatMessage>({
          stream: result.stream,
          // Feeds the "Under the hood" panel: which model, how long, how many tokens.
          messageMetadata: ({ part }): ChatMetadata | undefined => {
            if (part.type === "start") return { model: modelIdOf(model) };
            if (part.type !== "finish") return undefined;
            const { inputTokens, outputTokens } = part.totalUsage;
            return {
              durationMs: Math.round(performance.now() - startedAt),
              finishReason: part.finishReason,
              ...(inputTokens === undefined ? {} : { inputTokens }),
              ...(outputTokens === undefined ? {} : { outputTokens }),
            };
          },
          // The client gets a stable code; the real cause stays in the server log.
          onError: (error) => {
            console.error(error);
            return toChatErrorCode(error);
          },
        }),
      ),
    });
  };
}

function modelIdOf(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}

/**
 * The SDK ends a timed-out answer with an "abort" chunk, which the client treats
 * like the user's own Stop. If the user did not stop it, it was the timeout:
 * report it as an error, so the chat can explain and offer Retry.
 */
type ChatChunk = InferUIMessageChunk<ChatMessage>;

function reportTimeouts(
  clientSignal: AbortSignal,
  stream: ReadableStream<ChatChunk>,
): ReadableStream<ChatChunk> {
  return stream.pipeThrough(
    new TransformStream<ChatChunk, ChatChunk>({
      transform(chunk, controller) {
        controller.enqueue(
          chunk.type === "abort" && !clientSignal.aborted
            ? { type: "error", errorText: "timeout" }
            : chunk,
        );
      },
    }),
  );
}
