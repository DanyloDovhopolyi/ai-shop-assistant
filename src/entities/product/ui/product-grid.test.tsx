import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";

import { makeProduct } from "@test/fixtures/product";

import { ProductGrid } from "./product-grid";

it("shows each product with its name, price, and rating", () => {
  render(
    <ProductGrid
      products={[
        makeProduct({ id: 1, title: "Phone", price: 1299.5, rating: 4.25 }),
        makeProduct({ id: 2, title: "Case", price: 9, rating: 3 }),
      ]}
    />,
  );

  const list = screen.getByRole("list", { name: "Products" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);

  const phone = within(list).getByRole("article", { name: "Phone" });
  expect(within(phone).getByText("$1,299.50")).toBeInTheDocument();
  expect(
    within(phone).getByLabelText("Rated 4.3 out of 5"),
  ).toBeInTheDocument();
});
