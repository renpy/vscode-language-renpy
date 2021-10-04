// Completion Provider
'use strict';

import { TextDocument, Position, CompletionContext, CompletionItem, CompletionTriggerKind, CompletionItemKind, workspace } from "vscode";
import { Displayable } from "./displayable";
import { getDefinitionFromFile } from "./hover";
import { getCurrentContext } from "./navigation";
import { NavigationData } from "./navigationdata";

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
        const linePrefix = line.substr(0, position.character);
        if (!NavigationData.positionIsCleanForCompletion(line, position)) {
            return;
        }

        if (linePrefix.endsWith('renpy.')) {
            return NavigationData.renpyAutoComplete;
        } else if (linePrefix.endsWith('config.')) {
            return NavigationData.configAutoComplete;
        } else if (linePrefix.endsWith('gui.')) {
            return NavigationData.guiAutoComplete;
        } else if (linePrefix.endsWith('renpy.music.')) {
            return getAutoCompleteList('renpy.music.');
        } else if (linePrefix.endsWith('renpy.audio.')) {
            return getAutoCompleteList('renpy.audio.');
        } else if (linePrefix.endsWith('persistent.')) {
            return getAutoCompleteList('persistent.');
        } else if (linePrefix.endsWith('store.')) {
            return getAutoCompleteList('store.');
        } else {
            const prefixPosition = new Position(position.line, position.character - 1);
            const range = document.getWordRangeAtPosition(prefixPosition);
            const parent_context = getCurrentContext(document, position);
            if (range) {
                const parentPosition = new Position(position.line, line.length - line.trimLeft().length);
                let parent = document.getText(document.getWordRangeAtPosition(parentPosition));
                const kwPrefix = document.getText(range);
                return getAutoCompleteList(kwPrefix, parent, parent_context);
            } else if (context.triggerCharacter === '-' || context.triggerCharacter === '@' || context.triggerCharacter === '=' || context.triggerCharacter === ' ') {
                const parentPosition = new Position(position.line, line.length - line.trimLeft().length);
                let parent = document.getText(document.getWordRangeAtPosition(parentPosition));
                if (parent) {
                    if (context.triggerCharacter === '=') {
                        return getAutoCompleteList(parent);
                    } else {
                        return getAutoCompleteList(context.triggerCharacter, parent, parent_context);
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
export function getAutoCompleteList(prefix: string, parent: string = "", context: string = ""): CompletionItem[] | undefined {
    let newlist: CompletionItem[] = [];
    const channels = getAudioChannels();
    const characters = Object.keys(NavigationData.gameObjects['characters']);

    if (prefix === 'renpy.music.' || prefix === 'renpy.audio.') {
        prefix = prefix.replace('renpy.', '').trim();
        const list = NavigationData.renpyAutoComplete.filter(item => { if (typeof item.label === 'string') { item.label.startsWith(prefix); } });
        for (let item of list) {
            if (typeof item.label === 'string') {
                newlist.push(new CompletionItem(item.label.replace(prefix, ''), item.kind));
            }
        }
        return newlist;
    } else if (prefix === 'persistent.') {
        // get list of persistent definitions
        const gameObjects = NavigationData.data.location['persistent'];
        for (let key in gameObjects) {
            newlist.push(new CompletionItem(key, CompletionItemKind.Value));
        }
        return newlist;
    } else if (prefix === 'store.') {
        // get list of default variables
        const defaults = NavigationData.gameObjects['define_types'];
        const filtered = Object.keys(defaults).filter(key => defaults[key].define === 'default');
        for (let key of filtered) {
            newlist.push(new CompletionItem(key, CompletionItemKind.Variable));
        }
        return newlist;
    } else if (channels.includes(prefix)) {
        // get list of audio definitions
        if (parent && parent === 'stop') {
            newlist.push(new CompletionItem("fadeout", CompletionItemKind.Keyword));
        } else {
            const category = NavigationData.data.location['define'];
            let audio = Object.keys(category).filter(key => key.startsWith('audio.'));
            for (let key of audio) {
                newlist.push(new CompletionItem(key.substr(6), CompletionItemKind.Variable));
            }
        }
        return newlist;
    } else if (prefix === 'with') {
        // get list of Transitions
        const category = NavigationData.renpyFunctions.internal;
        newlist.push(new CompletionItem("None", CompletionItemKind.Value));
        // get the Renpy default transitions and Transition classes
        let transitions = Object.keys(category).filter(key => category[key][0] === 'transitions');
        for (let key of transitions) {
            const detail = category[key][2];
            newlist.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Value));
        }
        // get the user define transitions
        const defines = NavigationData.gameObjects['define_types'];
        let deftransitions = Object.keys(defines).filter(key => defines[key].type === 'transitions');
        for (let key of deftransitions) {
            newlist.push(new CompletionItem(key, CompletionItemKind.Value));
        }

    } else if (prefix === 'at') {
        // get list of Transforms
        const category = NavigationData.data.location['transform'];
        for (let key in category) {
            newlist.push(new CompletionItem(key, CompletionItemKind.Value));
        }
    } else if (NavigationData.isClass(prefix)) {
        const className = NavigationData.isClass(prefix);
        if (className) {
            return NavigationData.getClassAutoComplete(className);
        }
    } else if (context === 'label' && characters.includes(parent)) {
        // get attributes for character if we're in the context of a label
        const category = NavigationData.gameObjects['attributes'][parent];
        if (category) {
            for (let key of category) {
                newlist.push(new CompletionItem(key, CompletionItemKind.Value));
            }
        }
    } else {
        return getAutoCompleteKeywords(prefix, parent, context);
    }

    return newlist;
}

/**
 * Returns a list of CompletionItem objects for the given keyword
 * @param keyword - The keyword to search
 * @param parent - The keyword's parent keyword
 * @param context - The context of the keyword
 * @returns A list of CompletionItem objects
 */
export function getAutoCompleteKeywords(keyword: string, parent: string, context: string): CompletionItem[] {
    let newlist: CompletionItem[] = [];
    let enumerations;
    if (context) {
        enumerations = NavigationData.autoCompleteKeywords[`${context}.${keyword}`];
    }
    if (!enumerations) {
        enumerations = NavigationData.autoCompleteKeywords[keyword];
    }

    if (enumerations) {
        const split = enumerations.split('|');
        for (let index in split) {
            if (split[index].startsWith('{')) {
                let gameDataKey = split[index].replace('{', '').replace('}', '');
                let quoted = false;
                let args = 0;
                if (gameDataKey.indexOf('!') > 0) {
                    const split = gameDataKey.split('!');
                    gameDataKey = split[0];
                    quoted = split[1] === 'q';
                    if (isNormalInteger(split[1])) {
                        args = Math.floor(Number(split[1]));
                    }
                }

                if (gameDataKey === 'action') {
                    // get list of screen Actions
                    const category = NavigationData.renpyFunctions.internal;
                    let transitions = Object.keys(category).filter(key => category[key][4] === 'Action');
                    if (transitions) {
                        for (let key of transitions) {
                            const detail = category[key][2];
                            newlist.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Value));
                        }
                    }
                    continue;
                } else if (gameDataKey === 'function') {
                    // get list of callable functions
                    const callables = NavigationData.data.location['callable'];
                    if (callables) {
                        const filtered = Object.keys(callables).filter(key => key.indexOf('.') === -1);
                        for (let key of filtered) {
                            const callable = callables[key];
                            const navigation = getDefinitionFromFile(callable[0], callable[1]);
                            let detail = '';
                            if (navigation) {
                                detail = navigation.args;
                                if (args > 0) {
                                    if (navigation.args.split(',').length !== args) {
                                        continue;
                                    }
                                }
                            }
                            newlist.push(new CompletionItem({ label: key, detail: detail }, CompletionItemKind.Function));
                        }
                    }
                } else if (gameDataKey === 'layer') {
                    const layers = getLayerConfiguration(quoted);
                    if (layers) {
                        for (let key of layers) {
                            newlist.push(key);
                        }
                    }
                    continue;
                } else if (gameDataKey === 'screens') {
                    // get list of screens
                    const category = NavigationData.data.location['screen'];
                    for (let key in category) {
                        if (quoted) {
                            key = '"' + key + '"';
                        }
                        newlist.push(new CompletionItem(key, CompletionItemKind.Variable));
                    }
                    return newlist;
                } else if (gameDataKey === 'label') {
                    newlist.push(new CompletionItem("expression", CompletionItemKind.Keyword));
                    const category = NavigationData.data.location['label'];
                    for (let key in category) {
                        if (quoted) {
                            key = '"' + key + '"';
                        }
                        newlist.push(new CompletionItem(key, CompletionItemKind.Value));
                    }
                    return newlist;
                } else if (gameDataKey === 'outlines') {
                    let gameObjects = [];
                    if (NavigationData.data.location[gameDataKey]) {
                        gameObjects = NavigationData.data.location[gameDataKey]['array'] || [];
                        if (gameObjects) {
                            for (let key of gameObjects) {
                                let ci = new CompletionItem(key, CompletionItemKind.Value);
                                ci.sortText = '1' + key;
                                newlist.push(ci);
                            }
                        } else {
                            gameObjects = [];
                        }
                    }

                    if (!gameObjects.includes('[(1, "#000000", 0, 0)]')) {
                        newlist.push(new CompletionItem('[(1, "#000000", 0, 0)]', CompletionItemKind.Value));
                    }
                    if (!gameObjects.includes('[(1, "#000000", 1, 1)]')) {
                        newlist.push(new CompletionItem('[(1, "#000000", 1, 1)]', CompletionItemKind.Value));
                    }
                    newlist.push(new CompletionItem('[(absolute(1), "#000000", absolute(1), absolute(1))]', CompletionItemKind.Value));
                    newlist.push(new CompletionItem('[(size, color, xoffset, yoffset)]', CompletionItemKind.Value));
                    continue;
                } else if (gameDataKey === 'displayable') {
                    const display = getDisplayableAutoComplete(quoted);
                    if (display) {
                        for (let ci of display) {
                            newlist.push(ci);
                        }
                    }
                    continue;
                } else if (gameDataKey === 'audio') {
                    // get defined audio variables
                    const category = NavigationData.data.location['define'];
                    let audio = Object.keys(category).filter(key => key.startsWith('audio.'));
                    for (let key of audio) {
                        key = key;
                        let ci = new CompletionItem(key, CompletionItemKind.Variable);
                        ci.sortText = "0" + key;
                        newlist.push(ci);
                    }
                    // get auto detected audio variables
                    const gameObjects = NavigationData.gameObjects['audio'];
                    if (gameObjects) {
                        for (let key in gameObjects) {
                            if (!newlist.some(e => e.label === key)) {
                                var obj = gameObjects[key];
                                let ci: CompletionItem;
                                if (obj.startsWith('"')) {
                                    ci = new CompletionItem(gameObjects[key], CompletionItemKind.Folder);
                                    ci.sortText = "2" + key;
                                } else {
                                    ci = new CompletionItem(gameObjects[key], CompletionItemKind.Value);
                                    ci.sortText = "1" + key;
                                }
                                newlist.push(ci);
                            }
                        }
                    }
                    continue;
                }

                const gameObjects = NavigationData.gameObjects[gameDataKey];
                if (gameObjects) {
                    for (let key in gameObjects) {
                        if (quoted) {
                            key = '"' + key + '"';
                        }
                        let ci = new CompletionItem(key, CompletionItemKind.Value);
                        ci.sortText = quoted ? '2' + key : '1' + key;
                        newlist.push(ci);
                    }
                } else {
                    const navObjects = NavigationData.data.location[gameDataKey];
                    if (navObjects) {
                        for (let key in navObjects) {
                            if (quoted) {
                                key = '"' + key + '"';
                            }
                            let ci = new CompletionItem(key, CompletionItemKind.Value);
                            ci.sortText = quoted ? '2' + key : '1' + key;
                            newlist.push(ci);
                        }
                    }
                }
            } else {
                let ci = new CompletionItem(split[index], CompletionItemKind.Constant);
                ci.sortText = '0' + split[index];
                newlist.push(ci);
            }
        }
    }

    if (newlist.length === 0 && parent.length > 0) {
        newlist = getAutoCompleteKeywords(`parent.${context}.${parent}`, '', '');
        if (newlist.length > 0) {
            return newlist;
        }
        return getAutoCompleteKeywords(`parent.${parent}`, '', '');
    }

    return newlist;
}

