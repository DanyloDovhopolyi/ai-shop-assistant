-- Applied to the remote project through the Supabase MCP server (version 20261115010407).
create extension if not exists vector with schema extensions;

-- One row per catalog product: the text that was embedded and its vector.
create table public.product_embeddings (
  product_id integer primary key check (product_id > 0),
  content text not null,
  -- Lets re-indexing skip products whose text has not changed.
  content_hash text not null,
  embedding extensions.vector(768) not null,
  updated_at timestamptz not null default now()
);

-- Only the server (secret key, which bypasses RLS) reads or writes embeddings.
-- RLS without policies plus revoked grants keeps the Data API closed to anon users.
alter table public.product_embeddings enable row level security;
revoke all on table public.product_embeddings from anon, authenticated;

-- No vector index: with ~200 products an exact sequential scan is fast and has
-- perfect recall. Add HNSW (vector_cosine_ops) when the catalog grows.

-- Products closest in meaning to a query embedding, best first.
create function public.match_products(
  query_embedding extensions.vector(768),
  match_count integer default 10
)
returns table (product_id integer, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.product_id,
    1 - (e.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.product_embeddings as e
  order by e.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

revoke execute on function public.match_products(extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.match_products(extensions.vector, integer) to service_role;
