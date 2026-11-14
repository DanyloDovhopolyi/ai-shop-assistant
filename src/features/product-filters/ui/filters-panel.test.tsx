import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FiltersPanel } from "./filters-panel";
import { DEFAULT_FILTERS, type ProductFilters } from "../model/product-filters";

const categories = ["laptops", "mobile-accessories", "smartphones"];

function setup(filters: ProductFilters = DEFAULT_FILTERS) {
  const onChange = vi.fn<(next: ProductFilters) => void>();
  render(
    <FiltersPanel
      filters={filters}
      categories={categories}
      onChange={onChange}
    />,
  );
  return { onChange, user: userEvent.setup() };
}

describe("FiltersPanel", () => {
  it("applies a category as soon as it is picked, keeping other filters", async () => {
    const { onChange, user } = setup({ ...DEFAULT_FILTERS, sort: "price-asc" });

    await user.selectOptions(
      screen.getByLabelText("Category"),
      "Mobile accessories",
    );

    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_FILTERS,
      sort: "price-asc",
      category: "mobile-accessories",
    });
  });

  it("applies a typed price only when the user confirms it", async () => {
    const { onChange, user } = setup();

    await user.type(screen.getByLabelText("Max price"), "150");
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_FILTERS,
      maxPrice: 150,
    });
  });

  it("removes a price bound when its field is cleared", async () => {
    const { onChange, user } = setup({ ...DEFAULT_FILTERS, minPrice: 20 });

    await user.clear(screen.getByLabelText("Min price"));
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_FILTERS);
  });

  it("resets every filter at once", async () => {
    const { onChange, user } = setup({
      category: "laptops",
      minRating: 4,
      sort: "rating-desc",
    });

    await user.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_FILTERS);
  });

  it("shows the current filters", () => {
    setup({
      category: "laptops",
      minPrice: 100,
      minRating: 4,
      sort: "price-desc",
    });

    expect(screen.getByLabelText("Category")).toHaveDisplayValue("Laptops");
    expect(screen.getByLabelText("Min price")).toHaveValue(100);
    expect(screen.getByLabelText("Minimum rating")).toHaveDisplayValue(
      "4+ stars",
    );
    expect(screen.getByLabelText("Sort by")).toHaveDisplayValue(
      "Price: high to low",
    );
  });
});
