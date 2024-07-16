// Navigation classes
"use strict";

import { MarkdownString, ParameterInformation, Position, Range, SignatureInformation, TextDocument } from "vscode";
import { NavigationData } from "./navigation-data";

export class Navigation {
    source: string;
    keyword: string;
    filename: string;
    location: number;
    character: number;
    args: string;
    type: string;
    documentation: string;

    constructor(source: string, keyword: string, filename: string, location: number, documentation = "", args = "", type = "", character = 0) {
        this.source = source;
        this.keyword = keyword;
        this.filename = filename;
        this.location = location;
        this.character = character;
        this.documentation = documentation;
        this.args = args;
        this.type = type;
        if (this.documentation) {
            this.documentation = this.documentation.replace(/\\\\/g, '"');
        }
    }

    toRange(): Range {
        return new Range(this.location - 1, this.character, this.location - 1, this.character + this.keyword.length);
    }
}

export class DataType {
    variable: string;
    define: string;
    baseClass: string;
    type: string;

    constructor(variable: string, define: string, baseClass: string) {
        this.variable = variable;
        this.define = define;
        this.baseClass = baseClass;
        this.type = "";
        if (baseClass === "True" || baseClass === "False") {
            this.type = "boolean";
        } else if (!isNaN(+this.baseClass)) {
            this.type = "number";
        } else if (baseClass === "_" || baseClass.startsWith('"') || baseClass.startsWith("`") || baseClass.startsWith("'")) {
            this.type = "str";
        } else if (baseClass.startsWith("[")) {
            this.type = "list";
        } else if (baseClass.startsWith("{")) {
            this.type = "dictionary";
        } else if (baseClass.startsWith("(") && baseClass.endsWith(")")) {
            this.type = "tuple";
        } else if (baseClass === "store") {
            this.type = "store";
        }
    }

    checkTypeArray(type: string, typeArray: string[]) {
        if (typeArray.includes(this.baseClass)) {
            this.type = type;
        }
    }
}

export function getPyDocsAtLine(lines: string[], line: number): string {
    const lb: string[] = [];
    let index: number = line;
    let finished = false;
    let insideComment = false;

    let text = lines[index].replace(/[\n\r]/g, "");
    const spacing = text.length - text.trimLeft().length;
    let margin = 0;

    while (!finished && index < lines.length) {
        text = lines[index].replace(/[\n\r]/g, "");
        if (text.length > 0 && text.length - text.trimLeft().length <= spacing && index > line) {
            finished = true;
            break;
        }

        if (text.indexOf('"""') >= 0) {
            if (insideComment) {
                finished = true;
            } else {
                insideComment = true;
                margin = text.indexOf('"""');
                text = text.substring(margin + 3);
                if (text.length > 0) {
                    if (text.indexOf('"""') >= 0) {
                        return text.replace('"""', "");
                    }
                    lb.push(text);
                }
            }
        } else if (insideComment) {
            if (text.length === 0 || text.length - text.trimLeft().length >= margin + 3) {
                lb.push("\n" + text.substring(margin));
            } else {
                lb.push(text.substring(margin));
            }
        }
        index++;
    }

    return lb.join("\n").trim();
}

export function getPyDocsFromTextDocumentAtLine(document: TextDocument, line: number): string {
    const lb: string[] = [];
    let index: number = line;
    let finished = false;
    let insideComment = false;

    let text = document.lineAt(index).text;
    const spacing = text.length - text.trimLeft().length;
    let margin = 0;

    while (!finished && index < document.lineCount) {
        text = document.lineAt(index).text;
        if (text.length > 0 && text.length - text.trimLeft().length <= spacing && index > line) {
            finished = true;
            break;
        }

        if (text.indexOf('"""') >= 0) {
            if (insideComment) {
                finished = true;
            } else {
                insideComment = true;
                margin = text.indexOf('"""');
                text = text.substring(margin + 3);
                if (text.length > 0) {
                    if (text.indexOf('"""') >= 0) {
                        return text.replace('"""', "");
                    }
                    lb.push(text);
                }
            }
        } else if (insideComment) {
            if (text.length === 0 || text.length - text.trimLeft().length >= margin + 3) {
                lb.push("\n" + text.substring(margin));
            } else {
                lb.push(text.substring(margin));
            }
        }
        index++;
    }

    return lb.join("\n").trim();
}

