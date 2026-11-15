import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { ProductCatalog } from "@/entities/product";
import { createChatHandler } from "@/features/ai-chat";
import { withRateLimit } from "@/shared/api";
import { CHAT_MODEL_ID, ConfigError, getServerEnv } from "@/shared/config";

import { getCatalog } from "../../_lib/catalog";
import { chatRateLimiter } from "../../_lib/rate-limits";
import { getProductSearch } from "../../_lib/search";

// Composition root for the chat: picks the model and reuses the cached catalog.
const catalog: ProductCatalog = { list: () => getCatalog() };

export const POST = withRateLimit(handleChat, { limiter: chatRateLimiter });

async function handleChat(request: Request): Promise<Response> {
  let apiKey: string;
  try {
    apiKey = getServerEnv().GOOGLE_GENERATIVE_AI_API_KEY;
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    console.error(error.message);
    return Response.json(
      { error: "The assistant is not configured." },
      { status: 503 },
    );
  }

  const model = createGoogleGenerativeAI({ apiKey })(CHAT_MODEL_ID);
  return createChatHandler({ model, catalog, search: getProductSearch() })(
    request,
  );
}
