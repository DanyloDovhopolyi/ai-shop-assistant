import { z } from "zod";

import { fetchJson, type FetchJsonOptions } from "@/shared/api";

import { ProductSchema } from "../model/product";
import type { ProductCatalog } from "../model/product-catalog";

/**
 * Wire format of https://dummyjson.com/products. Kept apart from the domain
 * schema so upstream naming (`thumbnail`) never leaks past this adapter.
 */
const DummyJsonProductSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number(),
    rating: z.number(),
    brand: z.string().optional(),
    thumbnail: z.string(),
  })
  .transform(({ thumbnail, ...rest }) => ({ ...rest, imageUrl: thumbnail }))
  .pipe(ProductSchema);

const DummyJsonListSchema = z
  .object({ products: z.array(DummyJsonProductSchema) })
  .transform(({ products }) => products);

const FIELDS = [
  "title",
  "description",
  "category",
  "price",
  "rating",
  "brand",
  "thumbnail",
];

export interface DummyJsonCatalogOptions extends Pick<
  FetchJsonOptions,
  "retries" | "timeoutMs"
> {
  readonly baseUrl?: string;
}

export function createDummyJsonProductCatalog({
  baseUrl = "https://dummyjson.com",
  ...fetchOptions
}: DummyJsonCatalogOptions = {}): ProductCatalog {
  // limit=0 disables upstream pagination: the catalog is small and filtered in-app.
  const url = `${baseUrl}/products?limit=0&select=${FIELDS.join(",")}`;

  return {
    list({ signal } = {}) {
      return fetchJson(url, DummyJsonListSchema, { ...fetchOptions, signal });
    },
  };
}
