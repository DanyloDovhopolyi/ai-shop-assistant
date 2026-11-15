import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { ProductFilters } from "@/entities/product";

import { filteringAnswer } from "@test/ai/ui-stream";
import { server } from "@test/msw/server";

import { ChatPanel } from "./chat-panel";
import type { FilterResult } from "../model/filter-result";

const laptopsUnder1500: FilterResult = {
  filters: { category: "laptops", maxPrice: 1500, sort: "price-asc" },
  total: 3,
  preview: [],
};

function setup() {
  const onFiltersApplied = vi.fn<(filters: ProductFilters) => void>();
  render(<ChatPanel onFiltersApplied={onFiltersApplied} />);
  return { onFiltersApplied, user: userEvent.setup() };
}

async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("ChatPanel", () => {
  it("applies the filters the assistant chose and shows its answer", async () => {
    server.use(
      http.post("*/api/chat", () =>
        filteringAnswer(laptopsUnder1500, "Three laptops fit."),
      ),
    );
    const { onFiltersApplied, user } = setup();

    await ask(user, "cheap laptops");

    expect(await screen.findByText("Three laptops fit.")).toBeInTheDocument();
    expect(screen.getByText("up to $1500")).toBeInTheDocument();
    expect(onFiltersApplied).toHaveBeenCalledExactlyOnceWith(
      laptopsUnder1500.filters,
    );
  });

  it("tells the user to wait on a rate limit and recovers on retry", async () => {
    let calls = 0;
    server.use(
      http.post("*/api/chat", () =>
        ++calls === 1
          ? HttpResponse.text("Too many requests", { status: 429 })
          : filteringAnswer(laptopsUnder1500, "Back again."),
      ),
    );
    const { onFiltersApplied, user } = setup();

    await ask(user, "laptops");
    expect(await screen.findByRole("alert")).toHaveTextContent(/wait/i);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Back again.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onFiltersApplied).toHaveBeenCalledOnce();
  });
});
