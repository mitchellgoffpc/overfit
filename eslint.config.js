import { URL } from "node:url";

import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import a11yPlugin from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const projectConfigs = ["./frontend/tsconfig.eslint.json", "./backend/tsconfig.eslint.json", "./packages/types/tsconfig.eslint.json"];

const baseRules = {
  ...(eslint.configs.recommended.rules ?? {}),
  ...tseslint.configs["strict-type-checked"].rules,
  ...tseslint.configs["stylistic-type-checked"].rules,
  ...reactPlugin.configs["recommended"].rules,
  ...reactPlugin.configs["jsx-runtime"].rules,
  ...reactHooksPlugin.configs["recommended"].rules,
};

const additionalRules = {
  "@typescript-eslint/consistent-type-exports": ["error", { "fixMixedExportsWithInlineTypeSpecifier": true }],
  "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
  "@typescript-eslint/no-shadow": "error",
  "@typescript-eslint/prefer-readonly": "error",
  "@typescript-eslint/switch-exhaustiveness-check": "error",
  "@typescript-eslint/no-use-before-define": "error",
  "@typescript-eslint/method-signature-style": "error",
  "@typescript-eslint/explicit-module-boundary-types": "error",
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/no-useless-empty-export": "error",
  "@typescript-eslint/promise-function-async": "error",
  "@typescript-eslint/require-array-sort-compare": "error",
  "@typescript-eslint/strict-void-return": "error",
  "import/first": "error",
  "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  "import/no-extraneous-dependencies": ["error", { "packageDir": [".", "./frontend", "./backend", "./packages/types"] }],
  "import/newline-after-import": "error",
  "import/no-duplicates": "error",
  "import/no-unresolved": "error",
  "import/no-cycle": "error",
  "import/order": [
    "error",
    {
      "alphabetize": { "order": "asc", "caseInsensitive": true },
      "newlines-between": "always"
    }
  ],
  "no-restricted-imports": [
    "error",
    {
      "patterns": ["./*", "../*"]
    }
  ],
  "curly": "error",
  "eqeqeq": "error",
  "no-console": "warn",
  "no-multi-spaces": "error",
  "no-trailing-spaces": "error",
  "object-curly-spacing": ["error", "always"],
  "react/jsx-boolean-value": ["error", "never"],
  "react/jsx-no-constructed-context-values": "error",
  "react/jsx-no-useless-fragment": "error",
  "react/jsx-no-leaked-render": "error",
  "react/jsx-fragments": ["error", "syntax"],
  "react/jsx-pascal-case": "error",
  "react/hook-use-state": "error",
  "react/iframe-missing-sandbox": "error",
  "react/no-array-index-key": "error",
  "react/no-access-state-in-setstate": "error",
  "react/no-this-in-sfc": "error",
  "react/no-unstable-nested-components": "error",
  "react/prefer-read-only-props": "error",
  "react/self-closing-comp": "error",
  "jsx-a11y/alt-text": "error",
  "jsx-a11y/anchor-is-valid": "error",
};

const overrideRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "destructuredArrayIgnorePattern": "^_"
    }
  ],
}

const duplicateRules = Object.keys(additionalRules).filter((rule) => Object.prototype.hasOwnProperty.call(baseRules, rule));

if (duplicateRules.length > 0) {
  throw new Error(`Manual ESLint rules duplicate base configs: ${duplicateRules.join(", ")}`);
}

export default [
  eslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"] ,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: projectConfigs,
        tsconfigRootDir: new URL(".", import.meta.url).pathname
      },
      ecmaVersion: "latest",
      sourceType: "module"
    },
    settings: {
      react: {
        version: "detect"
      },
      "import/resolver": {
        typescript: {
          noWarnOnMultipleProjects: true,
          project: projectConfigs
        }
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": a11yPlugin,
    },
    rules: {
      ...baseRules,
      ...additionalRules,
      ...overrideRules,
    }
  },
  {
    files: ["frontend/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ["backend/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off"
    }
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off"
    }
  },
  {
    files: ["**/*.config.{ts,js}", "**/vite.config.ts", "**/vitest.config.ts", "vitest.workspace.ts", "eslint.config.js"],
    ...tseslint.configs["flat/disable-type-checked"],
  }
];
