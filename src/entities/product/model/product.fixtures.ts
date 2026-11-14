import { type Product, ProductSchema } from "./product";

/** Builds a valid domain product for tests; override only what the test is about. */
export function makeProduct(
  overrides: Partial<Record<keyof Product, unknown>> = {},
): Product {
  return ProductSchema.parse({
    id: 1,
    title: "Wireless Headphones",
    description: "Over-ear, noise cancelling.",
    category: "mobile-accessories",
    price: 99.99,
    rating: 4.5,
    brand: "Acme",
    imageUrl: "https://cdn.dummyjson.com/product-images/headphones/1.webp",
    ...overrides,
  });
}
