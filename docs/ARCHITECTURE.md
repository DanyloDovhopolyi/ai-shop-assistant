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
- Catalog data: `'use cache'` + `cacheLife`. Throw inside cached functions on failure so errors are never cached.
- Catalog UI states use React and Next primitives: `<Suspense>` + skeleton for loading, `useTransition` (`isPending`) while a filter change navigates, `error.tsx` with `reset()` for errors.
- TanStack Query owns data that lives on the client: search suggestions while typing (stage 4) and product details in chat cards (stage 3). Query keys and options come from one `queryOptions` factory per slice.
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
- `ProductSearch` port (stage 4): free-text query to products. Adapters: pgvector, keyword fallback (stage 6).
- Adapters translate upstream wire formats into domain types (anti-corruption layer): a DTO schema in `api/` maps into the domain schema in `model/`.
- The LLM is a dependency: `LanguageModel` from the AI SDK, so Gemini swaps for any provider; tests use `MockLanguageModelV4` from `ai/test`.

## AI SDK

- One `ProductFilters` schema serves the UI controls, URL parsing, and the `filterProducts` tool `inputSchema`.
- Tool set declared with `satisfies ToolSet`; message type `UIMessage<never, UIDataTypes, InferUITools<typeof tools>>`.
- Render tool parts by `part.type` then `part.state`, exhaustively.
- Route handler: pass `req.signal` to `streamText`, cap steps with `stopWhen`, return `createUIMessageStreamResponse`.
- Client: expose `stop()`; on `error`, offer `regenerate()`; show 429 distinctly.

## Testing (TDD)

- Red → green → refactor. Tests sit next to code as `*.test.ts(x)`.
- Test what carries risk: business logic in `model/`, adapters (one contract suite per port), infrastructure with real failure modes (`fetchJson`), key UI flows, AI tools with a mock model. Each test proves a behaviour a user or caller depends on.
- Leave untested: config, thin wrappers over libraries, routing files, styling. A test that only re-checks a library (e.g. Zod rejecting a missing key) adds noise.
- Coverage thresholds apply to `model/` and `api/` only, so the number reflects the code that matters.
- Vitest projects pick the environment by extension: `*.test.ts` runs in `unit` (node), `*.test.tsx` runs in `dom` (jsdom + Testing Library + jest-dom).
- Network: the shared MSW server (`test/msw/server.ts`) has no default handlers; each test declares its network with `server.use()`. Unmocked requests fail (`onUnhandledFrame: "error"`). Import handlers from `msw/http`.
- Test behaviour through the public API; assert outcomes, not calls.
- Keep async Server Components thin: their logic is pure functions tested directly.
- Type-level guarantees (e.g. `ProductId` brand) are proven with `@ts-expect-error`; `typecheck` fails if the forbidden code starts compiling.
