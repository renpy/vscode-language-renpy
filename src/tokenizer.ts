// Workspace and file functions
"use strict";

import { Range, TextDocument } from "vscode";
import { Token, TokenPattern, isIncludePattern, isRangePattern, isMatchPattern, TokenPatternCapture, isRepoPattern } from "./token-definitions";
import { basePatterns } from "./token-patterns";

export function tokenizeDocument(document: TextDocument): Token[] {
    const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
    return tokenizer.tokens;
}

class DocumentTokenizer {
    private readonly document: TextDocument;
    public readonly tokens: Token[] = [];

    constructor(document: TextDocument) {
        this.document = document;

        const text = document.getText(); // TODO: is there a string view in typescript?

        // TODO: while not end of text, continue execute @ lastMatchIndex
        this.executePattern(basePatterns, text);
    }

    private getRange(offsetStart: number, offsetEnd: number): Range {
        const startPos = this.document.positionAt(offsetStart);
        const endPos = this.document.positionAt(offsetEnd);
        return new Range(startPos, endPos);
    }

    private applyCaptures(captures: TokenPatternCapture, match: RegExpExecArray): boolean {
        for (let i = 0; i < match.indices!.length; i++) {
            if (match.indices![i] === undefined) continue; // If the object at i is undefined, the capture is empty
            if (captures[i] === undefined) {
                if (i !== 0) console.warn(`There is no pattern defined for capture group '${i}'.\nThis should probably be added or be a non-capturing group.`);
                continue;
            }

            const capturePattern = captures[i];

            if (capturePattern.token) {
                const [startPos, endPos] = match.indices![i];
                this.tokens.push(new Token(capturePattern.token, this.getRange(startPos, endPos)));
            }

            if (capturePattern.patterns) {
                // TODO: I think it can just be this single line:
                //executePattern(capturePattern, matchBegin[i], tokens, document);

                const matchContent = match[i];
                for (let j = 0; j < capturePattern.patterns.length; j++) {
                    const pattern = capturePattern.patterns[j];
                    if (this.executePattern(pattern, matchContent)) {
                        break; // Once the first pattern has matched, the remainder should be ignored
                    }
                }
            }
        }
        return true;
    }

    public executePattern(p: TokenPattern, text: string): boolean {
        // TODO: add last index as a param to make sure getRange gets the proper characters
        if (isIncludePattern(p)) return this.executePattern(p.include, text);

        if (isRepoPattern(p)) {
            for (let j = 0; j < p.patterns.length; j++) {
                const pattern = p.patterns[j];
                if (this.executePattern(pattern, text)) {
                    return true; // Once the first pattern has matched, the remainder should be ignored
                    // TODO: It does however, need to continue trying to match after the match's lastIndex
                }
            }
        } else if (isRangePattern(p)) {
            const reBegin: RegExp = p.begin;
            const reEnd: RegExp = p.end;
            if (!reBegin.global || !reEnd.global) console.error("To match this pattern the 'g' flag is required on the begin and end RegExp!");

            const matchBegin: RegExpExecArray | null = reBegin.exec(text);
            // TODO: (while match) It does need to continue trying to match after the match's lastIndex
            if (matchBegin) {
                reEnd.lastIndex = reBegin.lastIndex; // Start end pattern after the last matched character in the begin pattern
                const matchEnd: RegExpExecArray | null = reEnd.exec(text);

                if (matchEnd) {
                    if (p.token) {
                        const startPos = matchBegin.index;
                        const endPos = matchEnd.index + matchEnd[0].length;
                        this.tokens.push(new Token(p.token, this.getRange(startPos, endPos)));
                    }
                    if (p.contentToken) {
                        const startPos = matchBegin.index + matchBegin[0].length;
                        const endPos = matchEnd.index;
                        this.tokens.push(new Token(p.contentToken, this.getRange(startPos, endPos)));
                    }
                    if (p.beginCaptures) {
                        if (!reBegin.hasIndices) console.error("To match this begin pattern the 'd' flag is required!");
                        this.applyCaptures(p.beginCaptures, matchBegin);
                    }
                    if (p.endCaptures) {
                        if (!reEnd.hasIndices) console.error("To match this end pattern the 'd' flag is required!");
                        this.applyCaptures(p.endCaptures, matchEnd);
                    }
                    if (p.patterns) {
                        // The patterns repo inside a range match is expected to execute on the content string on the range
                        const startPos = matchBegin.index + matchBegin[0].length;
                        const endPos = matchEnd.index;
                        const content = this.document.getText(this.getRange(startPos, endPos));
                        for (let j = 0; j < p.patterns.length; j++) {
                            const pattern = p.patterns[j];
                            if (this.executePattern(pattern, content)) {
                                return true; // Once the first pattern has matched, the remainder should be ignored
                                // TODO: It does however, need to continue trying to match after the match's lastIndex
                            }
                        }
                    }
                }
            }
        } else if (isMatchPattern(p)) {
            const re: RegExp = p.match;
            if (!re.global) console.error("To match this pattern the 'g' flag is required!");

            const match: RegExpExecArray | null = re.exec(text);
            if (match) {
                // TODO: while match, see if(p.patterns)
                if (p.token) {
                    const startPos = this.document.positionAt(match.index);
                    const endPos = this.document.positionAt(match.index + match[0].length);
                    this.tokens.push(new Token(p.token, new Range(startPos, endPos)));
                }
                if (p.captures) {
                    if (!re.hasIndices) console.error("To match this pattern the 'd' flag is required!");
                    this.applyCaptures(p.captures, match);
                }
            }
        } else {
            console.error("Should not get here!");
        }
        return false;
    }
}
