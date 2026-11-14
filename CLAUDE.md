@AGENTS.md

# AI Shop Assistant

Portfolio project. Goal: show AI integration (tool calling, generative UI, RAG) and production-grade code quality to reviewing developers.

## Product

Minimal shop: no auth, cart, or payments. A product catalog page with an AI chat beside it. The user writes in plain language ("headphones under $100, best rated first") and the bot filters and sorts the catalog.

## Stack

- Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4
- Vercel AI SDK (`ai`, `@ai-sdk/react`) + Gemini (`@ai-sdk/google`, key in `GOOGLE_GENERATIVE_AI_API_KEY`)
- Zod for all external data and tool schemas
- Products from DummyJSON (`https://dummyjson.com/products`)
- Vitest + Testing Library + MSW

## Architecture

Read `docs/ARCHITECTURE.md` before writing or changing any code. It defines the folder structure, typing rules, DI, error handling, and testing.

## Roadmap

0. **Foundation**: strict TS + typed ESLint → Vitest + MSW → folder structure → `fetchJson` (TDD) + env validation.
1. **Catalog**: product grid, manual filters (category, price, rating, sort) in the URL.
2. **AI chat with tool calling**: `filterProducts` tool shares the `ProductFilters` schema; the model fills it, the grid updates; streamed response.
3. **Generative UI**: product cards and a comparison table rendered in the chat.
4. **Semantic search**: embeddings of product descriptions + pgvector (Supabase or Neon) for queries like "winter gift".
5. **Under-the-hood panel**: tool called, its input, tokens, latency.
6. **Production hardening**: keyword-search fallback when the LLM is down, caching, rate limit, prompt-injection guard (bot answers only about products), evals in CI (query → expected filters).

## Workflow

- One small step per turn, one commit per step (Conventional Commits).
- After each step: stop, summarize what changed, wait for the user's "далі".
- Explain key decisions briefly; the user must be able to defend them in an interview.
- Propose anything outside this roadmap and wait for approval before adding it.
- Before committing, `lint`, `format:check`, `typecheck`, `test`, and `build` all pass.
- Talk to the user in Ukrainian. Write code, comments, commits, and docs in English.
