// Workspace and file functions
"use strict";

import { Range, TextDocument } from "vscode";
import { Token, isIncludePattern, isRangePattern, isMatchPattern, isRepoPattern } from "./token-definitions";
import { basePatterns, endOfFileMark, startOfFileMark } from "./token-patterns";

export function tokenizeDocument(document: TextDocument): Token[] {
    if (!ValidatePatterns(basePatterns)) return [];

    const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
    return tokenizer.tokens;
}

function ValidatePatterns(pattern: TokenPattern): boolean {
    // TODO: Is there some kind of unit test thing that checks this on build?

    if (isIncludePattern(pattern)) pattern = pattern.include;
    if (isRepoPattern(pattern)) {
        for (let j = 0; j < pattern.patterns.length; j++) {
            const valid = ValidatePatterns(pattern.patterns[j]);
            if (!valid) return false;
        }
    } else if (isRangePattern(pattern)) {
        if (!pattern.begin.global || !pattern.end.global) {
            console.error("To match this pattern the 'g' flag is required on the begin and end RegExp!");
            return false;
        }
        if (pattern.beginCaptures && !pattern.begin.hasIndices) {
            console.error("To match this begin pattern the 'd' flag is required!");
            return false;
        }
        if (pattern.endCaptures && !pattern.end.hasIndices) {
            console.error("To match this end pattern the 'd' flag is required!");
            return false;
        }
    } else if (isMatchPattern(pattern)) {
        if (!pattern.match.global) {
            console.error("To match this pattern the 'g' flag is required!");
            return false;
        }
        if (pattern.captures && !pattern.match.hasIndices) {
            console.error("To match this pattern the 'd' flag is required!");
            return false;
        }
    }

    return true;
}

type ScanResult = { pattern: TokenPattern; matchBegin: RegExpExecArray; matchEnd?: RegExpExecArray } | null;

class DocumentTokenizer {
    private readonly document: TextDocument;
    public readonly tokens: Token[] = [];

    constructor(document: TextDocument) {
        this.document = document;

        const text = startOfFileMark + document.getText() + endOfFileMark; // TODO: is there a string view in typescript?

        this.executePattern(basePatterns, text, -startOfFileMark.length);
    }

    private getRange(offsetStart: number, offsetEnd: number): Range {
        const startPos = this.document.positionAt(offsetStart);
        const endPos = this.document.positionAt(offsetEnd);

        if (startPos === endPos) {
            console.warn("Empty token detected!");
        }

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
                this.tokens.push(new Token(p.token, this.getRange(textOffsetStart + startPos, textOffsetStart + endPos)));
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
     * @todo Previous successfull matches could be cached and returned as long as the matchOffsetStart is less then the match index
     */
    public scanPattern(p: TokenPattern, text: string, matchOffsetStart: number): ScanResult {
        if (isIncludePattern(p)) p = p.include;

        if (isRepoPattern(p)) {
            let bestMatchRating = Number.MAX_VALUE;
            let bestResult: ScanResult = null;

            for (let j = 0; j < p.patterns.length; j++) {
                const pattern = isIncludePattern(p.patterns[j]) ? p.patterns[j].include! : p.patterns[j];

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
                if (bestMatchRating === matchOffsetStart) {
                    break;
                }
            }
            return bestResult;
        } else if (isRangePattern(p)) {
            const reBegin = p.begin;
            reBegin.lastIndex = matchOffsetStart;
            const matchBegin = reBegin.exec(text);
            if (matchBegin) {
                let reEndSource = p.end.source;

                // Replace all back references in end source
                const hasBackref = /[$\\]\d+/g.test(reEndSource);
                if (hasBackref) {
                    for (let i = 0; i < matchBegin.length; i++) {
                        let content = matchBegin[i];
                        if (content === undefined) content = ""; // If the object at i is undefined, the capture is empty

                        const backRef = new RegExp("[$\\\\]" + i, "g");
                        reEndSource = reEndSource.replaceAll(backRef, content);
                    }
                }

                reEndSource = reEndSource.replaceAll("\\A", "¨0");
                reEndSource = reEndSource.replaceAll("\\Z", "¨1");

                const reEnd = new RegExp(reEndSource, p.end.flags);
                reEnd.lastIndex = reBegin.lastIndex; // Start end pattern after the last matched character in the begin pattern
                const matchEnd = reEnd.exec(text);

                if (matchEnd) {
                    return { pattern: p, matchBegin: matchBegin, matchEnd: matchEnd };
                }
            }
        } else if (isMatchPattern(p)) {
            const re = p.match;
            re.lastIndex = matchOffsetStart;
            const match = re.exec(text);
            if (match) {
                return { pattern: p, matchBegin: match };
            }
        }

        return null;
    }

    /**
     * Executes the pattern on 'text', adding tokens to the token list.
     * @param pattern The pattern to use for matches.
     * @param text The text to match on.
     * @param textDocumentOffset The character offset in the document where 'text' is located.
     * @returns True if the pattern was matched
     * @todo Timeout after it was running too long
     */
    public executePattern(pattern: TokenPattern, text: string, textDocumentOffset: number) {
        if (isIncludePattern(pattern)) pattern = pattern.include;

        const lastPos = text.length;
        for (let lastMatchIndex = 0; lastMatchIndex < lastPos; ++lastMatchIndex) {
            const bestMatch = this.scanPattern(pattern, text, lastMatchIndex);
            if (!bestMatch) continue; // No match was found in the current pattern

            const p = bestMatch.pattern;
            if (isRangePattern(p)) {
                const matchBegin = bestMatch.matchBegin;
                const matchEnd = bestMatch.matchEnd!;
                lastMatchIndex = matchEnd.index + matchEnd[0].length - 1;

                if (p.token) {
                    const startPos = textDocumentOffset + matchBegin.index;
                    const endPos = textDocumentOffset + matchEnd.index + matchEnd[0].length;
                    this.tokens.push(new Token(p.token, this.getRange(startPos, endPos)));
                }
                if (p.contentToken) {
                    const startPos = textDocumentOffset + matchBegin.index + matchBegin[0].length;
                    const endPos = textDocumentOffset + matchEnd.index;
                    this.tokens.push(new Token(p.contentToken, this.getRange(startPos, endPos)));
                }
                if (p.beginCaptures) {
                    this.applyCaptures(p.beginCaptures, matchBegin, textDocumentOffset);
                }
                if (p.endCaptures) {
                    this.applyCaptures(p.endCaptures, matchEnd, textDocumentOffset);
                }
                if (p.patterns) {
                    // The patterns repo inside a range match is expected to execute on the content string on the range
                    const startPos = textDocumentOffset + matchBegin.index + matchBegin[0].length;
                    const endPos = textDocumentOffset + matchEnd.index;
                    const content = this.document.getText(this.getRange(startPos, endPos));

                    const repo: TokenRepoPattern = { patterns: p.patterns };
                    this.executePattern(repo, content, startPos);
                }
            } else if (isMatchPattern(p)) {
                const match = bestMatch.matchBegin;
                lastMatchIndex = match.index + match[0].length - 1;

                if (p.token) {
                    const startPos = textDocumentOffset + match.index;
                    const endPos = textDocumentOffset + match.index + match[0].length;
                    this.tokens.push(new Token(p.token, this.getRange(startPos, endPos)));
                }
                if (p.captures) {
                    this.applyCaptures(p.captures, match, textDocumentOffset);
                }
            } else {
                console.error("Should not get here!");
            }
        }
    }
}
