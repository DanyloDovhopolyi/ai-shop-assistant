import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeProduct } from "@test/fixtures/product";
import { server } from "@test/msw/server";
import { renderWithQuery } from "@test/react/render-with-query";

import { SearchBox } from "./search-box";

const beats = makeProduct({ id: 2, title: "Beats Flex", price: 49 });
const airpods = makeProduct({ id: 1, title: "AirPods", price: 129 });

function suggestion({ id, title, category, price, imageUrl }: typeof beats) {
  return { id, title, category, price, imageUrl };
}

/** Serves suggestions per query and records which queries reached the server. */
function serveSearch(
  answers: Record<string, (typeof beats)[]>,
  { slow = new Set<string>() } = {},
) {
  const queries: string[] = [];
  server.use(
    http.get("*/api/search", async ({ request }) => {
      const query = new URL(request.url).searchParams.get("q") ?? "";
      queries.push(query);
      if (slow.has(query)) await delay(300);
      return HttpResponse.json({
        query,
        products: (answers[query] ?? []).map(suggestion),
      });
    }),
  );
  return queries;
}

function setup() {
  const onSearch = vi.fn<(query: string) => void>();
  renderWithQuery(<SearchBox onSearch={onSearch} debounceMs={50} />);
  return { onSearch, user: userEvent.setup() };
}

describe("SearchBox", () => {
  it("asks the server once the user stops typing, not on every key", async () => {
    const queries = serveSearch({ headphones: [beats, airpods] });
    const { user } = setup();

    await user.type(screen.getByRole("combobox"), "headphones");

    expect(
      await screen.findByRole("option", { name: /Beats Flex/ }),
    ).toBeInTheDocument();
    expect(queries).toEqual(["headphones"]);
  });

  it("keeps the previous suggestions on screen while the next ones load", async () => {
    serveSearch(
      { phones: [airpods], "phones wireless": [beats] },
      { slow: new Set(["phones wireless"]) },
    );
    const { user } = setup();
    const input = screen.getByRole("combobox");

    await user.type(input, "phones");
    await screen.findByRole("option", { name: /AirPods/ });
    await user.type(input, " wireless");

    // The slow answer has not arrived yet; the old list stays instead of flashing empty.
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(screen.getByRole("option", { name: /AirPods/ })).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: /Beats Flex/ }),
    ).toBeInTheDocument();
  });

  it("searches for the highlighted suggestion when picked with the keyboard", async () => {
    serveSearch({ headphones: [beats, airpods] });
    const { onSearch, user } = setup();

    await user.type(screen.getByRole("combobox"), "headphones");
    await screen.findByRole("option", { name: /Beats Flex/ });
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSearch).toHaveBeenCalledExactlyOnceWith("AirPods");
  });

  it("searches for the typed text on Enter", async () => {
    serveSearch({});
    const { onSearch, user } = setup();

    await user.type(screen.getByRole("combobox"), "  warm gift {Enter}");

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledExactlyOnceWith("warm gift");
    });
  });
});
