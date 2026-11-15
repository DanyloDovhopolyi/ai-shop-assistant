import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  type InferUITools,
  isStepCount,
  type LanguageModel,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { listCategories, type ProductCatalog } from "@/entities/product";

import { createFilterProductsTool } from "./filter-products-tool";
import { toChatErrorCode } from "../model/chat-error";
import { buildSystemPrompt } from "../model/system-prompt";

/** One tool round-trip plus the final answer; stops runaway tool loops. */
const MAX_STEPS = 3;

const ChatRequestSchema = z.object({ messages: z.array(z.unknown()).min(1) });

export interface ChatHandlerDeps {
  readonly model: LanguageModel;
  readonly catalog: ProductCatalog;
}

function createChatTools({ catalog }: Pick<ChatHandlerDeps, "catalog">) {
  return { filterProducts: createFilterProductsTool({ catalog }) };
}

export type ChatTools = InferUITools<ReturnType<typeof createChatTools>>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

/** Framework-agnostic POST handler: Request in, streamed UI messages out. */
export function createChatHandler({ model, catalog }: ChatHandlerDeps) {
  const tools = createChatTools({ catalog });

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
      stream: toUIMessageStream({
        stream: result.stream,
        // The client gets a stable code; the real cause stays in the server log.
        onError: (error) => {
          console.error(error);
          return toChatErrorCode(error);
        },
      }),
    });
  };
}
