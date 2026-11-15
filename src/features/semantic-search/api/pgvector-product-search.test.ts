import { createClient } from "@supabase/supabase-js";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/shared/api";

import { server } from "@test/msw/server";

import {
  createPgvectorProductSearch,
  SearchError,
} from "./pgvector-product-search";

const URL_BASE = "https://project.supabase.test";
const RPC_URL = `${URL_BASE}/rest/v1/rpc/match_products`;

function setup() {
  const db = createClient<Database>(URL_BASE, "test-key", {
    auth: { persistSession: false },
  });
  const embedQuery = vi.fn(() => Promise.resolve([0.25, -0.5, 1]));
  return {
    search: createPgvectorProductSearch({ db, embedQuery }),
    embedQuery,
  };
}

describe("pgvector product search", () => {
  it("embeds the query and returns the closest products, best first", async () => {
    let body: unknown;
    server.use(
      http.post(RPC_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([
          { product_id: 7, similarity: 0.82 },
          { product_id: 3, similarity: 0.61 },
        ]);
      }),
    );
    const { search, embedQuery } = setup();

    const hits = await search.search("  warm gift for winter ", { limit: 2 });

    expect(embedQuery).toHaveBeenCalledWith("warm gift for winter", undefined);
    // pgvector reads a vector from its text form; PostgREST passes it through.
    expect(body).toEqual({ query_embedding: "[0.25,-0.5,1]", match_count: 2 });
    expect(hits).toEqual([
      { id: 7, similarity: 0.82 },
      { id: 3, similarity: 0.61 },
    ]);
  });

  it("answers a blank query with nothing, without paying for an embedding", async () => {
    const { search, embedQuery } = setup();

    await expect(search.search("   ")).resolves.toEqual([]);
    expect(embedQuery).not.toHaveBeenCalled();
  });

  it("reports a database failure as a search error", async () => {
    server.use(
      http.post(RPC_URL, () =>
        HttpResponse.json(
          { message: "permission denied for function match_products" },
          { status: 403 },
        ),
      ),
    );
    const { search } = setup();

    await expect(search.search("scarf")).rejects.toBeInstanceOf(SearchError);
  });
});
