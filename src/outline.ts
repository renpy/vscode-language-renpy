// Document Symbol (Outline) Provider
import { TextDocument, DocumentSymbol, Uri, Range, SymbolKind, languages, CancellationToken, ProviderResult, LogLevel } from "vscode";
import { Navigation } from "./navigation";
import { NavigationData } from "./navigation-data";
import { stripWorkspaceFromFile } from "./workspace";
import { logMessage } from "./logger";

export const symbolProvider = languages.registerDocumentSymbolProvider("renpy", {
    provideDocumentSymbols(document: TextDocument, token: CancellationToken): ProviderResult<DocumentSymbol[]> {
        if (token.isCancellationRequested) {
            return;
        }

        return new Promise((resolve) => {
            resolve(getDocumentSymbols(document));
        });
    },
});

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
    const results: DocumentSymbol[] = [];
    const range = new Range(0, 0, 0, 0);
    for (const type in NavigationData.data.location) {
        const category = NavigationData.data.location[type];
        const parentSymbol = new DocumentSymbol(type, "", getDocumentSymbolKind(type, false), range, range);
        for (const key in category) {
            if (category[key] instanceof Navigation) {
                if (category[key].filename === documentFilename) {
                    const childRange = new Range(category[key].location - 1, 0, category[key].location - 1, 0);
                    const classParent = new DocumentSymbol(key, `:${category[key].location}`, getDocumentSymbolKind(type, true), childRange, childRange);
                    if (type === "class") {
                        getClassDocumentSymbols(classParent, key);
                    }
                    parentSymbol.children.push(classParent);
                }
            } else {
                if (category[key][0] === documentFilename) {
                    const childRange = new Range(category[key][1] - 1, 0, category[key][1] - 1, 0);
                    const classParent = new DocumentSymbol(key, `:${category[key][1]}`, getDocumentSymbolKind(type, true), childRange, childRange);
                    if (type === "class") {
                        getClassDocumentSymbols(classParent, key);
                    }
                    parentSymbol.children.push(classParent);
                }
            }
        }
        if (parentSymbol.children.length > 0) {
            if (type === "class") {
                // put class at the top (before callable)
                results.unshift(parentSymbol);
            } else {
                results.push(parentSymbol);
            }
        }
    }

    const stores = NavigationData.gameObjects["stores"];
    if (stores) {
        const parentSymbol = new DocumentSymbol("store", "", getDocumentSymbolKind("store", false), range, range);
        for (const key in stores) {
            const store = stores[key];
            if (store instanceof Navigation) {
                if (store.filename === documentFilename) {
                    const childRange = new Range(store.location - 1, 0, store.location - 1, 0);
                    const classParent = new DocumentSymbol(key, `:${store.location}`, getDocumentSymbolKind("store", true), childRange, childRange);
                    getStoreDocumentSymbols(classParent, key);
                    parentSymbol.children.push(classParent);
                }
            } else {
                if (store[0] === documentFilename) {
                    const childRange = new Range(store[1] - 1, 0, store[1] - 1, 0);
                    const classParent = new DocumentSymbol(key, `:${store[1]}`, getDocumentSymbolKind("store", true), childRange, childRange);
                    getStoreDocumentSymbols(classParent, key);
                    parentSymbol.children.push(classParent);
                }
            }
        }
        if (parentSymbol.children.length > 0) {
            results.push(parentSymbol);
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
function getDocumentSymbolKind(category: string, child: boolean): SymbolKind {
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
        case "store":
            return child ? SymbolKind.Module : SymbolKind.Module;
        default:
            return SymbolKind.Variable;
    }
}

function getClassDocumentSymbols(classParent: DocumentSymbol, key: string) {
    const callables = NavigationData.data.location["callable"];
    if (callables) {
        const filtered = Object.keys(callables).filter((k) => k.indexOf(key + ".") === 0);
        if (filtered) {
            for (const callable of filtered) {
                const label = callable.substring(key.length + 1);
                const line = callables[callable][1];
                const childRange = new Range(line - 1, 0, line - 1, 0);
                classParent.children.push(new DocumentSymbol(label, `:${line}`, SymbolKind.Method, childRange, childRange));
            }
        }
    }
    const fields = NavigationData.gameObjects["fields"][key];
    if (fields) {
        for (const f of fields) {
            const childRange = new Range(f.location - 1, 0, f.location - 1, 0);
            classParent.children.push(new DocumentSymbol(f.keyword, `:${f.location}`, SymbolKind.Field, childRange, childRange));
        }
    }
    const props = NavigationData.gameObjects["properties"][key];
    if (props) {
        for (const p of props) {
            const childRange = new Range(p.location - 1, 0, p.location - 1, 0);
            classParent.children.push(new DocumentSymbol(p.keyword, `:${p.location}`, SymbolKind.Property, childRange, childRange));
        }
    }
}

function getStoreDocumentSymbols(classParent: DocumentSymbol, key: string) {
    const callables = NavigationData.data.location["callable"];
    if (callables) {
        const filtered = Object.keys(callables).filter((k) => k.indexOf(key + ".") === 0);
        if (filtered) {
            for (const callable of filtered) {
                const label = callable.substring(key.length + 1);
                const line = callables[callable][1];
                const childRange = new Range(line - 1, 0, line - 1, 0);
                classParent.children.push(new DocumentSymbol(label, `:${line}`, SymbolKind.Method, childRange, childRange));
            }
        }
    }
    const fields = NavigationData.gameObjects["fields"][`store.${key}`];
    if (fields) {
        for (const f of fields) {
            const childRange = new Range(f.location - 1, 0, f.location - 1, 0);
            const name = f.keyword.substring(key.length + 1);

            if (!name) {
                logMessage(LogLevel.Warning, `Invalid field name: ${f.keyword}`);
                continue;
            }

            classParent.children.push(new DocumentSymbol(name, `:${f.location}`, SymbolKind.Field, childRange, childRange));
        }
    }
}
