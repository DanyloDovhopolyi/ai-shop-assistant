-- Applied to the remote project through the Supabase MCP server (version 20261115011210).
-- New tables are not exposed to the Data API automatically: the server's role
-- needs explicit grants. anon and authenticated stay without access.
grant select, insert, update, delete on table public.product_embeddings to service_role;
