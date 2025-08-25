import { TabInputText, Uri, window } from "vscode";

/**
 * Retrieves the URIs of all open tabs that are text documents.
 *
 * This function iterates through all tab groups and their tabs in the current VS Code window.
 * It filters for tabs whose input is an instance of `TabInputText` and collects their URIs.
 *
 * @returns {Uri[]} An array of `Uri` objects, each representing an open text document tab.
 * @example
 * ```typescript
 * const openTextUris = getAllOpenTabInputTextUri();
 * console.log(`Found ${openTextUris.length} open text documents.`);
 * openTextUris.forEach(uri => console.log(uri.fsPath));
 * ```
 */
export function getAllOpenTabInputTextUri(): Uri[] {
    const uris: Uri[] = [];
    const tabGroups = window.tabGroups.all;
    const tabs = tabGroups.flatMap((group) => group.tabs.map((tab) => tab));
    tabs.forEach((tab) => {
        if (tab.input instanceof TabInputText) {
            uris.push(tab.input.uri);
        }
    });
    return uris;
}
