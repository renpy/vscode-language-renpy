import path from "node:path";
import { fileURLToPath } from "node:url";

import { includeIgnoreFile } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig([
    includeIgnoreFile(gitignorePath, "Imported .gitignore patterns"),
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
            import: importPlugin,
            "simple-import-sort": simpleImportSort,
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
            eqeqeq: ["warn", "smart"],
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

            // Import sorting and organization rules
            "simple-import-sort/imports": [
                "error",
                {
                    groups: [
                        // Side effect imports
                        ["^\\u0000"],
                        // Node.js builtins prefixed with `node:`
                        ["^node:"],
                        // Packages (things that start with a letter, digit, underscore, or `@` followed by a letter)
                        ["^@?\\w"],
                        // Internal packages (absolute imports from src)
                        ["^src/"],
                        // Parent imports (../)
                        ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
                        // Other relative imports (./)
                        ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
                        // Style imports
                        ["^.+\\.s?css$"],
                    ],
                },
            ],
            "simple-import-sort/exports": "error",
            "import/first": "error",
            "import/newline-after-import": "error",
            "import/no-duplicates": "error",
            "import/no-unresolved": "off", // TypeScript handles this
            "import/order": "off", // Using simple-import-sort instead
        },
    },
    {
        files: ["tests/**/*.ts"],
        rules: {
            "no-unused-expressions": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
]);