export function getBaseTypeFromDefine(keyword: string, line: string): string | undefined {
    const rx = /^(default|define)\s+(\w*)\s*=\s*(\w*)\(/;
    line = line.trim();
    const matches = line.match(rx);
    if (matches && matches.length >= 4) {
        const cls = matches[3];
        return cls;
    }
    return;
}

export function getArgumentParameterInfo(location: Navigation, line: string, position: number): SignatureInformation {
    const documentation = new MarkdownString();
    documentation.appendMarkdown(formatDocumentationAsMarkdown(location.documentation));
    const signature = new SignatureInformation(`${location.keyword}${location.args}`, documentation);

    let parsed = "";
    let insideQuote = false;
    let insideParens = false;
    let insideBrackets = false;
    let insideBraces = false;
    let isFirstParen = true;

    // preprocess fragment
    for (let c of line) {
        if (c === '"') {
            c = "'";
            if (!insideQuote) {
                insideQuote = true;
            } else {
                insideQuote = false;
            }
        } else if (c === " ") {
            c = "_";
        } else if (c === "(") {
            if (!isFirstParen) {
                insideParens = true;
            }
            isFirstParen = false;
        } else if (c === "[") {
            insideBrackets = true;
        } else if (c === "{") {
            insideBraces = true;
        } else if (c === ")") {
            insideParens = false;
        } else if (c === "]") {
            insideBrackets = false;
        } else if (c === "}") {
            insideBraces = false;
        } else if (c === "," && (insideQuote || insideParens || insideBrackets || insideBraces)) {
            c = ";";
        }
        parsed += c;
    }

    // split the user's args
    const firstParenIndex = parsed.indexOf("(");
    const parameterStart = firstParenIndex + 1;
    const parsedIndex = parsed.substring(parameterStart);
    const split = parsedIndex.split(",");

    const fragment = parsed.substring(0, position);
    const fragmentSplit = parsed.substring(fragment.indexOf("(") + 1).split(",");

    // calculate the current parameter
    let currentArgument: number = fragmentSplit.length - 1;
    let kwarg = "";
    if (split[currentArgument].indexOf("=") > 0) {
        const kwargSplit = split[currentArgument].split("=");
        kwarg = kwargSplit[0].trim().replace("_", "");
    }

    // process the method's args
    const parameters: ParameterInformation[] = [];
    let args = location.args;
    if (args) {
        if (args.startsWith("(")) {
            args = args.substring(1);
        }
        if (args.endsWith(")")) {
            args = args.substring(0, args.length - 1);
        }

        const argsList = args.split(",");
        if (argsList) {
            let index = 0;

            if (kwarg && kwarg.length > 0) {
                if (argsList[argsList.length - 1].trim() === "**kwargs") {
                    currentArgument = argsList.length - 1;
                }
            }

            for (const arg of argsList) {
                const split = arg.trim().split("=");
                let argDocs = "`" + split[0].trim() + "` parameter";
                if (split.length > 1) {
                    argDocs = argDocs + " (optional). Default is `" + split[1].trim() + "`.";
                } else {
                    argDocs = argDocs + ".";
                }

                const prm = new ParameterInformation(arg.trim(), new MarkdownString(argDocs));
                parameters.push(prm);

                if (arg.trim().indexOf("=") > 0) {
                    const kwargSplit = arg.trim().split("=");
                    if (kwargSplit[0] === kwarg) {
                        currentArgument = index;
                    }
                } else if (arg.trim() === kwarg) {
                    currentArgument = index;
                }

                index++;
            }
        }
    }

    signature.activeParameter = currentArgument;
    signature.parameters = parameters;

    return signature;
}

export function formatDocumentationAsMarkdown(documentation: string): string {
    documentation = documentation.replace(/\\/g, '"');
    documentation = documentation.replace("```", "\n\n```");
    documentation = documentation
        .replace(/:other:/g, "")
        .replace(/:func:/g, "")
        .replace(/:var:/g, "")
        .replace(/:ref:/g, "")
        .replace(/:class:/g, "")
        .replace(/:tpref:/g, "")
        .replace(/:propref:/g, "");
    return documentation.trim();
}

export function splitParameters(line: string, trim = false): string[] {
    const args: string[] = [];

    let parsed = "";
    let insideQuote = false;
    let insideParens = false;
    let insideBrackets = false;
    let insideBraces = false;

    for (let c of line) {
        if (c === '"') {
            if (!insideQuote) {
                insideQuote = true;
            } else {
                insideQuote = false;
            }
        } else if (c === "(") {
            insideParens = true;
        } else if (c === "[") {
            insideBrackets = true;
        } else if (c === "{") {
            insideBraces = true;
        } else if (c === ")") {
            insideParens = false;
        } else if (c === "]") {
            insideBrackets = false;
        } else if (c === "}") {
            insideBraces = false;
        } else if (c === "," && (insideQuote || insideParens || insideBrackets || insideBraces)) {
            c = "\uFE50";
        }
        parsed += c;
    }

    const split = parsed.split(",");
    for (let s of split) {
        if (trim) {
            s = s.trim();
        }
        s = s.replace("\uFE50", ",");
        if (trim) {
            while (s.indexOf(" =") > 0) {
                s = s.replace(" =", "=");
            }
            while (s.indexOf("= ") > 0) {
                s = s.replace("= ", "=");
            }
        }
        args.push(s);
    }

    return args;
}

export function getNamedParameter(strings: string[], named: string): string {
    const search = `${named}=`;
    let value = "";
    const filtered = strings.filter(function (str) {
        return str.indexOf(search) === 0;
    });
    if (filtered && filtered.length > 0) {
        const split = filtered[0].split("=");
        value = stripQuotes(split[1]);
    }
    return value;
}

export function stripQuotes(value: string): string {
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1);
        value = value.substring(0, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1);
        value = value.substring(0, value.length - 1);
    } else if (value.startsWith("`") && value.endsWith("`")) {
        value = value.substring(1);
        value = value.substring(0, value.length - 1);
    }
    return value;
}

export function rangeAsString(filename: string, range: Range): string {
    return `${filename}:${range.start.line};${range.start.character}-${range.end.character}`;
}

export function getCurrentContext(document: TextDocument, position: Position): string | undefined {
    const rxParentTypes = /\s*(screen|label|transform|def|class|style)\s+([a-zA-Z0-9_]+)\s*(\((.*)\):|:)/;
    const rxInitStore = /^(init)\s+([-\d]+\s+)*python\s+in\s+(\w+):/;

    let i = position.line;
    while (i >= 0) {
        const line = NavigationData.filterStringLiterals(document.lineAt(i).text);

        const storeMatch = line.match(rxInitStore);
        if (storeMatch) {
            return `store.${storeMatch[3]}`;
        } else if ((line.startsWith("python ") || line.startsWith("init ")) && line.trim().endsWith(":")) {
            return;
        }

        const indentLevel = line.length - line.trimLeft().length;
        const match = line.match(rxParentTypes);
        if (match && indentLevel < position.character) {
            return match[1];
        }
        i--;
    }

    return;
}
