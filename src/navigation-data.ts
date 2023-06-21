import { commands, CompletionItem, CompletionItemKind, Position, TextDocument, window, workspace } from "vscode";
import { getDefinitionFromFile } from "./hover";
import { DataType, getBaseTypeFromDefine, getNamedParameter, getPyDocsFromTextDocumentAtLine, Navigation, splitParameters, stripQuotes } from "./navigation";
import { cleanUpPath, extractFilenameWithoutExtension, getFileWithPath, getNavigationJsonFilepath, stripWorkspaceFromFile } from "./workspace";
import * as fs from "fs";
import { Displayable } from "./displayable";
import { Character } from "./character";
import data from "./renpy.json";
import kwData from "./renpyauto.json";
import { LogLevel, logMessage, logToast } from "./logger";

const filterCharacter = "\u2588";

export class NavigationData {
    static data: any = {};
    static renpyFunctions: any;
    static autoCompleteKeywords: any;
    static renpyAutoComplete: CompletionItem[];
    static configAutoComplete: CompletionItem[];
    static guiAutoComplete: CompletionItem[];
    static internalAutoComplete: CompletionItem[];
    static displayableAutoComplete: CompletionItem[];
    static displayableQuotedAutoComplete: CompletionItem[];
    static gameObjects: any = {};
    static isImporting = false;
    static isCompiling = false;

    static async init(extensionPath: string) {
        logMessage(LogLevel.Info, `NavigationData init`);

        NavigationData.renpyFunctions = data;
        NavigationData.autoCompleteKeywords = kwData;

        NavigationData.renpyAutoComplete = [];
        for (const key in NavigationData.renpyFunctions.renpy) {
            if (key.charAt(0) === key.charAt(0).toUpperCase()) {
                NavigationData.renpyAutoComplete.push(new CompletionItem(key.substring(6), CompletionItemKind.Class));
            } else {
                NavigationData.renpyAutoComplete.push(new CompletionItem(key.substring(6), CompletionItemKind.Method));
            }
        }

        NavigationData.configAutoComplete = [];
        for (const key in NavigationData.renpyFunctions.config) {
            NavigationData.configAutoComplete.push(new CompletionItem(key.substring(7), CompletionItemKind.Property));
        }

        NavigationData.guiAutoComplete = [];
        NavigationData.internalAutoComplete = [];
        for (const key in NavigationData.renpyFunctions.internal) {
            NavigationData.internalAutoComplete.push(new CompletionItem(key, CompletionItemKind.Class));
            if (key.startsWith("gui.")) {
                NavigationData.guiAutoComplete.push(new CompletionItem(key.substring(4), CompletionItemKind.Variable));
            }
        }

        await NavigationData.refresh();
    }

    static async refresh(interactive = false): Promise<boolean> {
        logMessage(LogLevel.Info, `${Date()}: NavigationData refresh`);
        NavigationData.isImporting = true;
        try {
            NavigationData.data = readNavigationJson();

            if (NavigationData.data.error) {
                logToast(LogLevel.Warning, "Navigation data is empty. Ren'Py could not compile your project. Please check your project can start successfully.");
            }
            if (NavigationData.data.location === undefined) {
                NavigationData.data.location = {};
                NavigationData.data.location["callable"] = {};
                NavigationData.data.location["screen"] = {};
                NavigationData.data.location["define"] = {};
                NavigationData.data.location["transform"] = {};
                NavigationData.data.location["label"] = {};
            }
            NavigationData.data.location["class"] = {};
            NavigationData.data.location["displayable"] = {};
            NavigationData.data.location["persistent"] = {};
            NavigationData.data.location["statement"] = {};
            NavigationData.gameObjects["characters"] = {};
            NavigationData.gameObjects["attributes"] = {};
            NavigationData.gameObjects["channels"] = {};
            NavigationData.gameObjects["properties"] = {};
            NavigationData.gameObjects["fields"] = {};
            NavigationData.gameObjects["define_types"] = {};
            NavigationData.gameObjects["semantic"] = {};
            NavigationData.gameObjects["audio"] = {};
            NavigationData.gameObjects["fonts"] = {};
            NavigationData.gameObjects["outlines"] = {};
            NavigationData.gameObjects["stores"] = {};
            NavigationData.displayableAutoComplete = [];
            NavigationData.displayableQuotedAutoComplete = [];
            const scriptResult = await NavigationData.scanForScriptFiles();
            const imageResult = await NavigationData.scanForImages();
            if (scriptResult && imageResult) {
                await NavigationData.getCharacterImageAttributes();
            }
            await NavigationData.scanForFonts();
            await NavigationData.scanForAudio();
            commands.executeCommand("renpy.refreshDiagnostics");
            logMessage(LogLevel.Info, `NavigationData for ${NavigationData.data.name} v${NavigationData.data.version} loaded`);
            if (interactive) {
                logToast(LogLevel.Info, `NavigationData for ${NavigationData.data.name} v${NavigationData.data.version} loaded`);
            }
        } catch (error) {
            logMessage(LogLevel.Error, `Error loading NavigationData.json: ${error}`);
            if (interactive) {
                logToast(LogLevel.Error, `NavigationData.json not loaded. Please check Ren'Py can start your project successfully.`);
            }
        } finally {
            NavigationData.isImporting = false;
        }
        return true;
    }

