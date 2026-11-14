import { ProductIdSchema } from "@/entities/product";

import { getCatalog } from "../../../_lib/catalog";

/** One product from the cached catalog, for client-side detail queries. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/products/[id]">,
): Promise<Response> {
  const id = ProductIdSchema.safeParse(Number((await params).id));
  if (!id.success) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  const product = (await getCatalog()).find((item) => item.id === id.data);
  return product
    ? Response.json(product)
    : Response.json({ error: "Product not found" }, { status: 404 });
}
