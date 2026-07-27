import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import requireInputValidation from "./eslint-rules/require-input-validation.js";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.wrangler/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        console: "readonly",
        process: "readonly",
        document: "readonly",
        window: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        URL: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      "no-undef": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["worker/src/**/*.ts"],
    plugins: {
      gr33t: { rules: { "require-input-validation": requireInputValidation } },
    },
    rules: {
      "gr33t/require-input-validation": "error",
    },
  },
  {
    files: ["worker/src/validate.ts", "worker/src/uploads.ts"],
    rules: {
      "gr33t/require-input-validation": "off",
    },
  },
];
