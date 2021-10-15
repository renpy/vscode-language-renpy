// Document Symbol (Outline) Provider
'use strict';

import { TextDocument, DocumentSymbol, Uri, Range, SymbolKind } from "vscode";
import { NavigationData } from "./navigationdata";
import { stripWorkspaceFromFile } from "./workspace";

/**
 * Gets an array of Document Symbols for the given TextDocument used to populate the editor's Outline view
 * @param document - The current TextDocument
 * @returns An array of DocumentSymbol
 */
export function getDocumentSymbols(document: TextDocument): DocumentSymbol[] | undefined {
    if (!document) {
        return;
    }

    const uri = Uri.file(document.fileName);
    const documentFilename = stripWorkspaceFromFile(uri.path);
    let results: DocumentSymbol[] = [];
    const range = new Range(0, 0, 0, 0);
    for (let type in NavigationData.data.location) {
        const category = NavigationData.data.location[type];
        let parentSymbol = new DocumentSymbol(type, "", getDocumentSymbolKind(type, false), range, range);
        for (let key in category) {
            if (category[key][0] === documentFilename) {
                const childRange = new Range(category[key][1] - 1, 0, category[key][1] - 1, 0);
                parentSymbol.children.push(
                    new DocumentSymbol(key, `:${category[key][1]}`, getDocumentSymbolKind(type, true), childRange, childRange)
                );
            }
        }
        if (parentSymbol.children.length > 0) {
            if (type === 'class') {
                // put class at the top (before callable)
                results.unshift(parentSymbol);
            } else {
                results.push(parentSymbol);
            }
        }
    }
    return results;
}

/**
 * Returns the Symbol Kind for the given Ren'Py navigation category
 * @param category - The Ren'Py category
 * @param child - Used to return either the child kind or the parent kind
 * @returns SymbolKind enumeration
 */
function getDocumentSymbolKind(category: string, child: boolean) : SymbolKind {
	switch (category) {
		case "callable":
			return child ? SymbolKind.Method : SymbolKind.Module;
		case "screen":
			return child ? SymbolKind.Struct : SymbolKind.Module;
		case "define":
			return child ? SymbolKind.Variable : SymbolKind.Module;
		case "transform":
			return child ? SymbolKind.Variable : SymbolKind.Module;
		case "label":
			return child ? SymbolKind.String : SymbolKind.Module;
		case "class":
			return child ? SymbolKind.Class : SymbolKind.Module;
		case "displayable":
			return child ? SymbolKind.File : SymbolKind.Module;
		case "persistent":
			return child ? SymbolKind.Constant : SymbolKind.Module;
		default:
			return SymbolKind.Variable;
	}
}