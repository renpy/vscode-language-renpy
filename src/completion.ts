// Completion Provider
import { TextDocument, Position, CompletionContext, CompletionItem, CompletionTriggerKind, CompletionItemKind, workspace, languages, CancellationToken, ProviderResult } from "vscode";
import { Displayable } from "./displayable";
import { getDefinitionFromFile } from "./hover";
import { getCurrentContext } from "./navigation";
import { NavigationData } from "./navigation-data";

export const completionProvider = languages.registerCompletionItemProvider(
    "renpy",
    {
        provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[]> {
            if (token.isCancellationRequested) {
                return;
            }

            return new Promise((resolve) => {
                resolve(getCompletionList(document, position, context));
            });
        },
    },
    ".",
    " ",
    "@",
    "-",
    "("
);

/**
 * Returns an array of auto-complete items related to the keyword at the given document/position
 * @param document - The current TextDocument
 * @param position - The current Position
 * @param context - The current CompletionContext
 * @returns An array of CompletionItem
 */
export function getCompletionList(document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] | undefined {
    if (context.triggerKind === CompletionTriggerKind.TriggerCharacter) {
        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);
        if (!NavigationData.positionIsCleanForCompletion(line, position)) {
            return;
        }

        if (linePrefix.endsWith("renpy.")) {
            return NavigationData.renpyAutoComplete;
        } else if (linePrefix.endsWith("config.")) {
            return NavigationData.configAutoComplete;
        } else if (linePrefix.endsWith("gui.")) {
            return NavigationData.guiAutoComplete;
        } else if (linePrefix.endsWith("renpy.music.")) {
            return getAutoCompleteList("renpy.music.");
        } else if (linePrefix.endsWith("renpy.audio.")) {
            return getAutoCompleteList("renpy.audio.");
        } else {
            const prefixPosition = new Position(position.line, position.character - 1);
            const range = document.getWordRangeAtPosition(prefixPosition);
            const parentContext = getCurrentContext(document, position);
            if (range) {
                const parentPosition = new Position(position.line, line.length - line.trimStart().length);
                const parent = document.getText(document.getWordRangeAtPosition(parentPosition));
                const kwPrefix = document.getText(range);
                return getAutoCompleteList(kwPrefix, parent, parentContext);
            } else if (context.triggerCharacter === "-" || context.triggerCharacter === "@" || context.triggerCharacter === "=" || context.triggerCharacter === " ") {
                const parentPosition = new Position(position.line, line.length - line.trimStart().length);
                const parent = document.getText(document.getWordRangeAtPosition(parentPosition));
                if (parent) {
                    if (context.triggerCharacter === "=") {
                        return getAutoCompleteList(parent);
                    } else {
                        return getAutoCompleteList(context.triggerCharacter, parent, parentContext);
                    }
                }
            }
        }
    }
    return undefined;
}

/**
 * Returns a list of CompletionItem objects for the previous keyword/statement before the current position
 * @param prefix - The previous keyword/statement
 * @param parent - The parent statement
 * @param context - The context of this keyword
 * @returns A list of CompletionItem objects
 */
