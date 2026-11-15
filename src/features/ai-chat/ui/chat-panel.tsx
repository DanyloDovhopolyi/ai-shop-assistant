"use client";

import { useChat } from "@ai-sdk/react";
import { AlertCircleIcon, XIcon } from "lucide-react";
import { type SubmitEvent, useEffect, useRef, useState } from "react";

import {
  formatCategory,
  type ProductFilters,
  SORT_LABELS,
} from "@/entities/product";
import { assertNever } from "@/shared/lib";
import { Alert, AlertAction, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";

import { ComparisonTable } from "./comparison-table";
import { ProductPreviewCard } from "./product-preview-card";
import { RunDetailsPanel } from "./run-details-panel";
import type { ChatMessage } from "../api/chat-handler";
import { describeChatError } from "../model/chat-error";
import type { FilterResult, ProductPreview } from "../model/filter-result";
import { ChatMetadataSchema, describeRun } from "../model/run-details";
import type { SearchResult } from "../model/search-result";

type MessagePart = ChatMessage["parts"][number];
type FilterToolPart = Extract<MessagePart, { type: "tool-filterProducts" }>;
type CompareToolPart = Extract<MessagePart, { type: "tool-compareProducts" }>;
type SearchToolPart = Extract<MessagePart, { type: "tool-searchProducts" }>;

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
      // Metadata comes from the network: validate it like any other boundary.
      messageMetadataSchema: ChatMetadataSchema,
      // Applied when the answer ends, so the grid changes once per request
      // instead of re-rendering while the reply is still streaming.
      onFinish: ({ message }) => {
        const filters = lastAppliedFilters(message);
        if (filters) onFiltersApplied(filters);
      },
    });
  const busy = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as answers stream in. ScrollArea scrolls
  // its inner viewport, not the root the ref points at.
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
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
    <section aria-label="Shopping assistant" className="h-full">
      <Card className="h-full gap-0 py-0">
        <CardHeader className="border-b pt-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <h2>Assistant</h2>
          </CardTitle>
          {/* col-start-1: the close action is hidden on desktop but still makes the header a two-column grid. */}
          <CardDescription className="col-start-1">
            Say what you need. I&apos;ll filter or search the catalog.
          </CardDescription>
          {onClose && (
            <CardAction className="lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close assistant"
              >
                <XIcon />
              </Button>
            </CardAction>
          )}
        </CardHeader>

        <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
          <div
            role="log"
            aria-live="polite"
            className="flex min-h-full flex-col gap-4 px-4 py-4"
          >
            {messages.length === 0 ? (
              <div className="mt-auto flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Try one of these:
                </p>
                <ul
                  className="flex flex-col gap-2"
                  aria-label="Example requests"
                >
                  {EXAMPLES.map((example) => (
                    <li key={example}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          send(example);
                        }}
                        className="h-auto w-full justify-start py-2.5 font-normal"
                      >
                        {example}
                      </Button>
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
                      : // Full width, because tables and card rows need the room.
                        "flex w-full min-w-0 flex-col gap-2.5 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3 text-sm"
                  }
                >
                  {message.parts.map((part, index) => (
                    <MessagePartView
                      // Parts have no id; their order within a message never changes.
                      key={index}
                      part={part}
                    />
                  ))}
                  {/* Shown once the answer is complete: duration arrives with "finish". */}
                  {message.role === "assistant" &&
                    message.metadata?.durationMs !== undefined && (
                      <RunDetailsPanel run={describeRun(message)} />
                    )}
                </article>
              ))
            )}
            {status === "submitted" && (
              <p className="text-sm text-muted-foreground motion-safe:animate-pulse">
                Thinking…
              </p>
            )}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircleIcon />
                <AlertDescription>{describeChatError(error)}</AlertDescription>
                <AlertAction>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void regenerate()}
                  >
                    Retry
                  </Button>
                </AlertAction>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <CardFooter className="p-3">
          <form onSubmit={submit} className="flex w-full gap-2">
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
              className="h-10 flex-1 bg-card"
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
              <Button type="submit" disabled={!input.trim()} className="h-10">
                Send
              </Button>
            )}
          </form>
        </CardFooter>
      </Card>
    </section>
  );
}

function MessagePartView({ part }: { readonly part: MessagePart }) {
  switch (part.type) {
    case "text":
      return <p className="leading-relaxed whitespace-pre-wrap">{part.text}</p>;
    case "tool-filterProducts":
      return <FilterToolView part={part} />;
    case "tool-searchProducts":
      return <SearchToolView part={part} />;
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

function SearchToolView({ part }: { readonly part: SearchToolPart }) {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return <p className="text-xs text-muted-foreground">Searching…</p>;
    case "output-available":
      return <SearchResults result={part.output} />;
    case "output-error":
      return <p className="text-xs text-destructive">Search is unavailable.</p>;
    case "approval-requested":
    case "approval-responded":
    case "output-denied":
      // searchProducts needs no approval, so these states never occur.
      return null;
    default:
      return assertNever(part);
  }
}

function SearchResults({ result }: { readonly result: SearchResult }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground tabular-nums">
          {result.products.length === 0
            ? "No matches for"
            : `${String(result.products.length)} matches for`}
        </span>
        <Badge variant="outline" className="bg-background font-normal">
          {result.query}
        </Badge>
      </div>
      <PreviewRow products={result.products} label="Search results" />
    </div>
  );
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
        {chips.map((chip) => (
          <Badge
            key={chip}
            variant="outline"
            className="bg-background font-normal"
          >
            {chip}
          </Badge>
        ))}
      </div>
      <PreviewRow products={result.preview} label="Top matches" />
    </div>
  );
}

function PreviewRow({
  products,
  label,
}: {
  readonly products: readonly ProductPreview[];
  readonly label: string;
}) {
  if (products.length === 0) return null;
  return (
    <ul
      aria-label={label}
      className="-mr-5 flex gap-2 overflow-x-auto pr-5 pb-1"
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductPreviewCard product={product} />
        </li>
      ))}
    </ul>
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