/**
 * Determines if the given string is a normal integer number 
 * @param str - The string containing a numeric value
 * @returns - True if the given string is a normal integer number
 */
 function isNormalInteger(str: string) {
    var n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

/**
 * Returns a list of the audio channels, both system and user-defined
 * @returns An array of strings containing the names of the available audio channels
 */
function getAudioChannels(): string[] {
    let newlist: string[] = [];
    const enumerations = NavigationData.autoCompleteKeywords['play'];
    if (enumerations) {
        const split = enumerations.split('|');
        for (let index in split) {
            if (split[index].startsWith('{')) {
                const gameDataKey = split[index].replace('{', '').replace('}', '');
                const gameObjects = NavigationData.gameObjects[gameDataKey];
                for (let key in gameObjects) {
                    newlist.push(key);
                }
            } else {
                newlist.push(split[index]);
            }
        }
    }
    return newlist;
}

/**
 * Returns an array containing the `config.layer` definitions
 * @remarks
 * This method looks for a user configured `define config.layers` definition, or else it returns the default config.layers definition
 * 
 * @returns The config.layer configuration as string[] (e.g, `[ 'master', 'transient', 'screens', 'overlay']`)
 */
function getLayerConfiguration(quoted: boolean = false): CompletionItem[] | undefined {
    let newlist: CompletionItem[] = [];
    const layers = NavigationData.find("config.layers");
    if (layers) {
        for (let layer of layers) {
            if (layer.args) {
                const args = layer.args.replace(/ /g,'').replace(/'/g,'"').replace('=','').trim();
                const default_layers = JSON.parse(args);
                if (default_layers) {
                    for (let l of default_layers) {
                        if (quoted) {
                            l = '"' + l + '"';
                        }
                        newlist.push(new CompletionItem(l, CompletionItemKind.Variable));
                    }
                    return newlist;
                }
            } else {
                const docs = getDefinitionFromFile(layer.filename, layer.location);
                const args = docs?.keyword.replace(/ /g,'').replace(/'/g,'"').replace('defineconfig.layers=', '');
                if (args) {
                    const user_layers = JSON.parse(args);
                    for (let l of user_layers) {
                        if (quoted) {
                            l = '"' + l + '"';
                        }
                        newlist.push(new CompletionItem(l, CompletionItemKind.Variable));
                    }
                    return newlist;
                }
            }
        }
    }
    return;
}

function getDisplayableAutoComplete(quoted: boolean = false): CompletionItem[] {
    if (NavigationData.displayableAutoComplete === undefined || NavigationData.displayableAutoComplete.length === 0
            || NavigationData.displayableQuotedAutoComplete === undefined || NavigationData.displayableQuotedAutoComplete.length === 0) {
        NavigationData.displayableAutoComplete = [];
        NavigationData.displayableQuotedAutoComplete = [];

        const config = workspace.getConfiguration('renpy');
        let showAutoImages = true;
        if (config && !config.showAutomaticImagesInCompletion) {
            showAutoImages = false;
        }
        const category = NavigationData.data.location['displayable'];
        for (let key in category) {
            const display: Displayable = category[key];
            if (display.location < 0 && showAutoImages) {
                let ci = new CompletionItem(key, CompletionItemKind.Folder);
                ci.sortText = '1' + key;
                NavigationData.displayableAutoComplete.push(ci);
                
                ci = new CompletionItem('"' + key + '"', CompletionItemKind.Folder);
                ci.sortText = '1' + key;
                NavigationData.displayableQuotedAutoComplete.push(ci);
            } else if (display.location >= 0) {
                let ci = new CompletionItem(key, CompletionItemKind.Value);
                ci.sortText = '0' + key;
                NavigationData.displayableAutoComplete.push(ci);

                ci = new CompletionItem('"' + key + '"', CompletionItemKind.Value);
                ci.sortText = '0' + key;
                NavigationData.displayableQuotedAutoComplete.push(ci);
            }
        }

        if (!NavigationData.displayableAutoComplete.some(e => e.label === 'black')) {
            let black = new CompletionItem("black", CompletionItemKind.Value);
            black.sortText = '0black';
            NavigationData.displayableAutoComplete.push(black);
        }
        if (!NavigationData.displayableQuotedAutoComplete.some(e => e.label === 'black')) {
            let black = new CompletionItem('"black"', CompletionItemKind.Value);
            black.sortText = '0black';
            NavigationData.displayableQuotedAutoComplete.push(black);
        }
    }

    if (quoted) {
        return NavigationData.displayableQuotedAutoComplete;
    } else {
        return NavigationData.displayableAutoComplete;
    }
}