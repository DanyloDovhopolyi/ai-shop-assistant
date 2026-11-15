/**
 * Embeds the product catalog into Supabase for semantic search.
 * Run after the catalog changes: `npm run index:products`. Unchanged products are skipped.
 */
import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

import { z } from "zod";

import { createDummyJsonProductCatalog } from "@/entities/product";
import {
  createDbClient,
  createGeminiEmbeddings,
  indexProducts,
} from "@/features/semantic-search";

// Validated here, not through shared/config: that module is guarded by
// `server-only`, which only Next's server bundle can import.
const env = z
  .object({
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
    SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);

const products = await createDummyJsonProductCatalog().list();
const { embedDocuments } = createGeminiEmbeddings({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const report = await indexProducts({
  products,
  db: createDbClient({
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  }),
  embedDocuments,
  hash: (content) => createHash("sha256").update(content).digest("hex"),
  // Gemini's free tier allows 100 embedded texts per minute.
  batchSize: 90,
  beforeNextBatch: async ({ done, total }) => {
    console.log(
      `${String(done)}/${String(total)} embedded; waiting out the rate limit…`,
    );
    await sleep(61_000);
  },
});

console.log(
  `Indexed ${String(products.length)} products: ${String(report.embedded)} embedded, ${String(report.unchanged)} unchanged, ${String(report.removed)} removed.`,
);
