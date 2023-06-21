// Semantic Token Provider
import { CancellationToken, Position, ProviderResult, Range, SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, TextDocument, languages } from "vscode";
import { Navigation, splitParameters, rangeAsString, getCurrentContext, DataType } from "./navigation";
import { NavigationData, updateNavigationData } from "./navigation-data";
import { stripWorkspaceFromFile } from "./workspace";
import { LogLevel, logMessage } from "./logger";

const tokenTypes = ["class", "parameter", "variable", "keyword"];
const tokenModifiers = ["declaration", "defaultLibrary"];
const legend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

export const semanticTokensProvider = languages.registerDocumentSemanticTokensProvider(
    "renpy",
    {
        provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens> {
            if (token.isCancellationRequested) {
                return;
            }

            if (document.languageId !== "renpy") {
                return;
            }

            return new Promise((resolve) => {
                resolve(getSemanticTokens(document));
            });
        },
    },
    legend
);

export function getSemanticTokens(document: TextDocument): SemanticTokens {
    const tokensBuilder = new SemanticTokensBuilder(legend);
    const rxKeywordList = /\s*(screen|label|transform|def|class)\s+/;
    const rxParameterList =
        /\s*(screen|label|transform|class)\s+([a-zA-Z_]\w*)\s*\((.*)\)\s*:|\s*(label)\s+([a-zA-Z_]\w*)\s*:|^(init)\s+([-\d]+\s+)*python\s+in\s+(\w+):|^(python)\s+early\s+in\s+(\w+):|\s*(class)\s+([a-zA-Z_]\w*)\s*:|\s*(def)\s+([a-zA-Z_]\w*)\s*\((.*)\)\s*(->\s*[a-zA-Z_]\w*\s*)?:/s;
    const rxVariableDefines = /^\s*(default|define)\s+([a-zA-Z]+[a-zA-Z0-9_]*)\s*=\s*(.*)/;
    const rxPersistentDefines = /^\s*(default|define)\s+persistent\.([a-zA-Z]+[a-zA-Z0-9_]*)\s*=\s*(.*)/;
    const filename = stripWorkspaceFromFile(document.uri.path);
    let insideComment = false;
    let parent = "";
    let parentLine = 0;
    let parentType = "";
    let parentArgs: string[] = [];
    let parentLocal: string[][] = [];
    let parentDefaults: { [key: string]: Navigation } = {};
    let indentLevel = 0;
    let appendLine = 0;

    for (let i = 0; i < document.lineCount; ++i) {
        let line = document.lineAt(i).text;

        // check if we've outdented out of the parent block
        if (line.length > 0 && line.length - line.trimStart().length <= indentLevel) {
            parent = "";
            parentArgs = [];
            parentLocal = [];
            parentDefaults = {};
            parentLine = 0;
            parentType = "";
        }

        appendLine = i;
        if (line.match(rxKeywordList)) {
            // check for unterminated parenthesis for multiline declarations
            let noString = NavigationData.filterStringLiterals(line);
            let openCount = (noString.match(/\(/g) || []).length;
            let closeCount = (noString.match(/\)/g) || []).length;
            while (openCount > closeCount && appendLine < document.lineCount - 1) {
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

        if (line.indexOf('"""') >= 0) {
            if (insideComment) {
                insideComment = false;
            } else {
                if (line.substring(line.indexOf('"""') + 3).indexOf('"""') < 0) {
                    insideComment = true;
                }
            }
            continue;
        }

        if (insideComment) {
            continue;
        }

        const matches = line.match(rxParameterList);
        if (matches) {
            // this line has a parameter list - tokenize the parameter ranges
            if (matches[1] !== "class" && matches[3] && matches[3].length > 0 && matches[2] !== "_") {
                indentLevel = line.length - line.trimStart().length;
                parent = matches[2];
                parentType = matches[1];
                parentLine = i + 1;
                let start = line.indexOf("(") + 1;
                const split = splitParameters(matches[3], false);
                for (const m of split) {
                    const offset = m.length - m.trimStart().length;
                    let length = m.length;
                    if (m.indexOf("=") > 0) {
                        length = m.split("=")[0].trimEnd().length;
                    }
                    const range = new Range(i, start + offset, i, start + length);
                    parentArgs.push(line.substring(start + offset, length - offset));
                    parentDefaults[m.substring(offset, length)] = new Navigation("parameter", m.substring(offset, length), filename, i + 1, "", m.trim(), "", start + offset);
                    // create a Navigation dictionary entry for this token range
                    const key = rangeAsString(filename, range);
                    const docs = `${parentType} ${parent}()`;
                    const navigation = new Navigation("parameter", matches[1], filename, parentLine, docs, "", parentType, start + offset);
                    NavigationData.gameObjects["semantic"][key] = navigation;
                    start += m.length + 1;
                }
                if (matches[1] === "def") {
                    const context = i - 1 < 0 ? undefined : getCurrentContext(document, new Position(i - 1, indentLevel));
                    if (context === undefined) {
                        updateNavigationData("callable", matches[2], filename, i);
                    } else if (context.startsWith("store.")) {
                        updateNavigationData("callable", `${context.split(".")[1]}.${matches[2]}`, filename, i);
                    }
                } else {
                    updateNavigationData(matches[1], matches[2], filename, i);
                }
            } else if (matches[1] === "screen" || matches[1] === "def" || matches[1] === "class" || matches[11] === "class") {
                // parent screen or function def with no parameters
                indentLevel = line.length - line.trimStart().length;
                parent = matches[2] || matches[12];
                parentType = matches[1] || matches[11];
                parentLine = i;
                parentArgs = [];
                parentLocal = [];
                parentDefaults = {};

                if (matches[1] === "def") {
                    const context = i - 1 < 0 ? undefined : getCurrentContext(document, new Position(i - 1, indentLevel));
                    if (context === undefined) {
                        updateNavigationData("callable", matches[2], filename, i);
                    } else if (context.startsWith("store.")) {
                        updateNavigationData("callable", `${context.split(".")[1]}.${matches[2]}`, filename, i);
                    }
                } else if (matches[1] === "screen") {
                    updateNavigationData(matches[1], matches[2], filename, i);
                }
            } else if (matches[4] === "label") {
                indentLevel = line.length - line.trimStart().length;
                const context = i - 1 < 0 ? undefined : getCurrentContext(document, new Position(i - 1, indentLevel));
                if (context === undefined) {
                    updateNavigationData("label", matches[5], filename, i);
                }
            } else if ((matches[6] === "init" && matches[8] !== undefined) || (matches[9] === "python" && matches[10] !== undefined)) {
                // named store (init python in storename)
                indentLevel = line.length - line.trimStart().length;
                if (matches[10] !== undefined) {
                    parent = matches[10];
                } else {
                    parent = matches[8];
                }
                parentType = "store";
                parentLine = i + 1;
                parentArgs = [];
                parentLocal = [];
                parentDefaults = {};
                const navigation = new Navigation("store", parent, filename, parentLine, "", "", parentType, indentLevel);
                NavigationData.gameObjects["stores"][parent] = navigation;
            }
        } else if (parent !== "") {
            // we are still inside a parent block
            // check if this line has any tokens that are parameters
            if (parentArgs.length > 0) {
                for (const a of parentArgs) {
                    try {
                        const token = escapeRegExp(a);
                        const rx = RegExp(`[^a-zA-Z_](${token})($|[^a-zA-Z_])`, "g");
                        let matches;
                        while ((matches = rx.exec(line)) !== null) {
                            const offset = matches[0].indexOf(matches[1]);
                            const length = matches[1].length;
                            if (NavigationData.positionIsCleanForCompletion(line, new Position(i, matches.index + offset))) {
                                // push the token into the token builder
                                const range = new Range(i, matches.index + offset, i, matches.index + offset + length);
                                if (token === "self" || token === "cls") {
                                    tokensBuilder.push(range, "keyword");
                                } else {
                                    tokensBuilder.push(range, "parameter");
                                }
                                // create a Navigation dictionary entry for this token range
                                const key = rangeAsString(filename, range);
                                const docs = `${parentType} ${parent}()`;
                                const parentNav = parentDefaults[matches[1]];
                                const navigation = new Navigation("parameter", matches[1], filename, parentLine, docs, "", parentType, parentNav.character);
                                NavigationData.gameObjects["semantic"][key] = navigation;
                            }
                        }
                    } catch (error) {
                        logMessage(LogLevel.Error, error as string);
                    }
                }
            }
            // tokenize any local variables
            if (parentLocal.length > 0) {
                for (const a of parentLocal) {
                    try {
                        const token = escapeRegExp(a[0]);
                        const rx = RegExp(`[^a-zA-Z_](${token})($|[^a-zA-Z_])`, "g");
                        let matches;
                        while ((matches = rx.exec(line)) !== null) {
                            const offset = matches[0].indexOf(matches[1]);
                            const length = matches[1].length;
                            if (NavigationData.positionIsCleanForCompletion(line, new Position(i, matches.index + offset))) {
                                // push the token into the token builder
                                const range = new Range(i, matches.index + offset, i, matches.index + offset + length);
                                tokensBuilder.push(range, "variable");
                                // create a Navigation dictionary entry for this token range
                                const key = rangeAsString(filename, range);
                                const parentNav = parentDefaults[`${parentType}.${parent}.${matches[1]}`];
                                if (parentNav === undefined) {
                                    continue;
                                }
                                let navSource = "variable";
                                if (a[1] === "sv") {
                                    navSource = "screen variable";
                                } else if (a[1] === "g") {
                                    navSource = "global variable";
                                }
                                const navigation = new Navigation(navSource, matches[1], filename, parentNav.location, parentNav.documentation, "", parentNav.type, parentNav.character);
                                NavigationData.gameObjects["semantic"][key] = navigation;
                            }
                        }
                    } catch (error) {
                        logMessage(LogLevel.Error, `error at ${filename}:${i}: ${error}`);
                    }
                }
            }

            // check if this line is a default and we're in a screen
            // mark the token as a screen variable
            if (parentType === "screen") {
                const rxDefault = /^\s*(default)\s+(\w*)\s*=\s*([\w'"`[{]*)/;
                const matches = rxDefault.exec(line);
                if (matches) {
                    parentLocal.push([matches[2], "sv"]);
                    // push the token into the token builder
                    const offset = matches[0].indexOf(matches[2]);
                    const range = new Range(i, matches.index + offset, i, matches.index + offset + matches[2].length);
                    tokensBuilder.push(range, "variable", ["declaration"]);
                    // create a Navigation dictionary entry for this token range
                    const key = rangeAsString(filename, range);
                    const docs = `${parentType} ${parent}()\n    ${line.trim()}`;
                    const navigation = new Navigation("screen variable", matches[2], filename, i + 1, docs, "", parentType, matches.index + offset);
                    NavigationData.gameObjects["semantic"][key] = navigation;
                    parentDefaults[`${parentType}.${parent}.${matches[2]}`] = navigation;
                }
            } else if (parentType === "def" || parentType === "store" || parentType === "class") {
                // check if this line is a variable declaration in a function or store
                // mark the token as a variable
                const rxPatterns = [/^\s*(global)\s+(\w*)/g, /\s*(for)\s+([a-zA-Z0-9_]+)\s+in\s+/g, /(\s*)([a-zA-Z0-9_,]+)\s*=\s*[a-zA-Z0-9_"]+/g];
                for (const rx of rxPatterns) {
                    let matches;
                    while ((matches = rx.exec(line)) !== null) {
                        try {
                            let start = line.indexOf(matches[2]);
                            const split = matches[2].split(",");
                            for (const m of split) {
                                const offset = m.length - m.trimStart().length;
                                if (parentArgs.includes(m.substring(offset))) {
                                    continue;
                                }

                                const length = m.length;
                                let source = "variable";
                                if (matches[1] === "global") {
                                    source = "global variable";
                                }
                                if (!parentLocal.some((e) => e[0] === m.substring(offset))) {
                                    if (matches[1] === "global") {
                                        parentLocal.push([m.substring(offset), "g"]);
                                    } else {
                                        parentLocal.push([m.substring(offset), "v"]);
                                    }
                                } else {
                                    continue;
                                }

                                // push the token into the token builder
                                const range = new Range(i, start + offset, i, start + length);
                                tokensBuilder.push(range, "variable", ["declaration"]);
                                // create a Navigation dictionary entry for this token range
                                const key = rangeAsString(filename, range);
                                let docs = "";
                                if (parentType === "store") {
                                    docs = `init python in ${parent}:\n    ${line.trim()}`;
                                } else {
                                    docs = `${parentType} ${parent}()\n    ${line.trim()}`;
                                }
                                const navigation = new Navigation(source, m.substring(offset), filename, i + 1, docs, "", parentType, start + offset);
                                NavigationData.gameObjects["semantic"][key] = navigation;
                                parentDefaults[`${parentType}.${parent}.${m.substring(offset)}`] = navigation;

                                if (parentType === "store") {
                                    const pKey = `store.${parent}`;
                                    const objKey = `${parent}.${m.substring(offset)}`;
                                    const navigation = new Navigation(source, objKey, filename, i + 1, docs, "", parentType, start + offset);

                                    if (NavigationData.gameObjects["fields"][pKey] === undefined) {
                                        NavigationData.gameObjects["fields"][pKey] = [];
                                    }
                                    NavigationData.gameObjects["fields"][pKey] = NavigationData.gameObjects["fields"][pKey].filter((e: { keyword: string }) => e.keyword !== objKey);
                                    NavigationData.gameObjects["fields"][pKey].push(navigation);
                                }

                                start += m.length + 1;
                            }
                        } catch (error) {
                            logMessage(LogLevel.Error, `error at ${filename}:${i}: ${error}`);
                        }
                    }
                }
            }
        } else if (parent === "") {
            let match = line.match(rxVariableDefines);
            if (match) {
                const datatype = new DataType(match[2], match[1], match[3]);
                NavigationData.gameObjects["define_types"][match[2]] = datatype;
                updateNavigationData("define", match[2], filename, i);
            }
            match = line.match(rxPersistentDefines);
            if (match) {
                const gameObjects = NavigationData.data.location["persistent"];
                gameObjects[match[2]] = [filename, i + 1];
            }
        }
    }

    return tokensBuilder.build();
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