export function getAutoCompleteList(prefix: string, parent = "", context = ""): CompletionItem[] | undefined {
    const newList: CompletionItem[] = [];
    const channels = getAudioChannels();
    const characters = Object.keys(NavigationData.gameObjects["characters"]);

    if (prefix === "renpy.music." || prefix === "renpy.audio.") {
        prefix = prefix.replace("renpy.", "").trim();
        const list = NavigationData.renpyAutoComplete.filter((item) => {
            if (typeof item.label === "string") {
                item.label.startsWith(prefix);
            }
        });
        for (const item of list) {
            if (typeof item.label === "string") {
                newList.push(new CompletionItem(item.label.replace(prefix, ""), item.kind));
            }
        }
        return newList;
    } else if (prefix === "persistent") {
        // get list of persistent definitions
        const gameObjects = NavigationData.data.location["persistent"];
        for (const key in gameObjects) {
            newList.push(new CompletionItem(key, CompletionItemKind.Value));
        }
        return newList;
    } else if (prefix === "store") {
        // get list of default variables
        const defaults = NavigationData.gameObjects["define_types"];
        const filtered = Object.keys(defaults).filter((key) => defaults[key].define === "default");
        for (const key of filtered) {
            newList.push(new CompletionItem(key, CompletionItemKind.Variable));
        }
        return newList;
    } else if (channels.includes(prefix)) {
        // get list of audio definitions
        if (parent && parent === "stop") {
            newList.push(new CompletionItem("fadeout", CompletionItemKind.Keyword));
        } else {
            const category = NavigationData.data.location["define"];
            const audio = Object.keys(category).filter((key) => key.startsWith("audio."));
            for (const key of audio) {
                newList.push(new CompletionItem(key.substring(6), CompletionItemKind.Variable));
            }
        }
        return newList;
    } else if (NavigationData.isClass(prefix)) {
        const className = NavigationData.isClass(prefix);
        if (className) {
            return NavigationData.getClassAutoComplete(className);
        }
    } else if (isNamedStore(prefix)) {
        return getNamedStoreAutoComplete(prefix);
    } else if (isCallableContainer(prefix)) {
        return getCallableAutoComplete(prefix);
    } else if (isInternalClass(prefix)) {
        return getInternalClassAutoComplete(prefix);
    } else if (context === "label" && characters.includes(parent)) {
        // get attributes for character if we're in the context of a label
        const category = NavigationData.gameObjects["attributes"][parent];
        if (category) {
            for (const key of category) {
                newList.push(new CompletionItem(key, CompletionItemKind.Value));
            }
        }
    } else if (isPythonType(prefix)) {
        const defType = NavigationData.gameObjects["define_types"][prefix];
        if (defType) {
            return getAutoCompleteKeywords(defType.type, "", "python");
        }
    } else {
        return getAutoCompleteKeywords(prefix, parent, context);
    }

    return newList;
}

/**
 * Returns a list of CompletionItem objects for the given keyword
 * @param keyword - The keyword to search
 * @param parent - The keyword's parent keyword
 * @param context - The context of the keyword
 * @returns A list of CompletionItem objects
 */
