"use client";

import { MessageCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { ProductFilters } from "@/entities/product";
import { ChatPanel } from "@/features/ai-chat";
import { useFiltersNavigation } from "@/features/product-filters";
import { cn } from "@/shared/lib";

// Written out in full so Tailwind finds and generates them.
const SCROLL_LOCK = ["max-lg:overflow-hidden", "max-lg:overscroll-none"];

/**
 * Connects two slices that must not import each other: the chat reports the
 * filters it applied, and the filters slice writes them to the URL.
 *
 * Desktop: a column beside the catalog. Small screens: a bottom sheet, so the
 * catalog keeps the screen. One ChatPanel instance serves both, so closing the
 * sheet never loses the conversation.
 */
export function ShopAssistant() {
  const { applyFromAssistant, searchFor } = useFiltersNavigation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.getElementById("chat-input")?.focus();
    // The sheet is modal: freeze the catalog behind it. The class is scoped to
    // small screens, so widening the window past the breakpoint scrolls again.
    const root = document.documentElement;
    root.classList.add(...SCROLL_LOCK);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      root.classList.remove(...SCROLL_LOCK);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const onFiltersApplied = (filters: ProductFilters) => {
    applyFromAssistant(filters);
    // On a phone the answer is the catalog itself: get out of its way.
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-2.5 rounded-full bg-primary px-5 py-3.5 text-left text-primary-foreground shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:hidden"
      >
        <MessageCircleIcon aria-hidden className="size-5" />
        <span className="font-medium">Ask the assistant</span>
      </button>

      {open && (
        <div
          aria-hidden
          onClick={() => {
            setOpen(false);
          }}
          className="fixed inset-0 z-40 bg-foreground/30 motion-safe:animate-in motion-safe:fade-in lg:hidden"
        />
      )}

      <div
        className={cn(
          "h-full",
          // Small screens: a sheet that slides up. `invisible` also takes the
          // closed sheet out of the tab order and the accessibility tree.
          "motion-reduce:transition-none max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:h-[85dvh] max-lg:p-2 max-lg:transition-[translate,visibility] max-lg:duration-300",
          !open && "max-lg:invisible max-lg:translate-y-full",
        )}
      >
        <ChatPanel
          onFiltersApplied={onFiltersApplied}
          onSearchInstead={(query) => {
            searchFor(query);
            setOpen(false);
          }}
          onClose={() => {
            setOpen(false);
          }}
        />
      </div>
    </>
  );
}
