export {
  createDummyJsonProductCatalog,
  type DummyJsonCatalogOptions,
} from "./api/dummyjson-product-catalog";
export { createInMemoryProductCatalog } from "./api/in-memory-product-catalog";
export {
  listCategories,
  type Product,
  type ProductId,
  ProductIdSchema,
  ProductSchema,
} from "./model/product";
export type { ProductCatalog } from "./model/product-catalog";
export { ProductCard } from "./ui/product-card";
export { ProductGrid, ProductGridSkeleton } from "./ui/product-grid";