    static find(keyword: string): Navigation[] | undefined {
        const locations: Navigation[] = [];
        const split = keyword.split(".");

        if (split.length === 2 && split[0] === "persistent") {
            const type = NavigationData.data.location[split[0]];
            if (type) {
                const location = type[split[1]];
                if (location) {
                    locations.push(new Navigation(split[0], split[1], location[0], location[1]));
                    return locations;
                }
            }
        }

        for (const key in NavigationData.data.location) {
            const type = NavigationData.data.location[key];
            if (type[keyword]) {
                const data = type[keyword];
                if (data instanceof Navigation) {
                    //!data.length
                    locations.push(data);
                } else if (data instanceof Displayable) {
                    locations.push(new Navigation(key, keyword, data.filename, data.location));
                } else {
                    locations.push(new Navigation(key, keyword, data[0], data[1]));
                }
            }
        }

        if (NavigationData.renpyFunctions.internal[keyword]) {
            const type = NavigationData.renpyFunctions.internal[keyword];
            locations.push(NavigationData.getNavigationObject("internal", keyword, type));
        }

        if (NavigationData.renpyFunctions.config[keyword]) {
            const type = NavigationData.renpyFunctions.config[keyword];
            locations.push(NavigationData.getNavigationObject("config", keyword, type));
        }

        if (NavigationData.renpyFunctions.renpy[keyword]) {
            const type = NavigationData.renpyFunctions.renpy[keyword];
            locations.push(NavigationData.getNavigationObject("equivalent", keyword, type));
        }

        if (NavigationData.gameObjects["stores"][keyword]) {
            const nav = NavigationData.gameObjects["stores"][keyword];
            if (nav instanceof Navigation) {
                locations.push(nav);
            } else {
                locations.push(new Navigation("store", keyword, nav[0], nav[1]));
            }
        }

        if (split.length === 2 && NavigationData.gameObjects["properties"][split[0]]) {
            if (NavigationData.gameObjects["properties"][split[0]]) {
                const properties = NavigationData.gameObjects["properties"][split[0]];
                const filtered = Object.keys(properties).filter((key) => properties[key].keyword === split[1]);
                if (filtered && filtered.length > 0) {
                    const nav: Navigation = Object.create(properties[filtered[0]]);
                    nav.keyword = `${nav.type}.${nav.keyword}`;
                    locations.push(nav);
                }
            }
        }
        if (split.length === 2 && NavigationData.gameObjects["fields"][split[0]]) {
            if (NavigationData.gameObjects["fields"][split[0]]) {
                const fields = NavigationData.gameObjects["fields"][split[0]];
                const filtered = Object.keys(fields).filter((key) => fields[key].keyword === split[1]);
                if (filtered && filtered.length > 0) {
                    const nav: Navigation = Object.create(fields[filtered[0]]);
                    nav.keyword = `${nav.type}.${nav.keyword}`;
                    locations.push(nav);
                }
            }
        }
        if (split.length === 2 && NavigationData.gameObjects["fields"][`store.${split[0]}`]) {
            const fields = NavigationData.gameObjects["fields"][`store.${split[0]}`];
            const filtered: Navigation[] = fields.filter((nav: Navigation) => nav.keyword === keyword);
            if (filtered && filtered.length > 0) {
                locations.push(filtered[0]);
            }
        }

        if (locations && locations.length > 0) {
            return locations;
        }

        return undefined;
    }

    static getNavigationDumpEntry(keyword: string): Navigation | undefined {
        const data = NavigationData.getNavigationDumpEntries(keyword);
        if (data) {
            return data[0];
        }
        return undefined;
    }

    static getNavigationDumpEntries(keyword: string): Navigation[] | undefined {
        let entries = NavigationData.find(keyword);
        if (!entries || (entries.length === 0 && keyword.indexOf(".") > 0)) {
            entries = NavigationData.resolve(keyword);
        }
        return entries;
    }

