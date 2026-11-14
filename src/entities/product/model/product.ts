import { z } from "zod";

export const ProductIdSchema = z.number().int().positive().brand<"ProductId">();
export type ProductId = z.infer<typeof ProductIdSchema>;

export const ProductSchema = z.object({
  id: ProductIdSchema,
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  brand: z.string().min(1).optional(),
  imageUrl: z.url(),
});
export type Product = z.infer<typeof ProductSchema>;

/** Distinct categories present in the catalog, alphabetically. */
export function listCategories(
  products: readonly Product[],
): readonly string[] {
  return [...new Set(products.map((product) => product.category))].sort();
}
