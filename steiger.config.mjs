import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // Next.js routes live in root app/, outside the scanned src/. Steiger cannot
      // see references from them, so slices used only by routes look unused.
      "fsd/insignificant-slice": "warn",
    },
  },
]);
