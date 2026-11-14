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

- Imports go down only: `app → features → entities → shared`. Slices on one layer do not import each other.
- Import a slice only through its `index.ts`.
- Segments: `ui`, `model` (schemas, types, logic), `api` (network, adapters), `lib`, `config`.
- Server-only modules start with `import "server-only"`.
- Add `widgets` / `_pages` layers when a second page or real reuse appears.

## Rendering

- Server Components by default. `"use client"` only for interactive leaves (filter controls, chat), placed as low in the tree as possible.
- Filters live in URL `searchParams`. The server page parses them, filters the cached catalog, and renders the grid. Client controls only update the URL.
- Catalog data: `'use cache'` + `cacheLife`. Throw inside cached functions on failure so errors are never cached.
- Every data segment has an `error.tsx` with a retry action.
- No React Query until a real client-side fetch exists; then use TanStack Query (ADR).

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

## Dependency injection

- Ports are interfaces in `model`; adapters live in `api`.
- Pass dependencies as factory parameters (`createFilterProductsTool({ search })`). Wire them in route files.
- `ProductSearch` port: DummyJSON adapter now, pgvector adapter (stage 4), keyword fallback (stage 6).
- The LLM is a dependency too; tests use `MockLanguageModelV4` from `ai/test`.

## AI SDK

- One `ProductFilters` schema serves the UI controls, URL parsing, and the `filterProducts` tool `inputSchema`.
- Tool set declared with `satisfies ToolSet`; message type `UIMessage<never, UIDataTypes, InferUITools<typeof tools>>`.
- Render tool parts by `part.type` then `part.state`, exhaustively.
- Route handler: pass `req.signal` to `streamText`, cap steps with `stopWhen`, return `createUIMessageStreamResponse`.
- Client: expose `stop()`; on `error`, offer `regenerate()`; show 429 distinctly.

## Testing (TDD)

- Red → green → refactor. Tests sit next to code as `*.test.ts(x)`.
- Vitest projects: `unit` (node) for logic and adapters, `dom` (jsdom) for components.
- Network: MSW with `onUnhandledFrame: "error"`; reset handlers after each test.
- Test behaviour through the public API; assert outcomes, not calls.
- Keep async Server Components thin: their logic is pure functions tested directly.
- Type-level guarantees (e.g. `ProductId` brand) get a `*.test-d.ts` with `@ts-expect-error`.
