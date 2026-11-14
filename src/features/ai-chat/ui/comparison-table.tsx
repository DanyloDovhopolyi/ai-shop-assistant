import type { ReactNode } from "react";

import { formatCategory, type ProductId } from "@/entities/product";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

import { ProductPhoto } from "./product-photo";
import { usd } from "./usd";
import type { ComparedProduct, Comparison } from "../model/comparison";

interface Row {
  readonly label: string;
  readonly value: (product: ComparedProduct) => ReactNode;
  readonly best?: readonly ProductId[];
}

/** Products as columns, attributes as rows; the best value per row is marked. */
export function ComparisonTable({
  comparison,
}: {
  readonly comparison: Comparison;
}) {
  const { products, notFound, cheapest, bestRated } = comparison;
  const rows: readonly Row[] = [
    { label: "Price", value: (p) => usd.format(p.price), best: cheapest },
    {
      label: "Rating",
      value: (p) => `★ ${p.rating.toFixed(1)}`,
      best: bestRated,
    },
    { label: "Brand", value: (p) => p.brand ?? "—" },
    { label: "Category", value: (p) => formatCategory(p.category) },
  ];

  return (
    <div className="flex flex-col gap-1">
      <Table
        aria-label="Product comparison"
        className="table-fixed text-xs"
        // Columns share the width evenly; past 3 products the table scrolls.
        style={{ minWidth: `${String(4 + products.length * 4.5)}rem` }}
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableCell className="w-16" />
            {products.map((product) => (
              <TableHead
                key={product.id}
                scope="col"
                className="h-auto px-1.5 pb-2 align-top font-medium whitespace-normal"
              >
                <div className="mb-1.5 overflow-hidden rounded-md border">
                  <ProductPhoto
                    id={product.id}
                    title={product.title}
                    sizes="96px"
                  />
                </div>
                <span className="line-clamp-2 leading-snug">
                  {product.title}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label} className="hover:bg-transparent">
              <TableHead
                scope="row"
                className="h-auto px-1.5 py-2 font-normal text-muted-foreground"
              >
                {row.label}
              </TableHead>
              {products.map((product) => (
                <TableCell
                  key={product.id}
                  className="px-1.5 py-2 whitespace-normal tabular-nums"
                >
                  {row.value(product)}
                  {row.best?.includes(product.id) && (
                    <span className="mt-0.5 block w-fit rounded bg-best-soft px-1 text-[10px] font-medium text-best">
                      Best
                    </span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {notFound.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {notFound.length === 1
            ? "One product was not found."
            : `${String(notFound.length)} products were not found.`}
        </p>
      )}
    </div>
  );
}
