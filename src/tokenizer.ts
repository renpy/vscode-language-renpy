// Workspace and file functions
"use strict";

import { Range, TextDocument } from "vscode";
import { Token } from "./token-definitions";

export function tokenizeDocument(document: TextDocument): Token[] {
    const text = document.getText();

    const tokens: Token[] = [];

    let match: RegExpExecArray | null;
    while ((match = regEx.exec(text))) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);

        tokens.push(new Token(TokenType.Number, PunctuationSubType.WhiteSpace, new Range(startPos, endPos)));
    }

    return tokens;
}
