// Workspace and file functions
"use strict";

import { Range, TextDocument } from "vscode";
import { Token, isIncludePattern, isRangePattern, isMatchPattern, isRepoPattern } from "./token-definitions";
import { basePatterns } from "./token-patterns";

export function tokenizeDocument(document: TextDocument): Token[] {
    const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
    return tokenizer.tokens;
}

type ScanResult = { pattern: TokenPattern; matchBegin: RegExpExecArray; matchEnd?: RegExpExecArray } | null;

class DocumentTokenizer {
    private readonly document: TextDocument;
    public readonly tokens: Token[] = [];

    constructor(document: TextDocument) {
        this.document = document;

        const text = document.getText(); // TODO: is there a string view in typescript?

        // TODO: while not end of text, continue execute @ lastMatchIndex
        this.executePattern(basePatterns, text, 0);
    }

    private getRange(offsetStart: number, offsetEnd: number): Range {
        const startPos = this.document.positionAt(offsetStart);
        const endPos = this.document.positionAt(offsetEnd);
        return new Range(startPos, endPos);
    }

    /**
     * Apply the capture patterns to the match
     * @param captures The captures to apply
     * @param match The match to apply the captures on
     * @param textOffsetStart The character offset in the document where 'text' is located.
     */
    private applyCaptures(captures: TokenPatternCapture, match: RegExpExecArray, textOffsetStart: number) {
        for (let i = 0; i < match.indices!.length; i++) {
            if (match.indices![i] === undefined) continue; // If the object at i is undefined, the capture is empty
            if (captures[i] === undefined) {
                if (i !== 0) console.warn(`There is no pattern defined for capture group '${i}'.\nThis should probably be added or be a non-capturing group.`);
                continue;
            }

            const p = captures[i];

            if (p.token) {
                const [startPos, endPos] = match.indices![i];
                this.tokens.push(new Token(p.token, this.getRange(startPos, endPos)));
            }

            if (p.patterns) {
                const startPos = textOffsetStart + match.indices![i][0];
                const matchContent = match[i];
                const repo: TokenRepoPattern = { patterns: p.patterns };
                this.executePattern(repo, matchContent, startPos);
            }
        }
    }

    /**
     * Scans the text for the best matching pattern.
     * @param p The pattern to use for matches
     * @param text The text to match on
     * @param matchOffsetStart The character offset in 'text' to start the match at.
     */
    public scanPattern(p: TokenPattern, text: string, matchOffsetStart: number): ScanResult {
        if (isIncludePattern(p)) p = p.include;

        if (isRepoPattern(p)) {
            let bestMatchRating = Number.MAX_VALUE;
            let bestResult: ScanResult = null;

            for (let j = 0; j < p.patterns.length; j++) {
                const pattern = p.patterns[j];

                const result = this.scanPattern(pattern, text, matchOffsetStart);
                if (!result) continue;

                const matchRating = result.matchBegin.index;
                if (matchRating >= bestMatchRating) {
                    // Patterns are sorted by priority, so the previous pattern had a better or equal priority
                    continue;
                }

                bestMatchRating = matchRating;
                bestResult = result;

                // If true, this match is valid at the first possible location. No need to check further.
                if (bestMatchRating === matchOffsetStart) break;
            }
            return bestResult;
        } else if (isRangePattern(p)) {
            if (!p.begin.global || !p.end.global) console.error("To match this pattern the 'g' flag is required on the begin and end RegExp!");

            const reBegin: RegExp = p.begin;
            reBegin.lastIndex = matchOffsetStart;
            const matchBegin: RegExpExecArray | null = reBegin.exec(text);
            if (matchBegin) {
                const reEnd: RegExp = p.end;
                reEnd.lastIndex = reBegin.lastIndex; // Start end pattern after the last matched character in the begin pattern
                const matchEnd: RegExpExecArray | null = reEnd.exec(text);

                if (matchEnd) {
                    return { pattern: p, matchBegin: matchBegin, matchEnd: matchEnd };
                }
            }
        } else if (isMatchPattern(p)) {
            if (!p.match.global) console.error("To match this pattern the 'g' flag is required!");

            const re: RegExp = p.match;
            re.lastIndex = matchOffsetStart;
            const match: RegExpExecArray | null = re.exec(text);
            if (match) {
                return { pattern: p, matchBegin: match };
            }
        }

        return null;
    }

    /**
     * Executes the pattern on 'text', adding tokens to the token list.
     * @param p The pattern to use for matches.
     * @param text The text to match on.
     * @param textOffsetStart The character offset in the document where 'text' is located.
     * @returns True if the pattern was matched
     */
    public executePattern(p: TokenPattern, text: string, textOffsetStart: number) {
        if (isIncludePattern(p)) p = p.include;

        const lastPos = text.length;
        for (let lastMatchIndex = 0; lastMatchIndex < lastPos; ++lastMatchIndex) {
            const bestMatch = this.scanPattern(p, text, lastMatchIndex);
            if (!bestMatch) continue; // No match was found in the current pattern

            p = bestMatch.pattern;
            if (isRangePattern(p)) {
                const matchBegin = bestMatch.matchBegin;
                const matchEnd = bestMatch.matchEnd!;
                lastMatchIndex = matchEnd.index + matchEnd[0].length;

                if (p.token) {
                    const startPos = textOffsetStart + matchBegin.index;
                    const endPos = textOffsetStart + matchEnd.index + matchEnd[0].length;
                    this.tokens.push(new Token(p.token, this.getRange(startPos, endPos)));
                }
                if (p.contentToken) {
                    const startPos = textOffsetStart + matchBegin.index + matchBegin[0].length;
                    const endPos = textOffsetStart + matchEnd.index;
                    this.tokens.push(new Token(p.contentToken, this.getRange(startPos, endPos)));
                }
                if (p.beginCaptures) {
                    if (!p.begin.hasIndices) console.error("To match this begin pattern the 'd' flag is required!");

                    const startPos = textOffsetStart + matchBegin.index + matchBegin[0].length;
                    this.applyCaptures(p.beginCaptures, matchBegin, startPos);
                }
                if (p.endCaptures) {
                    if (!p.end.hasIndices) console.error("To match this end pattern the 'd' flag is required!");

                    const startPos = textOffsetStart + matchEnd.index + matchEnd[0].length;
                    this.applyCaptures(p.endCaptures, matchEnd, startPos);
                }
                if (p.patterns) {
                    // The patterns repo inside a range match is expected to execute on the content string on the range
                    const startPos = textOffsetStart + matchBegin.index + matchBegin[0].length;
                    const endPos = textOffsetStart + matchEnd.index;
                    const content = this.document.getText(this.getRange(startPos, endPos));

                    const repo: TokenRepoPattern = { patterns: p.patterns };
                    this.executePattern(repo, content, startPos);
                }
            } else if (isMatchPattern(p)) {
                const match = bestMatch.matchBegin;
                lastMatchIndex = match.index + match[0].length;

                if (p.token) {
                    const startPos = textOffsetStart + match.index;
                    const endPos = textOffsetStart + match.index + match[0].length;
                    this.tokens.push(new Token(p.token, this.getRange(startPos, endPos)));
                }
                if (p.captures) {
                    if (!p.match.hasIndices) console.error("To match this pattern the 'd' flag is required!");

                    const startPos = textOffsetStart + match.index;
                    this.applyCaptures(p.captures, match, startPos);
                }
            } else {
                console.error("Should not get here!");
            }
        }
    }
}
