# Architecture

Rules for all code in this repo. Rationale for non-obvious decisions lives in `docs/adr/`.

**Guiding rule:** add an abstraction when its second real use appears. Every abstraction must be justifiable by a concrete need in this project.

## Structure (FSD-lite)

```
app/        Next.js routing only. Pages compose features; route handlers delegate.
src/
  features/ product-filters, ai-chat, semantic-search
  entities/ product
  shared/   api (http), config (env), lib, ui
```

- Imports go down only: `app → features → entities → shared`. Slices on one layer do not import each other. Steiger (`npm run lint:fsd`) enforces layers and public APIs in CI.
- Import a slice only through its `index.ts`.
- When two slices must cooperate (the chat applies filters), a small client component in `app/_components/` wires one slice's callback to the other's hook.
- Aliases: `@/*` → `src/*`, `@test/*` → `test/*`. Relative paths stay inside one slice (`./`, `../model`); anything further uses an alias (ESLint enforces it, and `import/no-cycle` catches a slice importing its own `index.ts`). `import/order` sorts imports: packages, `@/`, `@test/`, relative.
- Server-only modules start with `import "server-only"`.

### Layers inside a slice

```
model/  business logic: schemas, pure functions, ports (interfaces it needs)
api/    adapters: implement model's ports (HTTP, DB, LLM)
ui/     React components: call model, never api
```

- Dependencies point at `model`: `ui → model ← api`.
- `model` imports only `zod` and `shared/lib`. React, Next, `fetch`, and SDKs live outside it (ESLint `no-restricted-imports` enforces this).
- `model` declares what it needs as a port; it never knows which adapter fills it.
- Add `widgets` / `_pages` layers when a second page or real reuse appears.

## Rendering

- Server Components by default. `"use client"` only for interactive leaves (filter controls, chat), placed as low in the tree as possible.
- Filters live in URL `searchParams`. The server page parses them, filters the cached catalog, and renders the grid. Client controls only update the URL.
- A search lives in the URL too (`?q=`). The page narrows the catalog to semantic matches in relevance order, then filters apply on top. A new search starts with no filters, filters set by hand keep the search, and the assistant's filters clear it.
- Catalog data: `'use cache'` + `cacheLife`. Throw inside cached functions on failure so errors are never cached.
- The build never calls upstream APIs: a page awaits request data (`searchParams`) before cached upstream calls, so prerendering stops first and an outage cannot fail a deploy. The composition root for each route lives in `app/_lib/`.
- Catalog UI states use React and Next primitives: `<Suspense>` + skeleton for loading, `useTransition` (`isPending`) while a filter change navigates, `error.tsx` with `reset()` for errors.
- TanStack Query owns data that lives on the client: search suggestions while typing (stage 4) and product details in chat cards (stage 3). Query keys and options come from one `queryOptions` factory per slice.
- Client queries call this app's route handlers (`/api/products/[id]`), never upstream APIs, so adapters stay the only code that knows DummyJSON.
- Retries happen in one place: TanStack Query on the client (`fetchJson` with `retries: 0` inside `queryFn`), `fetchJson` on the server.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. A flag that conflicts with a library gets an ADR, not a silent removal.
- Derive types from Zod schemas (`z.infer`). Write each shape once.
- Parse `unknown` at every boundary (network, URL, LLM output, env) with Zod.
- Model variants as discriminated unions; end every `switch` with `assertNever` from `shared/lib`.
- Brand `ProductId` (`.brand<"ProductId">()`); it crosses catalog, chat, and comparison.
- `readonly` for domain data. `as const` unions instead of `enum`. `satisfies` for configs and tool sets. `import type` for types.
- Use `never`-based prop constraints when a component has genuinely exclusive props.

## Errors

- Errors are classes extending `AppError` with a discriminant `kind`; handle them by `kind`.
- `fetchJson(url, schema, { signal, timeoutMs, retries })` in `shared/api` is the only HTTP client:
  - timeout via `AbortSignal.any([signal, AbortSignal.timeout(ms)])`;
  - error kinds: `timeout`, `aborted`, `network`, `http`, `invalid-response`;
  - retries GET only, on `network` / `timeout` / 5xx / 429, with exponential backoff + jitter.
- Env is validated with Zod in `shared/config/env.ts` (server-only).

## Dependency injection and substitutability

Goal: replacing any adapter (data source, LLM provider, search engine) changes one wiring line and breaks nothing else.

