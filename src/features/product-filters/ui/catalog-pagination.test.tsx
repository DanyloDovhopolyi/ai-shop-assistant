import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogPagination } from "./catalog-pagination";
import { DEFAULT_FILTERS } from "../model/product-filters";

const filters = { ...DEFAULT_FILTERS, category: "laptops" };

describe("CatalogPagination", () => {
  it("links to the neighbouring pages without losing filters", () => {
    render(<CatalogPagination filters={filters} page={2} pageCount={3} />);

    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "?category=laptops",
    );
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "?category=laptops&page=3",
    );
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("offers no way past the first or last page", () => {
    const { rerender } = render(
      <CatalogPagination filters={filters} page={1} pageCount={3} />,
    );
    expect(
      screen.queryByRole("link", { name: "Previous page" }),
    ).not.toBeInTheDocument();

    rerender(<CatalogPagination filters={filters} page={3} pageCount={3} />);
    expect(
      screen.queryByRole("link", { name: "Next page" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <CatalogPagination filters={filters} page={1} pageCount={1} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
