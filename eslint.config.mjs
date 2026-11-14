import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

// Relative imports stay inside a slice (`./`, `../model`). Anything further uses an alias.
const leaveSliceByAlias = {
  group: ["../../*"],
  message:
    "Import across slices or into test/ through an alias: @/<layer>/<slice> or @test/*.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "no-restricted-imports": ["error", { patterns: [leaveSliceByAlias] }],
      // Catches a slice importing its own public API (index.ts), which is a cycle.
      "import/no-cycle": "error",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            { pattern: "@/**", group: "internal" },
            { pattern: "@test/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Business logic stays framework-free: see docs/ARCHITECTURE.md "Layers inside a slice".
    files: ["src/**/model/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            leaveSliceByAlias,
            {
              group: [
                "react",
                "react-dom",
                "next",
                "next/*",
                "ai",
                "@ai-sdk/*",
              ],
              message:
                "model/ is framework-free. Move this code to ui/ or api/.",
            },
            {
              group: ["**/ui", "**/ui/*", "**/api", "**/api/*"],
              message:
                "model/ must not depend on ui/ or api/. Dependencies point at model.",
            },
          ],
        },
      ],
    },
  },
  // Must be last: turns off ESLint rules that conflict with Prettier formatting.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    ".vitest/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
