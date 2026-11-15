import type { ReactNode } from "react";

import type { ProductId } from "@/entities/product";

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
    { label: "Category", value: (p) => p.category },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="-mx-1 overflow-x-auto px-1">
        <table
          aria-label="Product comparison"
          className="w-full table-fixed border-collapse text-xs"
          // Columns share the width evenly; past 3 products the table scrolls.
          style={{ minWidth: `${String(4 + products.length * 4.5)}rem` }}
        >
          <thead>
            <tr>
              <td className="w-16" />
              {products.map((product) => (
                <th
                  key={product.id}
                  scope="col"
                  className="p-1 text-left align-top font-medium"
                >
                  <div className="mb-1 overflow-hidden rounded-md">
                    <ProductPhoto
                      id={product.id}
                      title={product.title}
                      sizes="96px"
                    />
                  </div>
                  <span className="line-clamp-2">{product.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-t border-zinc-200 dark:border-zinc-700"
              >
                <th
                  scope="row"
                  className="p-1 text-left font-normal text-zinc-500"
                >
                  {row.label}
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-1">
                    {row.value(product)}
                    {row.best?.includes(product.id) && (
                      <span className="mt-0.5 block w-fit rounded bg-emerald-100 px-1 text-[10px] text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        Best
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notFound.length > 0 && (
        <p className="text-xs text-zinc-500">
          {notFound.length === 1
            ? "One product was not found."
            : `${String(notFound.length)} products were not found.`}
        </p>
      )}
    </div>
  );
}
