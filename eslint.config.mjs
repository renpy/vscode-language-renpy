import { defineConfig } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([
    {
        ignores: [
            // Ignore all generated typescript files
            "**/*.g.ts",
        ],
    },
    ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "no-duplicate-imports": "error",
            "no-self-compare": "error",
            "no-unused-private-class-members": "warn",
            eqeqeq: "warn",
            "no-shadow": "warn",
            "prefer-regex-literals": "warn",
            "require-await": "warn",
            camelcase: "error",
            "no-invalid-regexp": "off",
            "@typescript-eslint/no-var-requires": "warn",
            "no-param-reassign": "warn",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
]);
