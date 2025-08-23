// Provider for Go To Definition
import { CancellationToken, Definition, languages, Location, Position, TextDocument, Uri } from "vscode";

import { getKeywordPrefix } from "./extension";
import { rangeAsString } from "./navigation";
import { NavigationData } from "./navigation-data";
import { getFileWithPath, stripWorkspaceFromFile } from "./workspace";

export function registerDefinitionProvider() {
    return languages.registerDefinitionProvider("renpy", {
        async provideDefinition(document: TextDocument, position: Position, token: CancellationToken) {
            if (token.isCancellationRequested) {
                return;
            }

            return Promise.resolve(getDefinition(document, position));
        },
    });
}

export function getDefinition(document: TextDocument, position: Position): Definition | undefined {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
        return undefined;
    }

    // check if this range is a semantic token
    const filename = stripWorkspaceFromFile(document.uri.path);
    const rangeKey = rangeAsString(filename, range);
    const navigation = NavigationData.gameObjects["semantic"][rangeKey];
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

    const definitions: Definition = [];
    const locations = NavigationData.getNavigationDumpEntries(word);

    locations?.forEach((location) => {
        if (location.filename !== "") {
            const uri = Uri.file(getFileWithPath(location.filename));
            definitions.push(new Location(uri, location.toRange()));
        }
    });

    return definitions;
}
