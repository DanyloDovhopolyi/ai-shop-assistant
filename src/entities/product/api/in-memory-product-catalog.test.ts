import { createInMemoryProductCatalog } from "./in-memory-product-catalog";
import { describeProductCatalogContract } from "./product-catalog.contract";

describeProductCatalogContract("in-memory", createInMemoryProductCatalog);
