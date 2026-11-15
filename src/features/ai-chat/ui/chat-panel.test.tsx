import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { ProductFilters } from "@/entities/product";

import { filteringAnswer, toolAnswer } from "@test/ai/ui-stream";
import { makeProduct } from "@test/fixtures/product";
import { server } from "@test/msw/server";
import { renderWithQuery } from "@test/react/render-with-query";

import { ChatPanel } from "./chat-panel";
import type { Comparison } from "../model/comparison";
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

const proLaptop = makeProduct({
  id: 8,
  title: "Pro Laptop",
  category: "laptops",
  brand: "Acme",
  price: 2400,
  rating: 4.9,
});

const budgetVsPro: Comparison = {
  products: [budgetLaptop, proLaptop].map(
    ({ id, title, category, brand, price, rating }) => ({
      id,
      title,
      category,
      price,
      rating,
      ...(brand === undefined ? {} : { brand }),
    }),
  ),
  notFound: [],
  cheapest: [budgetLaptop.id],
  bestRated: [proLaptop.id],
};

/** Serves product details and counts requests per id. */
function serveProducts() {
  const requests = new Map<string, number>();
  server.use(
    http.get("*/api/products/:id", ({ params }) => {
      const id = String(params.id);
      requests.set(id, (requests.get(id) ?? 0) + 1);
      const product = [budgetLaptop, proLaptop].find(
        (item) => String(item.id) === id,
      );
      return product
        ? HttpResponse.json(product)
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

  it("shows a comparison as a table and marks the best value in each row", async () => {
    serveProducts();
    server.use(
      http.post("*/api/chat", () =>
        toolAnswer("compareProducts", budgetVsPro, "The Pro is rated higher."),
      ),
    );
    const { user } = setup();

    await ask(user, "compare them");

    const table = await screen.findByRole("table", {
      name: "Product comparison",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Budget Laptop", "Pro Laptop"]);
    const [budgetPrice, proPrice] = within(
      within(table).getByRole("row", { name: /^Price/ }),
    ).getAllByRole("cell");
    expect(budgetPrice).toHaveTextContent("Best");
    expect(proPrice).not.toHaveTextContent("Best");
    const [budgetRating, proRating] = within(
      within(table).getByRole("row", { name: /^Rating/ }),
    ).getAllByRole("cell");
    expect(budgetRating).not.toHaveTextContent("Best");
    expect(proRating).toHaveTextContent("Best");
  });

  it("reuses the photo a chat card already loaded for the same product", async () => {
    const requests = serveProducts();
    let calls = 0;
    server.use(
      http.post("*/api/chat", () =>
        ++calls === 1
          ? filteringAnswer(laptopsUnder1500, "One laptop fits.")
          : toolAnswer("compareProducts", budgetVsPro, "Compared."),
      ),
    );
    const { user } = setup();

    await ask(user, "cheap laptops");
    await screen.findByRole("img", { name: "Budget Laptop" });
    await ask(user, "compare with the pro");
    const table = await screen.findByRole("table");
    await within(table).findByRole("img", { name: "Pro Laptop" });

    expect(requests.get(String(budgetLaptop.id))).toBe(1);
    expect(requests.get(String(proLaptop.id))).toBe(1);
  });

  it("shows what a search found as cards, with the query it searched for", async () => {
    serveProducts();
    server.use(
      http.post("*/api/chat", () =>
        toolAnswer(
          "searchProducts",
          { query: "laptop for travel", products: [previewOf(budgetLaptop)] },
          "The Budget Laptop is light.",
        ),
      ),
    );
    const { onFiltersApplied, user } = setup();

    await ask(user, "something light to work on the road");

    const results = await screen.findByRole("list", { name: "Search results" });
    expect(
      within(results).getByRole("article", { name: "Budget Laptop" }),
    ).toBeInTheDocument();
    expect(screen.getByText("laptop for travel")).toBeInTheDocument();
    // A search answers in the chat; it does not change the catalog filters.
    expect(onFiltersApplied).not.toHaveBeenCalled();
  });

  it("shows under the hood which tool ran, with what input, and what it cost", async () => {
    serveProducts();
    server.use(
      http.post("*/api/chat", () =>
        toolAnswer("filterProducts", laptopsUnder1500, "Three laptops fit.", {
          input: { category: "laptops", maxPrice: 1500 },
          metadata: {
            model: "gemini-test",
            durationMs: 1840,
            inputTokens: 812,
            outputTokens: 40,
          },
        }),
      ),
    );
    const { user } = setup();

    await ask(user, "laptops under 1500");
    await user.click(
      await screen.findByRole("button", { name: /under the hood/i }),
    );

    expect(screen.getByText("gemini-test")).toBeInTheDocument();
    expect(screen.getByText("812 in, 40 out")).toBeInTheDocument();
    expect(screen.getByText("filterProducts")).toBeInTheDocument();
    expect(
      screen.getByText('{"category":"laptops","maxPrice":1500}'),
    ).toBeInTheDocument();
  });
});
