import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@vscode/test-cli";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    files: "tests/**/*.test.ts",
    workspaceFolder: ".",
    mocha: {
        ui: "bdd",
        timeout: 20000,
        require: ["ts-node/register", "tsconfig-paths/register"],
        reporter: join(__dirname, "MochaCompositeReporter.js"),
        reporterOptions: {
            spec: {},
            json: {
                output: join(__dirname, "vscode-language-renpy-test-results.json"),
            },
            junit: {
                mochaFile: join(__dirname, "vscode-language-renpy-test-results.xml"),
            },
        },
    },
    coverage: {
        reporter: ["text", "html", "lcov"],
        exclude: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/tests/**"],
    },
});
