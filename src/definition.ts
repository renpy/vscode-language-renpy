// Definition Provider
"use strict";

import { Definition, Location, Position, TextDocument, Uri } from "vscode";
import { getKeywordPrefix } from "./extension";
import { rangeAsString } from "./navigation";
import { NavigationData } from "./navigationdata";
import { getFileWithPath, stripWorkspaceFromFile } from "./workspace";

export function getDefinition(document: TextDocument, position: Position): Definition | undefined {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
        return;
    }

    // check if this range is a semantic token
    const filename = stripWorkspaceFromFile(document.uri.path);
    const range_key = rangeAsString(filename, range);
    const navigation = NavigationData.gameObjects["semantic"][range_key];
    if (navigation) {
        const uri = Uri.file(getFileWithPath(navigation.filename));
        return new Location(uri, navigation.toRange());
    }

    const line = document.lineAt(position).text;
    if (!NavigationData.positionIsCleanForCompletion(line, new Position(position.line, range.start.character))) {
        return undefined;
    }

    let word = document.getText(range);
    if (range && position.character > 2) {
        const prefix = getKeywordPrefix(document, position, range);
        if (prefix) {
            word = `${prefix}.${word}`;
        }
    }

    let definitions: Definition = [];
    const locations = NavigationData.getNavigationDumpEntries(word);
    if (locations) {
        for (let location of locations) {
            if (location.filename !== "") {
                const uri = Uri.file(getFileWithPath(location.filename));
                definitions.push(new Location(uri, location.toRange()));
            }
        }
    }
    return definitions;
}