    /**
     * Determines if the line position is valid for completion or hover events
     * @remarks
     * This prevents hover/completion from triggering over keywords inside a comment or inside a string literal
     *
     * @param line The current line in the TextDocument
     * @param position The current position in the TextDocument
     * @returns `True` if the position is valid for completion or hover events
     */
    static positionIsCleanForCompletion(line: string, position: Position): boolean {
        const prefix = line.substring(0, position.character);
        // ignore hover/completion if we're in a comment
        if (prefix.indexOf("#") >= 0) {
            return false;
        }

        // ignore completion if we're inside a quoted strings
        const filtered = NavigationData.filterStringLiterals(line);
        if (filtered.substring(position.character, 1) === filterCharacter) {
            return false;
        }

        return true;
    }

    /**
     * Filters out string literals and comments from the given line of text
     * @param line The current line in the TextDocument
     * @returns A string with any string constants and comments replaced with an unused character
     */
    static filterStringLiterals(line: string): string {
        let parsed = "";
        let insideSingleQuote = false;
        let insideDoubleQuote = false;
        let insideBracket = false;
        let escaped = false;

        for (const c of line) {
            if (c === "\\") {
                if (!insideBracket && (insideSingleQuote || insideDoubleQuote)) {
                    escaped = true;
                    parsed += filterCharacter;
                } else {
                    parsed += c;
                }
                continue;
            } else if (!escaped && c === '"') {
                if (!insideSingleQuote) {
                    insideDoubleQuote = !insideDoubleQuote;
                    if (!insideDoubleQuote) {
                        parsed += filterCharacter;
                        continue;
                    }
                }
            } else if (!escaped && c === "'") {
                if (!insideDoubleQuote) {
                    insideSingleQuote = !insideSingleQuote;
                    if (!insideSingleQuote) {
                        parsed += filterCharacter;
                        continue;
                    }
                }
            } else if (c === "[" && (insideSingleQuote || insideDoubleQuote)) {
                if (insideBracket) {
                    // a second bracket
                    insideBracket = false;
                } else {
                    insideBracket = true;
                }
            } else if (c === "]" && (insideSingleQuote || insideDoubleQuote)) {
                insideBracket = false;
                parsed += c;
                continue;
            } else if (c === "#") {
                if (!insideSingleQuote && !insideDoubleQuote) {
                    parsed += c;
                    parsed += filterCharacter.repeat(line.length - parsed.length);
                    return parsed;
                }
            }

            if (!insideBracket && (insideSingleQuote || insideDoubleQuote)) {
                parsed += filterCharacter;
            } else {
                parsed += c;
            }

            escaped = false;
        }

        return parsed;
    }

    /**
     * Returns whether or not the given keyword is the name of a Class
     * @param keyword - The keyword to validate
     * @returns `True` if the keyword is a Class definition
     */
    static isClass(keyword: string): string | undefined {
        const classes = NavigationData.data.location["class"];
        if (keyword in classes) {
            return keyword;
        } else {
            const init = keyword + ".__init__";
            const base = NavigationData.resolve(init);
            if (base && base[0].keyword.indexOf(".") > 0) {
                return base[0].keyword.split(".")[0];
            }
            const defineType: DataType = NavigationData.gameObjects["define_types"][keyword];
            if (defineType && defineType.baseClass && defineType.baseClass.indexOf("(") > 0) {
                const baseC = defineType.baseClass.substring(0, defineType.baseClass.indexOf("("));
                return this.isClass(baseC);
            }
        }

        return;
    }

    static getClassAutoComplete(keyword: string): CompletionItem[] | undefined {
        const newList: CompletionItem[] = [];
        const prefix = keyword + ".";

        // get any inherited class items
        const cls = NavigationData.data.location["class"][keyword];
        if (cls) {
            if (cls.type && cls.type.length > 0) {
                const bases = cls.type.split(",");
                for (const base of bases) {
                    const items = NavigationData.getClassAutoComplete(base.trim());
                    if (items) {
                        for (const item of items) {
                            newList.push(item);
                        }
                    }
                }
            }
        }

        // get the callables
        const callables = NavigationData.data.location["callable"];
        if (callables) {
            const filtered = Object.keys(callables).filter((key) => key.indexOf(prefix) === 0);
            if (filtered) {
                for (const key in filtered) {
                    const label = filtered[key].substring(prefix.length);
                    if (!newList.some((e) => e.label === label)) {
                        newList.push(new CompletionItem(label, CompletionItemKind.Method));
                    }
                }
            }
        }

        // get any properties
        const properties = NavigationData.gameObjects["properties"][keyword];
        if (properties) {
            for (const p of properties) {
                if (!newList.some((e) => e.label === p.keyword)) {
                    if (p.source === "property") {
                        newList.push(new CompletionItem(p.keyword, CompletionItemKind.Property));
                    } else {
                        newList.push(new CompletionItem(p.keyword, CompletionItemKind.Variable));
                    }
                }
            }
        }

        // get any fields
        const fields = NavigationData.gameObjects["fields"][keyword];
        if (fields) {
            for (const p of fields) {
                if (!newList.some((e) => e.label === p.keyword)) {
                    newList.push(new CompletionItem(p.keyword, CompletionItemKind.Field));
                }
            }
        }

        return newList;
    }

