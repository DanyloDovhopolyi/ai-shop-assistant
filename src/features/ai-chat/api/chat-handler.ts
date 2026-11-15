import {
  convertToModelMessages,
  createUIMessageStreamResponse,
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
import type { ChatMetadata } from "../model/run-details";
import type { ProductMatcher } from "../model/search-result";
import { buildSystemPrompt } from "../model/system-prompt";

/** Find, then compare, then answer; stops runaway tool loops. */
const MAX_STEPS = 3;

const ChatRequestSchema = z.object({ messages: z.array(z.unknown()).min(1) });

export interface ChatHandlerDeps {
  readonly model: LanguageModel;
  readonly catalog: ProductCatalog;
  readonly search: ProductMatcher;
}

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
export function createChatHandler({ model, catalog, search }: ChatHandlerDeps) {
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

    const categories = listCategories(
      await catalog.list({ signal: request.signal }),
    );
    const startedAt = performance.now();
    const result = streamText({
      model,
      instructions: buildSystemPrompt(categories),
      messages: await convertToModelMessages(messages.data, { tools }),
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      // Closing the tab or pressing Stop aborts the request; stop paying for tokens.
      abortSignal: request.signal,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream<typeof tools, ChatMessage>({
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
    });
  };
}

function modelIdOf(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}
