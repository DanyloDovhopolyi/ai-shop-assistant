"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import Image from "next/image";
import { type KeyboardEvent, type SubmitEvent, useId, useState } from "react";

import { cn } from "@/shared/lib";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group";

import { useDebouncedValue } from "./use-debounced-value";
import { searchQueries } from "../api/search-queries";
import { MIN_QUERY_LENGTH } from "../model/suggestions";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export interface SearchBoxProps {
  readonly defaultQuery?: string;
  /** Runs a full search: the typed text, or the title of a picked suggestion. */
  readonly onSearch: (query: string) => void;
  readonly debounceMs?: number;
}

/**
 * Search as you type. Suggestions come from semantic search after the user
 * pauses; the previous list stays visible while the next one loads.
 */
export function SearchBox({
  defaultQuery = "",
  onSearch,
  debounceMs = 250,
}: SearchBoxProps) {
  const listId = useId();
  const [text, setText] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = useDebouncedValue(text.trim(), debounceMs);

  const { data, isPlaceholderData } = useQuery({
    ...searchQueries.suggestions(query),
    placeholderData: keepPreviousData,
  });
  const suggestions =
    open && query.length >= MIN_QUERY_LENGTH ? (data?.products ?? []) : [];
  const expanded = suggestions.length > 0;

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") return;
    setText(trimmed);
    setOpen(false);
    setActive(-1);
    onSearch(trimmed);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!expanded) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(
        (current) => (current + step + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const picked = suggestions[active];
    submit(picked ? picked.title : text);
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search products
      </label>
      <InputGroup className="h-10 bg-card">
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && active >= 0 ? `${listId}-${String(active)}` : undefined
          }
          autoComplete="off"
          placeholder="Search by what you need, e.g. a gift for a runner"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
        />
      </InputGroup>

      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          aria-busy={isPlaceholderData}
          className={cn(
            "absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover p-1 shadow-md transition-opacity",
            isPlaceholderData && "opacity-60",
          )}
        >
          {suggestions.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${String(index)}`}
              role="option"
              aria-selected={index === active}
              // Keep focus in the input so blur does not close the list first.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                submit(product.title);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent aria-selected:bg-accent"
            >
              <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-contain p-1 mix-blend-multiply dark:mix-blend-normal"
                />
              </span>
              <span className="min-w-0 flex-1 truncate">{product.title}</span>
              <span className="text-muted-foreground tabular-nums">
                {usd.format(product.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