export function getAutoCompleteKeywords(keyword: string, parent: string, context: string): CompletionItem[] {
    let newList: CompletionItem[] = [];
    let enumerations;
    if (context) {
        enumerations = NavigationData.autoCompleteKeywords[`${context}.${keyword}`];
    }
    if (!enumerations) {
        enumerations = NavigationData.autoCompleteKeywords[keyword];
    }

    if (enumerations) {
        const split = enumerations.split("|");
        for (const index in split) {
            if (split[index].startsWith("{")) {
                let gameDataKey = split[index].replace("{", "").replace("}", "");
                let quoted = false;
                let args = 0;
                if (gameDataKey.indexOf("!") > 0) {
                    const split2 = gameDataKey.split("!");
                    gameDataKey = split2[0];
                    quoted = split2[1] === "q";
                    if (isNormalInteger(split2[1])) {
                        args = Math.floor(Number(split2[1]));
                    }
                }

                if (gameDataKey === "action") {
                    // get list of screen Actions
                    const category = NavigationData.renpyFunctions.internal;
                    const transitions = Object.keys(category).filter((key) => category[key][4] === "Action");
                    if (transitions) {
                        for (const key of transitions) {
                            const detail = category[key][2];
                            newList.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Value));
                        }
                    }
                    continue;
                } else if (gameDataKey === "function") {
                    // get list of callable functions
                    const callables = NavigationData.data.location["callable"];
                    if (callables) {
                        const filtered = Object.keys(callables).filter((key) => key.indexOf(".") === -1);
                        for (const key of filtered) {
                            const callable = callables[key];
                            const navigation = getDefinitionFromFile(callable[0], callable[1]);
                            let detail = "";
                            if (navigation) {
                                detail = navigation.args;
                                if (args > 0) {
                                    if (navigation.args.split(",").length !== args) {
                                        continue;
                                    }
                                }
                            }
                            newList.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Function));
                        }
                    }
                } else if (gameDataKey === "layer") {
                    const layers = getLayerConfiguration(quoted);
                    if (layers) {
                        for (const key of layers) {
                            newList.push(key);
                        }
                    }
                    continue;
                } else if (gameDataKey === "screens") {
                    // get list of screens
                    const category = NavigationData.data.location["screen"];
                    for (let key in category) {
                        if (quoted) {
                            key = '"' + key + '"';
                        }
                        newList.push(new CompletionItem(key, CompletionItemKind.Variable));
                    }
                    return newList;
                } else if (gameDataKey === "label") {
                    newList.push(new CompletionItem("expression", CompletionItemKind.Keyword));
                    const category = NavigationData.data.location["label"];
                    for (let key in category) {
                        if (quoted) {
                            key = '"' + key + '"';
                        }
                        newList.push(new CompletionItem(key, CompletionItemKind.Value));
                    }
                    return newList;
                } else if (gameDataKey === "outlines") {
                    let gameObjects = [];
                    if (NavigationData.data.location[gameDataKey]) {
                        gameObjects = NavigationData.data.location[gameDataKey]["array"] || [];
                        if (gameObjects) {
                            for (const key of gameObjects) {
                                const ci = new CompletionItem(key, CompletionItemKind.Value);
                                ci.sortText = "1" + key;
                                newList.push(ci);
                            }
                        } else {
                            gameObjects = [];
                        }
                    }

                    if (!gameObjects.includes('[(1, "#000000", 0, 0)]')) {
                        newList.push(new CompletionItem('[(1, "#000000", 0, 0)]', CompletionItemKind.Value));
                    }
                    if (!gameObjects.includes('[(1, "#000000", 1, 1)]')) {
                        newList.push(new CompletionItem('[(1, "#000000", 1, 1)]', CompletionItemKind.Value));
                    }
                    newList.push(new CompletionItem('[(absolute(1), "#000000", absolute(1), absolute(1))]', CompletionItemKind.Value));
                    newList.push(new CompletionItem("[(size, color, xoffset, yoffset)]", CompletionItemKind.Value));
                    continue;
                } else if (gameDataKey === "displayable") {
                    const display = getDisplayableAutoComplete(quoted);
                    if (display) {
                        for (const ci of display) {
                            newList.push(ci);
                        }
                    }
                    continue;
                } else if (gameDataKey === "audio") {
                    // get defined audio variables
                    const category = NavigationData.data.location["define"];
                    const audio = Object.keys(category).filter((key) => key.startsWith("audio."));
                    for (const key of audio) {
                        const ci = new CompletionItem(key, CompletionItemKind.Variable);
                        ci.sortText = "0" + key;
                        newList.push(ci);
                    }
                    // get auto detected audio variables
                    const gameObjects = NavigationData.gameObjects["audio"];
                    if (gameObjects) {
                        for (const key in gameObjects) {
                            if (!newList.some((e) => e.label === key)) {
                                const obj = gameObjects[key];
                                let ci: CompletionItem;
                                if (obj.startsWith('"')) {
                                    ci = new CompletionItem(gameObjects[key], CompletionItemKind.Folder);
                                    ci.sortText = "2" + key;
                                } else {
                                    ci = new CompletionItem(gameObjects[key], CompletionItemKind.Value);
                                    ci.sortText = "1" + key;
                                }
                                newList.push(ci);
                            }
                        }
                    }
                    continue;
                } else if (gameDataKey === "transforms") {
                    // get the Renpy default Transforms
                    const internal = NavigationData.renpyFunctions.internal;
                    const transforms = Object.keys(internal).filter((key) => internal[key][0] === "transforms");
                    for (const key of transforms) {
                        const detail = internal[key][2];
                        newList.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Value));
                    }
                    // get list of defined Transforms
                    const category = NavigationData.data.location["transform"];
                    for (const key in category) {
                        const defType = NavigationData.gameObjects["define_types"][key];
                        if (defType) {
                            newList.push(new CompletionItem(key, CompletionItemKind.Value));
                        }
                    }

                    continue;
                } else if (gameDataKey === "transitions") {
                    // get list of Transitions
                    const category = NavigationData.renpyFunctions.internal;
                    newList.push(new CompletionItem("None", CompletionItemKind.Value));
                    // get the Renpy default transitions and Transition classes
                    const transitions = Object.keys(category).filter((key) => category[key][0] === "transitions");
                    for (const key of transitions) {
                        const detail = category[key][2];
                        newList.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Value));
                    }
                    // get the user define transitions
                    const defines = NavigationData.gameObjects["define_types"];
                    const defTransitions = Object.keys(defines).filter((key) => defines[key].type === "transitions");
                    for (const key of defTransitions) {
                        newList.push(new CompletionItem(key, CompletionItemKind.Value));
                    }
                    continue;
                }

                const gameObjects = NavigationData.gameObjects[gameDataKey];
                if (gameObjects) {
                    for (let key in gameObjects) {
                        if (quoted) {
                            key = '"' + key + '"';
                        }
                        const ci = new CompletionItem(key, CompletionItemKind.Value);
                        ci.sortText = quoted ? "2" + key : "1" + key;
                        newList.push(ci);
                    }
                } else {
                    const navObjects = NavigationData.data.location[gameDataKey];
                    if (navObjects) {
                        for (let key in navObjects) {
                            if (quoted) {
                                key = '"' + key + '"';
                            }
                            const ci = new CompletionItem(key, CompletionItemKind.Value);
                            ci.sortText = quoted ? "2" + key : "1" + key;
                            newList.push(ci);
                        }
                    }
                }
            } else {
                let ci = new CompletionItem(split[index], CompletionItemKind.Constant);
                if (split[index].indexOf("(") > 0) {
                    const key = split[index].substring(0, split[index].indexOf("("));
                    const detail = split[index].substring(split[index].indexOf("("));
                    ci = new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Method);
                }
                ci.sortText = "0" + split[index];
                newList.push(ci);
            }
        }
    }

    if (newList.length === 0 && parent.length > 0) {
        newList = getAutoCompleteKeywords(`parent.${context}.${parent}`, "", "");
        if (newList.length > 0) {
            return newList;
        }
        return getAutoCompleteKeywords(`parent.${parent}`, "", "");
    }

    return newList;
}

