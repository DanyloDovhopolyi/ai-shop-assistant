"use client";

import { useChat } from "@ai-sdk/react";
import { XIcon } from "lucide-react";
import { type SubmitEvent, useEffect, useRef, useState } from "react";


import {
  formatCategory,
  type ProductFilters,
  SORT_LABELS,
} from "@/entities/product";
import { assertNever } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { ComparisonTable } from "./comparison-table";
import { ProductPreviewCard } from "./product-preview-card";
import type { ChatMessage } from "../api/chat-handler";
import { describeChatError } from "../model/chat-error";
import type { FilterResult } from "../model/filter-result";

type MessagePart = ChatMessage["parts"][number];
type FilterToolPart = Extract<MessagePart, { type: "tool-filterProducts" }>;
type CompareToolPart = Extract<MessagePart, { type: "tool-compareProducts" }>;

const EXAMPLES = [
  "Laptops under $1500",
  "Best rated smartphones",
  "Cheapest groceries first",
] as const;

export interface ChatPanelProps {
  /** Called once per answer that filtered the catalog, with the filters it used. */
  readonly onFiltersApplied: (filters: ProductFilters) => void;
  /** Shows a close button on small screens, where the chat is a sheet. */
  readonly onClose?: () => void;
}

export function ChatPanel({ onFiltersApplied, onClose }: ChatPanelProps) {
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
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as answers stream in.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, status]);

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
      className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card"
    >
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden className="size-2.5 rounded-full bg-assistant" />
            Assistant
          </h2>
          <p className="text-sm text-muted-foreground">
            Say what you need. I&apos;ll set the filters.
          </p>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close assistant"
            className="lg:hidden"
          >
            <XIcon />
          </Button>
        )}
      </header>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 ? (
          <div className="mt-auto flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <ul className="flex flex-col gap-2" aria-label="Example requests">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => {
                      send(example);
                    }}
                    className="w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-assistant hover:text-assistant focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              aria-label={message.role === "user" ? "You" : "Assistant"}
              className={
                message.role === "user"
                  ? "max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                  : // The assistant's voice: no bubble, its colour on the edge. Full
                    // width, because tables and card rows need the room.
                    "flex w-full min-w-0 flex-col gap-2.5 border-l-2 border-assistant pl-3 text-sm"
              }
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
          <p className="border-l-2 border-assistant/40 pl-3 text-sm text-muted-foreground motion-safe:animate-pulse">
            Thinking…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <span>{describeChatError(error)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void regenerate()}
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t p-3">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <Input
          id="chat-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
          }}
          placeholder="Headphones under $100, best rated first"
          autoComplete="off"
          className="h-10 flex-1"
        />
        {busy ? (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => void stop()}
          >
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            className="h-10 bg-assistant text-assistant-foreground hover:bg-assistant/90"
          >
            Send
          </Button>
        )}
      </form>
    </section>
  );
}

function MessagePartView({ part }: { readonly part: MessagePart }) {
  switch (part.type) {
    case "text":
      return <p className="leading-relaxed whitespace-pre-wrap">{part.text}</p>;
    case "tool-filterProducts":
      return <FilterToolView part={part} />;
    case "tool-compareProducts":
      return <CompareToolView part={part} />;
    case "step-start":
    case "reasoning":
    case "reasoning-file":
    case "file":
    case "source-url":
    case "source-document":
    case "dynamic-tool":
    case "steering-message":
    case "custom":
      // This chat streams only text and its own tool calls; data parts below too.
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
      return <p className="text-xs text-muted-foreground">Setting filters…</p>;
    case "output-available":
      return <FilterSummary result={part.output} />;
    case "output-error":
      return (
        <p className="text-xs text-destructive">
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

function CompareToolView({ part }: { readonly part: CompareToolPart }) {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <p className="text-xs text-muted-foreground">Comparing products…</p>
      );
    case "output-available":
      return <ComparisonTable comparison={part.output} />;
    case "output-error":
      return (
        <p className="text-xs text-destructive">
          Could not compare these products.
        </p>
      );
    case "approval-requested":
    case "approval-responded":
    case "output-denied":
      // compareProducts needs no approval, so these states never occur.
      return null;
    default:
      return assertNever(part);
  }
}

function FilterSummary({ result }: { readonly result: FilterResult }) {
  const { category, minPrice, maxPrice, minRating, sort } = result.filters;
  const chips = [
    category === undefined ? undefined : formatCategory(category),
    priceRange(minPrice, maxPrice),
    minRating === undefined ? undefined : `${String(minRating)}★ and up`,
    sort === "featured" ? undefined : SORT_LABELS[sort],
  ].filter((chip) => chip !== undefined);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground tabular-nums">
          {result.total} {result.total === 1 ? "product" : "products"}
        </span>
        {/* Same colour as the filters it set in the panel: one visual link. */}
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full bg-assistant-soft px-2 py-0.5 text-assistant"
          >
            {chip}
          </span>
        ))}
      </div>
      {result.preview.length > 0 && (
        <ul
          aria-label="Top matches"
          className="-mr-5 flex gap-2 overflow-x-auto pr-5 pb-1"
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
