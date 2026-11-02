import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist",
      "**/coverage",
      "apps/web/src/routeTree.gen.ts",
      "apps/web/dev-dist",
      "packages/data-client/src/generated",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      curly: ["error", "all"],
      "id-length": ["error", { min: 2, exceptions: ["_"], properties: "never" }],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
        { blankLine: "always", prev: "block-like", next: "*" },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["packages/**/*.{ts,mjs}", "apps/api/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["apps/api/src/recipe-book/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fastify", "@fastify/*", "../*"],
              message: "The web app imports recipe-book, so keep it free of server code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/gear-optimizer/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fastify", "@fastify/*", "@squire/*"],
              message: "The web app runs the gear optimizer in the browser, so keep it free of server code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
    },
  },
  {
    files: ["apps/web/src/components/ui/**"],
    rules: { "padding-line-between-statements": "off", "id-length": "off" },
  },
  {
    files: ["apps/web/src/components/ui/**", "apps/web/src/contexts/**", "apps/web/src/routes/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
);
