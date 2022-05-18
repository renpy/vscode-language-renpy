// Signature Provider
"use strict";

import { TextDocument, Position, SignatureHelp, SignatureHelpContext } from "vscode";
import { getKeywordPrefix } from "./extension";
import { getArgumentParameterInfo } from "./navigation";
import { NavigationData } from "./navigation-data";

/**
 * Gets method signature help for the keyword at the given position in the given document
 * @param document - The current TextDocument
 * @param position - The current position
 * @param context - The current context
 * @returns A SignatureHelp that describes the current method and the current argument
 */
export function getSignatureHelp(document: TextDocument, position: Position, context: SignatureHelpContext): SignatureHelp | undefined {
    let triggerWord = "";

    //find the keyword before the last '(' character before the current position
    const currentLine = document.lineAt(position.line).text;
    const currentLinePrefix = currentLine.substring(0, position.character);
    const openParenthesis = currentLinePrefix.lastIndexOf("(");
    if (openParenthesis) {
        const prevPosition = new Position(position.line, openParenthesis - 1);
        const prevRange = document.getWordRangeAtPosition(prevPosition);
        if (!prevRange) {
            return;
        }
        triggerWord = document.getText(prevRange);
        const prefix = getKeywordPrefix(document, position, prevRange);
        if (prefix) {
            triggerWord = `${prefix}.${triggerWord}`;
        }
    }

    // show the documentation for the keyword that triggered this signature
    const signatureHelp: SignatureHelp = new SignatureHelp();
    const locations = NavigationData.getNavigationDumpEntries(triggerWord);
    if (locations) {
        for (let location of locations) {
            if (!location.args || location.args.length === 0) {
                location = NavigationData.getClassData(location);
            }
            if (location.args && location.args.length > 0) {
                const signature = getArgumentParameterInfo(location, currentLine, position.character);
                signatureHelp.activeParameter = 0;
                signatureHelp.activeSignature = 0;
                signatureHelp.signatures.push(signature);
            }
        }
    }
    return signatureHelp;
}