- Ports are interfaces in `model`; adapters in `api` implement them.
- Pass dependencies as factory parameters (`createFilterProductsTool({ catalog })`). Wire them in one place per route (the composition root).
- Every adapter of a port passes one shared **contract test suite** (`describeProductCatalogContract(name, setup)`). A new adapter is accepted when the suite is green.
- Slices talk only through public APIs (`index.ts`) and Zod-defined data. Changing a slice's internals never breaks another slice.
- `ProductCatalog` port (`entities/product`): lists the whole catalog. Adapters: DummyJSON, in-memory.
- `ProductSearch` port: free-text query to ranked products. Adapters: pgvector (semantic) and keyword search; both pass `describeProductSearchContract`. `withFallback(semantic, keywords)` answers from keywords when the embedding model or the database fails, so search never goes down with the AI. The relevance cut-off (`relevantHits`) wraps the semantic adapter only: keyword scores use another scale.
- When the chat model fails, the error offers "Search the catalog instead" with the user's words, which runs without the language model.
- Embeddings are injected as functions (`EmbedQuery`, `EmbedDocuments`); `createGeminiEmbeddings` is the only code that knows the embedding model.

## Database (Supabase)

- Schema changes are SQL files in `supabase/migrations/`, applied to the project through the Supabase MCP server. Regenerate `src/shared/api/database.types.ts` after each migration.
- Every table in `public` has RLS enabled. Server-only tables (`product_embeddings`) have no policies and revoked `anon`/`authenticated` grants; the server reaches them with the secret key (`SUPABASE_SECRET_KEY`, never `NEXT_PUBLIC_`).
- Functions run as `security invoker` with an empty `search_path` and are granted to `service_role` only.
- Vectors cross PostgREST in pgvector's text form (`"[0.1,0.2]"`).
- `npm run index:products` syncs embeddings with the catalog; it re-embeds only products whose text changed (content hash).
- Adapters translate upstream wire formats into domain types (anti-corruption layer): a DTO schema in `api/` maps into the domain schema in `model/`.
- The LLM is a dependency: `LanguageModel` from the AI SDK, so Gemini swaps for any provider; tests use `MockLanguageModelV4` from `ai/test`.

## AI SDK

- One `ProductFilters` schema (`entities/product`) serves the UI controls, URL parsing, and the `filterProducts` tool `inputSchema`, so invalid model input is rejected by the domain contract.
- Tool logic is a pure function in `model/` (`toFilterResult`); the `tool()` wrapper in `api/` only adds I/O. The message type is `ChatMessage = UIMessage<never, UIDataTypes, InferUITools<tools>>`.
- `createChatHandler({ model, catalog })` is framework-agnostic (Request in, stream out) and tested with `MockLanguageModelV4`; `app/api/chat/route.ts` only wires the real model and checks the API key per request (503 when missing).
- Render tool parts by `part.type` then `part.state`, exhaustively.
- Route handler: validate messages with `safeValidateUIMessages` (400 on failure), pass `instructions` (`system` is deprecated in AI SDK 7), pass `request.signal` as `abortSignal`, cap steps with `stopWhen: isStepCount(n)`, return `createUIMessageStreamResponse`.
- Client: expose `stop()`; on `error`, offer `regenerate()`; show 429 distinctly.
- Errors cross the wire as stable codes (`toChatErrorCode` in `onError`): the client can tell a rate limit apart, and provider details stay in the server log.

## Testing (TDD)

- Red → green → refactor. Tests sit next to code as `*.test.ts(x)`.
- Test what carries risk: business logic in `model/`, adapters (one contract suite per port), infrastructure with real failure modes (`fetchJson`), key UI flows, AI tools with a mock model. Each test proves a behaviour a user or caller depends on.
- Leave untested: config, thin wrappers over libraries, routing files, styling. A test that only re-checks a library (e.g. Zod rejecting a missing key) adds noise.
- Coverage thresholds apply to `model/` and `api/` only, so the number reflects the code that matters.
- Vitest projects pick the environment by extension: `*.test.ts` runs in `unit` (node), `*.test.tsx` runs in `dom` (jsdom + Testing Library + jest-dom).
- Test builders (`makeProduct`) live in `test/fixtures/`, use only slices' public APIs, and are imported as `@test/fixtures/*`. Steiger forbids side entry points such as `@/entities/product/testing`.
- Network: the shared MSW server (`test/msw/server.ts`) has no default handlers; each test declares its network with `server.use()`. Unmocked requests fail (`onUnhandledFrame: "error"`). Import handlers from `msw/http`.
- Test behaviour through the public API; assert outcomes, not calls.
- Keep async Server Components thin: their logic is pure functions tested directly.
- Type-level guarantees (e.g. `ProductId` brand) are proven with `@ts-expect-error`; `typecheck` fails if the forbidden code starts compiling.
