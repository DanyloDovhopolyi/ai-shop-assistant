import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Evals call the real model, so they are slow, cost quota, and are not
 * deterministic: they run on their own (`npm run evals`), never in `npm test`.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Outside Next.js, the "server-only" guard would throw on import.
    alias: {
      "server-only": new URL("./test/stubs/empty.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    // Locally the key comes from .env; in CI from the environment (a repo secret).
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 15 * 60 * 1000,
  },
});
