"use client";

import { ChatPanel } from "@/features/ai-chat";
import { useFiltersNavigation } from "@/features/product-filters";

/**
 * Connects two slices that must not import each other: the chat reports the
 * filters it applied, and the filters slice writes them to the URL.
 */
export function ShopAssistant() {
  const { navigate } = useFiltersNavigation();
  return <ChatPanel onFiltersApplied={navigate} />;
}
