import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/api";

/**
 * Server-side client with the secret key: it bypasses RLS, which is how the
 * locked-down `product_embeddings` table is reached. Never use it in the browser.
 */
export function createDbClient({
  url,
  secretKey,
}: {
  readonly url: string;
  readonly secretKey: string;
}): SupabaseClient<Database> {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
