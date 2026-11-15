import type { SupabaseClient } from "@supabase/supabase-js";

import { type Product, ProductIdSchema } from "@/entities/product";
import type { Database } from "@/shared/api";

import { toVectorLiteral } from "./pgvector-product-search";
import { planIndexing } from "../model/index-plan";

export type EmbedDocuments = (
  texts: readonly string[],
) => Promise<readonly (readonly number[])[]>;

export interface IndexReport {
  readonly embedded: number;
  readonly unchanged: number;
  readonly removed: number;
}

const DEFAULT_BATCH_SIZE = 50;

/**
 * Brings `product_embeddings` in line with the catalog. Only new or edited
 * products are embedded, and each batch is saved as it lands, so an
 * interrupted run resumes where it stopped.
 */
export async function indexProducts({
  products,
  db,
  embedDocuments,
  hash,
  batchSize = DEFAULT_BATCH_SIZE,
  beforeNextBatch,
}: {
  readonly products: readonly Product[];
  readonly db: SupabaseClient<Database>;
  readonly embedDocuments: EmbedDocuments;
  readonly hash: (content: string) => string;
  readonly batchSize?: number;
  /** Runs between batches, e.g. to wait out a provider's per-minute quota. */
  readonly beforeNextBatch?: (progress: {
    readonly done: number;
    readonly total: number;
  }) => Promise<void>;
}): Promise<IndexReport> {
  const existing = await db
    .from("product_embeddings")
    .select("product_id, content_hash");
  if (existing.error) throw existing.error;
  const indexed = new Map(
    existing.data.map((row) => [
      ProductIdSchema.parse(row.product_id),
      row.content_hash,
    ]),
  );

  const plan = planIndexing(products, indexed, hash);

  for (let start = 0; start < plan.toEmbed.length; start += batchSize) {
    if (start > 0) {
      await beforeNextBatch?.({ done: start, total: plan.toEmbed.length });
    }
    const batch = plan.toEmbed.slice(start, start + batchSize);
    const vectors = await embedDocuments(batch.map((item) => item.content));
    const { error } = await db.from("product_embeddings").upsert(
      batch.map((item, index) => ({
        product_id: item.id,
        content: item.content,
        content_hash: item.hash,
        embedding: toVectorLiteral(vectors[index] ?? []),
        updated_at: new Date().toISOString(),
      })),
    );
    if (error) throw error;
  }

  if (plan.toRemove.length > 0) {
    const { error } = await db
      .from("product_embeddings")
      .delete()
      .in("product_id", [...plan.toRemove]);
    if (error) throw error;
  }

  return {
    embedded: plan.toEmbed.length,
    unchanged: plan.unchanged,
    removed: plan.toRemove.length,
  };
}
