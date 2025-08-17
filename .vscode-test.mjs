import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
    files: "tests/**/*.test.ts",
    workspaceFolder: ".",
    mocha: {
        ui: "bdd",
        timeout: 20000,
        require: ["ts-node/register", "tsconfig-paths/register"],
    },
    coverage: {
        reporter: ["text", "html", "lcov"],
        exclude: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/tests/**"],
    },
});
