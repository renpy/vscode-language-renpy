// Find all References Provider
import { TextDocument, Position, ReferenceContext, Location, workspace, languages, CancellationToken } from "vscode";
import { getKeywordPrefix } from "./extension";
import { NavigationData } from "./navigation-data";

export const referencesProvider = languages.registerReferenceProvider("renpy", {
    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken) {
        if (token.isCancellationRequested) {
            return;
        }

        return await findAllReferences(document, position, context);
    },
});

/**
 * Returns an array of Locations that describe all matches for the keyword at the current position
 * @param document - The current text document
 * @param position - The current position
 * @param context - The current context
 * @returns An array of Locations that match the word at the current position in the current document
 */
export async function findAllReferences(document: TextDocument, position: Position, context: ReferenceContext): Promise<Location[] | null | undefined> {
    const range = document.getWordRangeAtPosition(position);
    let keyword = document.getText(range);
    if (!keyword) {
        return undefined;
    }

    if (range) {
        const prefix = getKeywordPrefix(document, position, range);
        if (prefix && prefix !== "store") {
            keyword = `${prefix}.${keyword}`;
        }
    }

    const references: Location[] = [];
    const files = await workspace.findFiles("**/*.rpy");
    if (files && files.length > 0) {
        for (const file of files) {
            const textDocument = await workspace.openTextDocument(file);
            const locations = findReferenceMatches(keyword, textDocument);
            if (locations) {
                for (const l of locations) {
                    references.push(l);
                }
            }
        }
    }

    return references;
}

/**
 * Returns a list of locations for the given document where they keyword is found
 * @param keyword - The keyword to search for
 * @param document - The TextDocument to search
 * @returns An array of Locations that match the keyword in the given document
 */
export function findReferenceMatches(keyword: string, document: TextDocument): Location[] {
    const locations: Location[] = [];
    const rx = RegExp(`[^a-zA-Z_](${keyword.replace(".", "/.")})[^a-zA-Z_]`, "g");

    let index = 0;
    while (index < document.lineCount) {
        const line = NavigationData.filterStringLiterals(document.lineAt(index).text);
        const matches = rx.exec(line);
        if (matches) {
            const position = new Position(index, matches.index);
            const loc = new Location(document.uri, position);
            locations.push(loc);
        }
        index++;
    }

    return locations;
}
