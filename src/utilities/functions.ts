import { TabInputText, Uri, window } from "vscode";

/**
 * Gets the URIs of the tabs opened in the editor whose input is of type TabInputText.
 * @returns An array of URIs
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