    static resolve(keyword: string): Navigation[] | undefined {
        const split = keyword.split(".");
        if (split.length < 2) {
            return;
        }

        const entries = NavigationData.find(split[0]);
        if (entries && entries.length === 1) {
            const entry = entries[0];
            if (entry && entry.filename && entry.filename !== "") {
                const line = getDefinitionFromFile(entry.filename, entry.location);
                if (line) {
                    const base = getBaseTypeFromDefine(keyword, line.keyword);
                    if (base) {
                        return NavigationData.find(`${base}.${split[1]}`);
                    }
                }
            }
        }
        return;
    }

    static getClassData(location: Navigation): Navigation {
        const def = getDefinitionFromFile(location.filename, location.location);
        if (def) {
            if (!location.documentation || location.documentation.length === 0) {
                location.documentation = def.documentation;
            }

            if (!location.args || location.args.length === 0) {
                if (location.source === "class") {
                    const init = NavigationData.data.location["callable"][`${location.keyword}.__init__`];
                    if (init) {
                        const initData = getDefinitionFromFile(init[0], init[1]);
                        if (initData) {
                            let args = initData.args.replace("(self, ", "(");
                            args = args.replace("(self)", "()");
                            location.args = args;
                        }
                    } else {
                        // if this class has no __init__ but has a base, look for its __init__
                        const bases = location.type.split(",");
                        for (const base of bases) {
                            if (location.args.length === 0) {
                                const initFunc = NavigationData.data.location["callable"][`${base}.__init__`];
                                if (initFunc) {
                                    const initData = getDefinitionFromFile(initFunc[0], initFunc[1]);
                                    if (initData && initData.args && initData.args.length > 0) {
                                        let args = initData.args.replace("(self, ", "(");
                                        args = args.replace("(self)", "()");
                                        location.args = args;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    location.args = def.args;
                }
            }
        }
        return location;
    }

    static getClassProperties(keyword: string, document: TextDocument, location: number): Navigation[] {
        // find @property attributes in the class definition
        const props: Navigation[] = [];
        const rxDef = /^def\s+(\w*).*:/;
        const rxVariable = /^\s*(\w*)\s*=\s*(.*$)/;
        const filename = stripWorkspaceFromFile(document.uri.path);
        try {
            let index = location;
            const line = document.lineAt(index - 1).text;
            const spacing = line.indexOf("class " + keyword);
            let finished = false;
            while (!finished && index < document.lineCount) {
                let line2 = document.lineAt(index).text.replace(/[\n\r]/g, "");
                const indent = line2.length - line2.trimStart().length;
                if (line2.length > 0 && indent <= spacing) {
                    finished = true;
                    break;
                }
                line2 = line2.trim();

                const matches = line2.match(rxDef);
                if (matches) {
                    // if document edits moved the callables, then update the location
                    const defineKeyword = `${keyword}.${matches[1]}`;
                    const currentDef = NavigationData.data.location["callable"][defineKeyword];
                    if (currentDef && currentDef[0] === filename) {
                        if (currentDef[1] !== index + 1) {
                            currentDef[1] = index + 1;
                        }
                    } else {
                        NavigationData.data.location["callable"][defineKeyword] = [filename, index + 1];
                    }
                }

                // class variables and constants
                const variable = line2.match(rxVariable);
                if (variable && indent === spacing * 2) {
                    const documentation = `::class ${keyword}:\n    ${line2}`;
                    const nav = new Navigation("variable", variable[1], filename, index + 2, documentation, "", keyword, variable.index);
                    props.push(nav);
                }

                if (line2.startsWith("@property")) {
                    const matches = document
                        .lineAt(index + 1)
                        .text.trim()
                        .match(rxDef);
                    if (matches) {
                        const pyDocs = getPyDocsFromTextDocumentAtLine(document, index + 2);
                        const documentation = `${pyDocs}::class ${keyword}:\n    @property\n    def ${matches[1]}(self):`;
                        const nav = new Navigation("property", matches[1], filename, index + 2, documentation, "", keyword, matches.index);
                        props.push(nav);
                    }
                    index++;
                }
                index++;
            }
            return props;
        } catch (error) {
            return props;
        }
    }

    static getClassFields(keyword: string, document: TextDocument, location: number): Navigation[] {
        // find fields in the __init__ method of the class definition
        const props: Navigation[] = [];
        if (!document || !document.lineCount) {
            return props;
        }

        const filename = stripWorkspaceFromFile(document.uri.path);
        const rxDef = /^\s*(self)\.(\w*)\s*=\s*(.*$)/;
        try {
            let index = location;
            const line = document.lineAt(index - 1).text;
            if (!line) {
                return props;
            }

            const spacing = line.indexOf("def ");
            if (spacing < 0) {
                return props;
            }
            let finished = false;
            while (!finished && index < document.lineCount) {
                let line = document.lineAt(index).text.replace(/[\n\r]/g, "");
                if (line.length > 0 && line.length - line.trimStart().length <= spacing) {
                    finished = true;
                    break;
                }
                line = line.trim();
                const matches = line.match(rxDef);
                if (matches) {
                    const pyDocs = getPyDocsFromTextDocumentAtLine(document, index);
                    const documentation = `${pyDocs}::class ${keyword}:\n    def __init__(self):\n        self.${matches[2]} = ...`;
                    const nav = new Navigation("field", matches[2], filename, index + 1, documentation, "", keyword, matches.index);
                    if (!props.includes(nav)) {
                        props.push(nav);
                    }
                }
                index++;
            }
            return props;
        } catch (error) {
            return props;
        }
    }

    static getNavigationObject(source: string, keyword: string, array: any): Navigation {
        /*
		0 base file,
		1 kind,
		2 args,
		3 class,
		4 type,
		5 docs
		*/

        if (typeof array[0] === "string" && (array[0] === "obsolete" || array[0] === "transitions")) {
            source = array[0];
        } else if (typeof array[4] === "string" && array[4] === "Action") {
            source = array[4].toLowerCase();
        } else if (source === "equivalent") {
            source = array[0];
        }

        return new Navigation(
            source,
            keyword,
            "", //filename
            0, //location
            array[5], //documentation
            array[2], //args
            array[4] //type
        );
    }

    /**
     * Scans the workspace for any supported script files and searches them for class definitions
     */
    static async scanForScriptFiles(): Promise<boolean> {
        const files = await workspace.findFiles("**/*.rpy");
        if (files && files.length > 0) {
            for (const file of files) {
                const document = await workspace.openTextDocument(file);
                const filename = stripWorkspaceFromFile(cleanUpPath(file.path));
                NavigationData.scanDocumentForClasses(filename, document);
            }
        }
        return true;
    }

    /**
     * Scans the workspace for any supported images
     */
    static async scanForImages(): Promise<boolean> {
        const files = await workspace.findFiles("**/*.{png,jpg,jpeg,webp}");
        if (files && files.length > 0) {
            for (const file of files) {
                const filename = stripWorkspaceFromFile(file.path);
                const displayable = NavigationData.getPythonName(filename);
                if (displayable) {
                    const key = extractFilenameWithoutExtension(filename);
                    if (key) {
                        const path = stripWorkspaceFromFile(cleanUpPath(file.path));
                        const displayable = new Displayable(key, "image", "", path, -1);
                        NavigationData.data.location["displayable"][key] = displayable;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Scans the workspace for any supported fonts
     */
    static async scanForFonts(): Promise<boolean> {
        const files = await workspace.findFiles("**/*.{ttf,otf,ttc}");
        if (files && files.length > 0) {
            for (const file of files) {
                const filename = stripWorkspaceFromFile(file.path);
                let key = filename.replace(/^(game\/)/, "");
                if (key.endsWith(".ttc")) {
                    key = "0@" + key;
                }
                NavigationData.gameObjects["fonts"][key] = key;
            }
        }
        return true;
    }

    /**
     * Scans the workspace for any supported audio files
     */
    static async scanForAudio(): Promise<boolean> {
        const files = await workspace.findFiles("**/*.{opus,ogg,mp3,wav}");
        if (files && files.length > 0) {
            for (const file of files) {
                const filename = stripWorkspaceFromFile(file.path);

                // add the path relative to the workspace/game folder
                const key = filename.replace(/^(game\/)/, "");
                NavigationData.gameObjects["audio"][key] = '"' + key + '"';

                // if this file is in the game/audio folder and can be represented
                // as a python variable, add it to the audio namespace
                if (filename.startsWith("game/audio/")) {
                    const pythonName = NavigationData.getPythonName(filename);
                    if (pythonName) {
                        const key = "audio." + extractFilenameWithoutExtension(filename);
                        if (key && !NavigationData.gameObjects["audio"][key]) {
                            NavigationData.gameObjects["audio"][key] = key;
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * Deletes any scanned data related to the given filename
     * @param filename - The filename for the script file
     */
    static clearScannedDataForFile(filename: string) {
        if (NavigationData.data.location === undefined) {
            NavigationData.data.location = {};
        }
        const categories = ["callable", "class", "displayable", "persistent", "properties", "fields", "stores"];
        for (const cat of categories) {
            let category = NavigationData.data.location[cat];
            if (category) {
                for (const key in category) {
                    if (category[key] instanceof Navigation) {
                        if (category[key].filename === filename) {
                            delete category[key];
                        }
                    } else {
                        if (category[key][0] === filename) {
                            delete category[key];
                        }
                    }
                }
            }
            category = NavigationData.gameObjects[cat];
            if (category) {
                for (const key in category) {
                    if (category[key] instanceof Navigation) {
                        if (category[key].filename === filename) {
                            delete category[key];
                        }
                    } else {
                        if (category[key][0] === filename) {
                            delete category[key];
                        }
                    }
                }
            }
        }
    }

    /**
     * Scans the given TextDocument looking for Ren'Py commands and definitions
     * @param filename - The filename for the script file
     * @param document - The TextDocument for the script file
     */
    static scanDocumentForClasses(filename: string, document: TextDocument) {
        const rxKeywordList = /\s*(register_channel|register_statement|default|define|class)[\s()]+/;
        const rxClass = /^\s*class\s+(\w*)\s*(\(.*\))?.*:/;
        const rxDisplayable = /^\s*(image)\s+([^=.]*)\s*[=]\s*(.+)|(layeredimage)\s+(.+):|(image)\s+([^=.:]*)\s*:/;
        const rxChannels = /.*renpy.(audio|music).register_channel\s*\(\s*"(\w+)"(.*)/;
        const rxPersistent = /^\s*(default|define)\s+persistent\.([a-zA-Z]+[a-zA-Z0-9_]*)\s*=\s*(.*$)/;
        const rxDefaultDefine = /^(default|define)\s+([a-zA-Z0-9._]+)\s*=\s*([\w'"`[{]*)/;
        const rxCharacters = /^\s*(define)\s*(\w*)\s*=\s*(Character|DynamicCharacter)\s*\((.*)/;
        const rxStatements = /.*renpy.register_statement\s*\("(\w+)"(.*)\)/;
        const rxOutlines = /[\s_]*outlines\s+(\[.*\])/;
        const rxInitStore = /^(init)\s+([-\d]+\s+)*python\s+in\s+(\w+):|^python\s+early\s+in\s+(\w+):/;
        const gameFilename = stripWorkspaceFromFile(document.uri.path);
        const internal = NavigationData.renpyFunctions.internal;
        const transitions = Object.keys(internal).filter((key) => internal[key][0] === "transitions");

        for (let i = 0; i < document.lineCount; ++i) {
            let line = document.lineAt(i).text;

            let appendLine = i;
            const containsKeyword = line.match(rxKeywordList);
            if (containsKeyword) {
                // check for unterminated parenthesis for multiline declarations
                let noString = NavigationData.filterStringLiterals(line);
                let openCount = (noString.match(/\(/g) || []).length;
                let closeCount = (noString.match(/\)/g) || []).length;
                while (openCount > closeCount && appendLine < document.lineCount - 1 && appendLine < 10) {
                    appendLine++;
                    line = line + document.lineAt(appendLine).text + "\n";
                    noString = NavigationData.filterStringLiterals(line);
                    openCount = (noString.match(/\(/g) || []).length;
                    closeCount = (noString.match(/\)/g) || []).length;
                }
            }

            if (line.trim().length === 0) {
                continue;
            }

            // match class definitions
            const matches = line.match(rxClass);
            if (matches) {
                const match = matches[1];
                let base = matches[2];
                if (base) {
                    base = base.replace(/\(/g, "").replace(/\)/g, "").trim();
                }
                const nav = new Navigation("class", match, filename, i + 1, "", "", base);
                NavigationData.data.location["class"][match] = nav;
                const properties = NavigationData.getClassProperties(match, document, i + 1);
                if (properties) {
                    NavigationData.gameObjects["properties"][match] = properties;
                }
                const initData = NavigationData.data.location["callable"][`${match}.__init__`];
                if (initData && initData[0] === gameFilename) {
                    const fields = NavigationData.getClassFields(match, document, initData[1]);
                    if (fields) {
                        NavigationData.gameObjects["fields"][match] = fields;
                    }
                }
                continue;
            }
            // match displayable definitions
            const displayables = line.match(rxDisplayable);
            if (displayables) {
                let match = "";
                let imageType = "image";
                if (displayables[2]) {
                    // image match
                    match = displayables[2].trim();
                } else if (displayables[5]) {
                    // layered image match
                    match = displayables[5].trim();
                    imageType = displayables[4].trim();
                } else if (displayables[7]) {
                    // atl image match
                    match = displayables[7].trim();
                    imageType = displayables[6].trim();
                }
                if (match.length > 0) {
                    const displayable = new Displayable(match, imageType, displayables[3], filename, i + 1);
                    NavigationData.data.location["displayable"][match] = displayable;
                }
                continue;
            }
            // match audio channels created with register_channel
            const channels = line.match(rxChannels);
            if (channels) {
                const match = channels[2];
                NavigationData.gameObjects["channels"][match] = [filename, i + 1];
                continue;
            }
            // match persistent definitions (define persistent)
            const persistents = line.match(rxPersistent);
            if (persistents) {
                const match = persistents[2];
                NavigationData.data.location["persistent"][match] = [filename, i + 1];
                continue;
            }
            // match outlines
            const outlines = line.match(rxOutlines);
            if (outlines) {
                const match = outlines[1];
                if (!NavigationData.data.location["outlines"]) {
                    NavigationData.data.location["outlines"] = {};
                    NavigationData.data.location["outlines"]["array"] = [];
                }
                let currentOutlines = NavigationData.data.location["outlines"]["array"];
                if (currentOutlines === undefined) {
                    currentOutlines = [];
                }
                if (!currentOutlines.includes(match)) {
                    currentOutlines.push(match);
                }
                NavigationData.data.location["outlines"]["array"] = currentOutlines;
                continue;
            }
            // match default/defines
            const defaults = line.match(rxDefaultDefine);
            if (defaults) {
                const datatype = new DataType(defaults[2], defaults[1], defaults[3]);
                datatype.checkTypeArray("transitions", transitions);
                NavigationData.gameObjects["define_types"][defaults[2]] = datatype;
                updateNavigationData("define", defaults[2], filename, i);
            }
            // match stores
            const stores = line.match(rxInitStore);
            if (stores) {
                let match = "";
                if (stores[4] !== undefined) {
                    match = stores[4];
                } else {
                    match = stores[3];
                }
                NavigationData.gameObjects["stores"][match] = [filename, i + 1];
                const datatype = new DataType(stores[3], "default", "store");
                NavigationData.gameObjects["define_types"][match] = datatype;
                continue;
            }
            // match characters
            const characters = line.match(rxCharacters);
            if (characters) {
                let charName = "";
                let charImage = "";
                let dynamic = "";
                const split = splitParameters(characters[4], true);
                if (split) {
                    charName = stripQuotes(split[0]);
                    charImage = getNamedParameter(split, "image");
                    dynamic = getNamedParameter(split, "dynamic");
                }
                if (characters[3] === "DynamicCharacter") {
                    dynamic = "True";
                } else if (!dynamic || dynamic.length === 0) {
                    dynamic = "False";
                }

                const chrObject = new Character(charName, charImage, dynamic, split, filename, i);
                NavigationData.gameObjects["characters"][characters[2]] = chrObject;
                continue;
            }

            // creator defined statements
            const statements = line.match(rxStatements);
            if (statements) {
                const statementName = statements[1];
                const statementArgs = splitParameters(statements[1] + statements[2], true);
                let statementDocs = "";
                const execute = getNamedParameter(statementArgs, "execute");
                if (execute && execute.length > 0) {
                    const entries = NavigationData.find(execute);
                    if (entries) {
                        const def = getDefinitionFromFile(entries[0].filename, entries[0].location);
                        if (def) {
                            statementDocs = def.documentation;
                        }
                    }
                }

                const statement = new Navigation("statement", statementName, filename, i + 1, statementDocs, "", "cds", statements.index);
                NavigationData.data.location["statement"][statementName] = statement;
                continue;
            }
        }
    }

    static async getCharacterImageAttributes() {
        //logMessage(LogLevel.Info, "getCharacterImageAttributes");
        const characters = NavigationData.gameObjects["characters"];
        const displayables = NavigationData.data.location["displayable"];
        for (const key in characters) {
            const char = characters[key];
            const attributes: string[] = [];
            if (char && char.image && char.image.length > 0) {
                const displayable = displayables[char.image];
                if (displayable) {
                    // find layered image attributes
                    if (displayable.image_type === "layeredimage") {
                        const liAttributes = await NavigationData.getLayeredImageAttributes(displayable.name, displayable.filename, displayable.location);
                        if (liAttributes) {
                            for (const attr of liAttributes) {
                                if (!attributes.includes(attr)) {
                                    attributes.push(attr);
                                }
                            }
                        }
                    }
                    // find defined image attributes
                    const filtered = Object.keys(displayables).filter((key) => displayables[key].tag === char.image);
                    if (filtered) {
                        for (const key of filtered) {
                            if (key !== char.image) {
                                const attr = key.substring(char.image.length + 1);
                                if (!attributes.includes(attr)) {
                                    attributes.push(attr);
                                }
                            }
                        }
                    }
                }
                NavigationData.gameObjects["attributes"][key] = attributes;
            }
        }
    }

    static async getLayeredImageAttributes(keyword: string, filename: string, location: number): Promise<string[]> {
        // find attributes in the layered image definition
        const displayables = NavigationData.data.location["displayable"];
        const path = getFileWithPath(filename);
        const document = await workspace.openTextDocument(path);
        const attributes: string[] = [];
        const rxAttr = /^\s*attribute\s+(\w*)/;
        try {
            let index = location;
            const line = document.lineAt(index - 1).text;
            const spacing = line.indexOf("layeredimage " + keyword);
            let finished = false;
            while (!finished && index < document.lineCount) {
                let line = document.lineAt(index).text.replace(/[\n\r]/g, "");
                if (line.length > 0 && line.length - line.trimLeft().length <= spacing) {
                    finished = true;
                    break;
                }
                line = line.trim();
                if (line.startsWith("attribute")) {
                    // specific attribute
                    const match = line.match(rxAttr);
                    if (match) {
                        if (!attributes.includes(match[1])) {
                            attributes.push(match[1]);
                        }
                    }
                } else if (line.startsWith("group") && line.indexOf("auto") > 0) {
                    // auto attributes
                    const match = line.match(/^\s*group\s+(\w*)/);
                    if (match) {
                        const imageKey = `${keyword}_${match[1]}_`;
                        const filtered = Object.keys(displayables).filter((key) => key.startsWith(imageKey));
                        if (filtered) {
                            for (const d of filtered) {
                                if (d !== imageKey) {
                                    const attr = d.substring(imageKey.length);
                                    if (attr.indexOf("_") > 0) {
                                        const split = attr.split("_");
                                        if (!attributes.includes(split[0])) {
                                            attributes.push(split[0]);
                                        }
                                    } else {
                                        if (!attributes.includes(attr)) {
                                            attributes.push(attr);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                index++;
            }
            return attributes;
        } catch (error) {
            return attributes;
        }
    }

    /**
     * Returns whether or not the given filename can be represented as a Python variable
     * @param filename - The filename
     * @returns True if the filename can be represented as a Python variable
     */
    static getPythonName(filename: string): boolean | undefined {
        const rx = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        const fnOnly = extractFilenameWithoutExtension(filename) || "";
        const split = fnOnly.split(" ");
        for (let i = 0; i < split.length; i++) {
            const match = split[i].match(rx);
            if (!match || match.length === 0) {
                return false;
            }
        }

        return true;
    }
}

export function readNavigationJson() {
    try {
        const filepath = getNavigationJsonFilepath();
        logMessage(LogLevel.Info, `readNavigationJson: ${filepath}`);
        let flatData;
        try {
            flatData = fs.readFileSync(filepath, "utf-8");
        } catch (error) {
            flatData = "{}";
        }
        const json = JSON.parse(flatData);
        return json;
    } catch (error) {
        logToast(LogLevel.Error, `readNavigationJson error: ${error}`);
    }
}

export function updateNavigationData(type: string, keyword: string, filename: string, line: number) {
    if (type === "define" || type === "screen" || type === "label" || type === "transform" || type === "callable") {
        const category = NavigationData.data.location[type];
        if (category[keyword]) {
            const entry = category[keyword];
            if (entry) {
                if (entry[0] === filename && entry[1] !== line + 1) {
                    entry[1] = line + 1;
                }
            }
        } else {
            category[keyword] = [filename, line + 1];
        }
    }
}

export function getStatusBarText() {
    if (!window.activeTextEditor || !window.activeTextEditor.document || window.activeTextEditor.document.languageId !== "renpy") {
        return "";
    }

    if (NavigationData.data) {
        if (NavigationData.data.name !== undefined) {
            return `${NavigationData.data.name} v${NavigationData.data.version}`;
        } else {
            return "(Uncompiled Game)";
        }
    } else {
        return "";
    }
}
