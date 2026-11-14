"use client";

import { useChat } from "@ai-sdk/react";
import { type SubmitEvent, useState } from "react";

import { type ProductFilters, SORT_LABELS } from "@/entities/product";
import { assertNever } from "@/shared/lib";

import { ProductPreviewCard } from "./product-preview-card";
import type { ChatMessage } from "../api/chat-handler";
import { describeChatError } from "../model/chat-error";
import type { FilterResult } from "../model/filter-result";

type MessagePart = ChatMessage["parts"][number];
type FilterToolPart = Extract<MessagePart, { type: "tool-filterProducts" }>;

const EXAMPLES = [
  "Laptops under $1500",
  "Best rated smartphones",
  "Cheapest groceries first",
] as const;

export interface ChatPanelProps {
  /** Called once per answer that filtered the catalog, with the filters it used. */
  readonly onFiltersApplied: (filters: ProductFilters) => void;
}

export function ChatPanel({ onFiltersApplied }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error, regenerate } =
    useChat<ChatMessage>({
      // Applied when the answer ends, so the grid changes once per request
      // instead of re-rendering while the reply is still streaming.
      onFinish: ({ message }) => {
        const filters = lastAppliedFilters(message);
        if (filters) onFiltersApplied(filters);
      },
    });
  const busy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  return (
    <section
      aria-label="Shopping assistant"
      className="flex h-[32rem] flex-col rounded-xl border border-zinc-200 bg-white lg:h-[calc(100dvh-8rem)] dark:border-zinc-800 dark:bg-zinc-950"
    >
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="font-medium">Assistant</h2>
        <p className="text-xs text-zinc-500">
          Describe what you need; the catalog follows.
        </p>
      </header>

      <div
        role="log"
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <ul className="flex flex-col gap-2" aria-label="Example requests">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    send(example);
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              aria-label={message.role === "user" ? "You" : "Assistant"}
              className={`flex max-w-[90%] flex-col gap-2 rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "self-start bg-zinc-100 dark:bg-zinc-900"
              }`}
            >
              {message.parts.map((part, index) => (
                <MessagePartView
                  // Parts have no id; their order within a message never changes.
                  key={index}
                  part={part}
                />
              ))}
            </article>
          ))
        )}
        {status === "submitted" && (
          <p className="text-sm text-zinc-500">Thinking…</p>
        )}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
          >
            <span>{describeChatError(error)}</span>
            <button
              type="button"
              onClick={() => void regenerate()}
              className="font-medium underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
          }}
          placeholder="Headphones under $100, best rated first"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => void stop()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        )}
      </form>
    </section>
  );
}

function MessagePartView({ part }: { readonly part: MessagePart }) {
  switch (part.type) {
    case "text":
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    case "tool-filterProducts":
      return <FilterToolView part={part} />;
    case "step-start":
    case "reasoning":
    case "reasoning-file":
    case "file":
    case "source-url":
    case "source-document":
    case "dynamic-tool":
    case "steering-message":
    case "custom":
      // This chat streams only text and filterProducts calls; data parts below too.
      return null;
    default:
      return isDataPart(part) ? null : assertNever(part);
  }
}

function isDataPart(
  part: MessagePart,
): part is Extract<MessagePart, { type: `data-${string}` }> {
  return part.type.startsWith("data-");
}

function FilterToolView({ part }: { readonly part: FilterToolPart }) {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return <p className="text-xs text-zinc-500">Filtering the catalog…</p>;
    case "output-available":
      return <FilterSummary result={part.output} />;
    case "output-error":
      return (
        <p className="text-xs text-red-600 dark:text-red-400">
          Could not apply these filters.
        </p>
      );
    case "approval-requested":
    case "approval-responded":
    case "output-denied":
      // filterProducts needs no approval, so these states never occur.
      return null;
    default:
      return assertNever(part);
  }
}

function FilterSummary({ result }: { readonly result: FilterResult }) {
  const { category, minPrice, maxPrice, minRating, sort } = result.filters;
  const chips = [
    category,
    priceRange(minPrice, maxPrice),
    minRating === undefined ? undefined : `${String(minRating)}★ and up`,
    sort === "featured" ? undefined : SORT_LABELS[sort],
  ].filter((chip) => chip !== undefined);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-zinc-500">
          {result.total} {result.total === 1 ? "product" : "products"}
        </span>
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full bg-white px-2 py-0.5 dark:bg-zinc-800"
          >
            {chip}
          </span>
        ))}
      </div>
      {result.preview.length > 0 && (
        <ul
          aria-label="Top matches"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {result.preview.map((product) => (
            <li key={product.id}>
              <ProductPreviewCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function priceRange(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined) return `${usd(min)}–${usd(max)}`;
  if (min !== undefined) return `from ${usd(min)}`;
  if (max !== undefined) return `up to ${usd(max)}`;
  return undefined;
}

function usd(amount: number): string {
  return `$${String(amount)}`;
}

/** The filters from the last successful filterProducts call in an answer. */
function lastAppliedFilters(message: ChatMessage): ProductFilters | undefined {
  return message.parts.findLast(
    (part): part is FilterToolPart & { state: "output-available" } =>
      part.type === "tool-filterProducts" && part.state === "output-available",
  )?.output.filters;
}
