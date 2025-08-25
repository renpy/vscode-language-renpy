import { expect } from "chai";
import vscode from "vscode";

import { getAllOpenTabInputTextUri } from "src/utilities/vscode-window";

describe("vscode-window", () => {
    describe("getAllOpenTabInputTextUri", () => {
        /**
         * Opens a specified number of new text editor tabs.
         * @param count The number of tabs to open.
         * @returns A promise that resolves when all tabs are opened.
         */
        const openNewTabs = async (count: number) =>
            await Promise.all(
                new Array(count).fill(null).map(async (_, i) => {
                    const document = await vscode.workspace.openTextDocument({
                        content: `Sample text content ${i + 1}`,
                        language: "plaintext",
                    });
                    await vscode.window.showTextDocument(document);
                })
            );

        /**
         * Closes all tab groups in the editor.
         * @returns A promise that resolves when all tab groups are closed.
         */
        const closeAllTabGroups = async () =>
            await Promise.all(
                vscode.window.tabGroups.all.map(async (group) => {
                    await vscode.window.tabGroups.close(group);
                })
            );

        it("should return array of URIs", async () => {
            await openNewTabs(1);

            // In VS Code test environment, we can call the actual function
            const result = getAllOpenTabInputTextUri();

            // The result should be an array
            expect(result).to.be.an("array");
            expect(result).to.have.lengthOf(1);

            // Each element should have URI-like properties
            result.forEach((uri) => {
                expect(uri).to.have.property("scheme");
                expect(uri).to.have.property("path");
            });
            // Clean up by closing all tabs
            await closeAllTabGroups();
        });

        it("should return empty array when no text tabs are open", () => {
            // This test verifies the function handles the case where no text documents are open
            const result = getAllOpenTabInputTextUri();

            // The result should always be an array (may be empty)
            expect(result).to.be.an("array");
            expect(result).to.have.lengthOf(0);
        });

        it("should filter only TabInputText instances", async () => {
            // Open regular text tabs
            await openNewTabs(3);

            // Open a non-text tab (WebviewPanel)
            const webviewPanel = vscode.window.createWebviewPanel("testWebview", "Test Webview", vscode.ViewColumn.Beside, {});

            // This test verifies that only text document tabs are included
            const result = getAllOpenTabInputTextUri();

            // Should only include the 3 text tabs, not the webview
            expect(result).to.have.lengthOf(3);

            // All returned URIs should be from text document tabs
            result.forEach((uri) => {
                expect(uri).to.have.property("scheme");
                expect(uri).to.have.property("path");
                expect(uri).to.have.property("fsPath");
            });

            // Clean up the webview
            webviewPanel.dispose();
            await closeAllTabGroups();
        });
    });
});
