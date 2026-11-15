import { createInMemoryProductCatalog } from "@/entities/product";

import { createKeywordProductSearch } from "./keyword-product-search";
import { describeProductSearchContract } from "./product-search.contract";
import { withFallback } from "../model/fallback-search";

// During an outage the combined search must still behave like any ProductSearch.
describeProductSearchContract(
  "semantic search falling back to keywords",
  (products) =>
    withFallback(
      { search: () => Promise.reject(new Error("vector database is down")) },
      createKeywordProductSearch({
        catalog: createInMemoryProductCatalog(products),
      }),
    ),
);
