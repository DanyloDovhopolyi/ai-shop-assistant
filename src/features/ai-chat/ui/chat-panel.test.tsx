import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { ProductFilters } from "@/entities/product";

import { filteringAnswer } from "@test/ai/ui-stream";
import { makeProduct } from "@test/fixtures/product";
import { server } from "@test/msw/server";
import { renderWithQuery } from "@test/react/render-with-query";

import { ChatPanel } from "./chat-panel";
import type { FilterResult, ProductPreview } from "../model/filter-result";

const budgetLaptop = makeProduct({
  id: 7,
  title: "Budget Laptop",
  category: "laptops",
  price: 900,
  imageUrl: "https://cdn.dummyjson.com/product-images/laptops/7.webp",
});

function previewOf({ id, title, category, price, rating }: ProductPreview) {
  return { id, title, category, price, rating };
}

const laptopsUnder1500: FilterResult = {
  filters: { category: "laptops", maxPrice: 1500, sort: "price-asc" },
  total: 3,
  preview: [previewOf(budgetLaptop)],
};

/** Serves product details and counts requests per id. */
function serveProducts() {
  const requests = new Map<string, number>();
  server.use(
    http.get("*/api/products/:id", ({ params }) => {
      const id = String(params.id);
      requests.set(id, (requests.get(id) ?? 0) + 1);
      return id === String(budgetLaptop.id)
        ? HttpResponse.json(budgetLaptop)
        : HttpResponse.json({ error: "Product not found" }, { status: 404 });
    }),
  );
  return requests;
}

function setup() {
  const onFiltersApplied = vi.fn<(filters: ProductFilters) => void>();
  renderWithQuery(<ChatPanel onFiltersApplied={onFiltersApplied} />);
  return { onFiltersApplied, user: userEvent.setup() };
}

async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("ChatPanel", () => {
  it("applies the filters the assistant chose and shows its answer", async () => {
    serveProducts();
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
    serveProducts();
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

  it("shows the matching products as cards with their photos", async () => {
    serveProducts();
    server.use(
      http.post("*/api/chat", () =>
        filteringAnswer(laptopsUnder1500, "One laptop fits."),
      ),
    );
    const { user } = setup();

    await ask(user, "cheap laptops");

    const card = await screen.findByRole("article", { name: "Budget Laptop" });
    expect(within(card).getByText("$900.00")).toBeInTheDocument();
    expect(
      await within(card).findByRole("img", { name: "Budget Laptop" }),
    ).toBeInTheDocument();
  });

  it("fetches a product once even when several answers show it", async () => {
    const requests = serveProducts();
    server.use(
      http.post("*/api/chat", () =>
        filteringAnswer(laptopsUnder1500, "Here it is."),
      ),
    );
    const { user } = setup();

    await ask(user, "cheap laptops");
    await screen.findByRole("img", { name: "Budget Laptop" });
    await ask(user, "same again");
    // findAll* resolves on the first match; wait until both answers have rendered.
    await waitFor(() => {
      expect(
        screen.getAllByRole("img", { name: "Budget Laptop" }),
      ).toHaveLength(2);
    });

    expect(requests.get(String(budgetLaptop.id))).toBe(1);
  });

  it("keeps a card readable when its details fail to load", async () => {
    serveProducts();
    const missing = { ...previewOf(budgetLaptop), id: 404, title: "Gone" };
    server.use(
      http.post("*/api/chat", () =>
        filteringAnswer(
          { ...laptopsUnder1500, preview: [missing] },
          "One result.",
        ),
      ),
    );
    const { user } = setup();

    await ask(user, "anything");

    const card = await screen.findByRole("article", { name: "Gone" });
    expect(await within(card).findByText("No photo")).toBeInTheDocument();
  });
});