/**
 * Determines if the given string is a normal integer number
 * @param str - The string containing a numeric value
 * @returns - True if the given string is a normal integer number
 */
function isNormalInteger(str: string) {
    const n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

/**
 * Returns a list of the audio channels, both system and user-defined
 * @returns An array of strings containing the names of the available audio channels
 */
function getAudioChannels(): string[] {
    const newList: string[] = [];
    const enumerations = NavigationData.autoCompleteKeywords["play"];
    if (enumerations) {
        const split = enumerations.split("|");
        for (const index in split) {
            if (split[index].startsWith("{")) {
                const gameDataKey = split[index].replace("{", "").replace("}", "");
                const gameObjects = NavigationData.gameObjects[gameDataKey];
                for (const key in gameObjects) {
                    newList.push(key);
                }
            } else {
                newList.push(split[index]);
            }
        }
    }
    return newList;
}

/**
 * Returns an array containing the `config.layer` definitions
 * @remarks
 * This method looks for a user configured `define config.layers` definition, or else it returns the default config.layers definition
 *
 * @returns The config.layer configuration as string[] (e.g, `[ 'master', 'transient', 'screens', 'overlay']`)
 */
function getLayerConfiguration(quoted = false): CompletionItem[] | undefined {
    const newList: CompletionItem[] = [];
    const layers = NavigationData.find("config.layers");
    if (layers) {
        for (const layer of layers) {
            if (layer.args) {
                const args = layer.args.replace(/ /g, "").replace(/'/g, '"').replace("=", "").trim();
                const defaultLayers = JSON.parse(args);
                if (defaultLayers) {
                    for (let l of defaultLayers) {
                        if (quoted) {
                            l = '"' + l + '"';
                        }
                        newList.push(new CompletionItem(l, CompletionItemKind.Variable));
                    }
                    return newList;
                }
            } else {
                const docs = getDefinitionFromFile(layer.filename, layer.location);
                const args = docs?.keyword.replace(/ /g, "").replace(/'/g, '"').replace("defineconfig.layers=", "");
                if (args) {
                    const userLayers = JSON.parse(args);
                    for (let l of userLayers) {
                        if (quoted) {
                            l = '"' + l + '"';
                        }
                        newList.push(new CompletionItem(l, CompletionItemKind.Variable));
                    }
                    return newList;
                }
            }
        }
    }
    return;
}

function getDisplayableAutoComplete(quoted = false): CompletionItem[] {
    if (
        NavigationData.displayableAutoComplete === undefined ||
        NavigationData.displayableAutoComplete.length === 0 ||
        NavigationData.displayableQuotedAutoComplete === undefined ||
        NavigationData.displayableQuotedAutoComplete.length === 0
    ) {
        NavigationData.displayableAutoComplete = [];
        NavigationData.displayableQuotedAutoComplete = [];

        const config = workspace.getConfiguration("renpy");
        let showAutoImages = true;
        if (config && !config.showAutomaticImagesInCompletion) {
            showAutoImages = false;
        }
        const category = NavigationData.data.location["displayable"];
        for (const key in category) {
            const display: Displayable = category[key];
            if (display.location < 0 && showAutoImages) {
                let ci = new CompletionItem(key, CompletionItemKind.Folder);
                ci.sortText = "1" + key;
                NavigationData.displayableAutoComplete.push(ci);

                ci = new CompletionItem('"' + key + '"', CompletionItemKind.Folder);
                ci.sortText = "1" + key;
                NavigationData.displayableQuotedAutoComplete.push(ci);
            } else if (display.location >= 0) {
                let ci = new CompletionItem(key, CompletionItemKind.Value);
                ci.sortText = "0" + key;
                NavigationData.displayableAutoComplete.push(ci);

                ci = new CompletionItem('"' + key + '"', CompletionItemKind.Value);
                ci.sortText = "0" + key;
                NavigationData.displayableQuotedAutoComplete.push(ci);
            }
        }

        if (!NavigationData.displayableAutoComplete.some((e) => e.label === "black")) {
            const black = new CompletionItem("black", CompletionItemKind.Value);
            black.sortText = "0black";
            NavigationData.displayableAutoComplete.push(black);
        }
        if (!NavigationData.displayableQuotedAutoComplete.some((e) => e.label === "black")) {
            const black = new CompletionItem('"black"', CompletionItemKind.Value);
            black.sortText = "0black";
            NavigationData.displayableQuotedAutoComplete.push(black);
        }
    }

    if (quoted) {
        return NavigationData.displayableQuotedAutoComplete;
    } else {
        return NavigationData.displayableAutoComplete;
    }
}

function isCallableContainer(keyword: string): boolean {
    const prefix = keyword + ".";
    const callables = NavigationData.data.location["callable"];
    if (callables) {
        return Object.keys(callables).some((key) => key.indexOf(prefix) === 0);
    }
    return false;
}

function getCallableAutoComplete(keyword: string): CompletionItem[] | undefined {
    const newlist: CompletionItem[] = [];
    const prefix = keyword + ".";

    // get the list of callables
    const callables = NavigationData.data.location["callable"];
    if (callables) {
        const filtered = Object.keys(callables).filter((key) => key.indexOf(prefix) === 0);
        if (filtered) {
            for (const key in filtered) {
                const label = filtered[key].substring(prefix.length);
                newlist.push(new CompletionItem(label, CompletionItemKind.Method));
            }
        }
    }

    return newlist;
}

function isInternalClass(keyword: string): boolean {
    const prefix = keyword + ".";
    const callables = NavigationData.renpyFunctions.internal;
    if (callables) {
        return Object.keys(callables).some((key) => key.indexOf(prefix) === 0);
    }
    return false;
}

function getInternalClassAutoComplete(keyword: string): CompletionItem[] | undefined {
    const newlist: CompletionItem[] = [];
    const prefix = keyword + ".";

    // get the list of callables
    const callables = NavigationData.renpyFunctions.internal;
    if (callables) {
        const filtered = Object.keys(callables).filter((key) => key.indexOf(prefix) === 0);
        if (filtered) {
            for (const key in filtered) {
                const label = filtered[key].substring(prefix.length);
                newlist.push(new CompletionItem(label, CompletionItemKind.Method));
            }
        }
    }

    return newlist;
}

function isNamedStore(keyword: string): boolean {
    const stores = NavigationData.gameObjects["stores"][keyword];
    if (stores) {
        return true;
    }
    return false;
}

function getNamedStoreAutoComplete(keyword: string): CompletionItem[] | undefined {
    const newlist: CompletionItem[] = [];

    // get the list of callables
    const callables = getCallableAutoComplete(keyword);
    if (callables) {
        for (const callable of callables) {
            newlist.push(callable);
        }
    }

    const objKey = `store.${keyword}`;
    if (NavigationData.gameObjects["fields"][objKey] !== undefined) {
        const fields = NavigationData.gameObjects["fields"][objKey];
        for (const field of fields) {
            const split = field.keyword.split(".");
            if (split.length === 2) {
                const label = split[1];
                newlist.push(new CompletionItem(label, CompletionItemKind.Variable));
            }
        }
    }

    return newlist;
}

function isPythonType(keyword: string): boolean {
    const defaults = NavigationData.gameObjects["define_types"];
    if (defaults) {
        const defType = defaults[keyword];
        if (defType) {
            return defType.type !== "";
        }
    }
    return false;
}
