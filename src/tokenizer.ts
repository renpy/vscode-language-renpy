// Workspace and file functions
"use strict";

import { performance, PerformanceEntry, PerformanceObserver } from "perf_hooks";
import { Range, TextDocument } from "vscode";
import { Token, isIncludePattern, isRangePattern, isMatchPattern, isRepoPattern } from "./token-definitions";
import { basePatterns } from "./token-patterns";

let currentPatternId: number = 0;

export function tokenizeDocument(document: TextDocument): Token[] {
    if (!setupAndValidatePatterns(basePatterns)) return [];

    const t0 = performance.now();
    const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
    const t1 = performance.now();
    console.log(`DocumentTokenizer took ${t1 - t0} milliseconds to complete.`);

    return tokenizer.tokens;
}

function setupAndValidatePatterns(pattern: TokenPattern): boolean {
    // TODO: Is there some kind of unit test thing that applies this on build?

    if (isIncludePattern(pattern)) pattern = pattern.include;
    if (isRepoPattern(pattern)) {
        for (let j = 0; j < pattern.patterns.length; j++) {
            const valid = setupAndValidatePatterns(pattern.patterns[j]);
            if (!valid) return false;
        }
    } else if (isRangePattern(pattern)) {
        if (pattern._pattern_id !== undefined) return true; // This pattern was already validated

        pattern._pattern_id = currentPatternId;
        currentPatternId++;

        if (!pattern.begin.global || !pattern.end.global) {
            console.error("To match this pattern the 'g' flag is required on the begin and end RegExp!");
            return false;
        }
        if (pattern.beginCaptures) {
            if (!pattern.begin.hasIndices) {
                console.error("To match this begin pattern the 'd' flag is required!");
                return false;
            }

            Object.entries(pattern.beginCaptures).forEach(([_, v]) => {
                if (v.patterns) {
                    const repo: TokenRepoPattern = { patterns: v.patterns };
                    setupAndValidatePatterns(repo);
                }
            });
        }
        if (pattern.endCaptures) {
            if (!pattern.end.hasIndices) {
                console.error("To match this end pattern the 'd' flag is required!");
                return false;
            }

            Object.entries(pattern.endCaptures).forEach(([_, v]) => {
                if (v.patterns) {
                    const repo: TokenRepoPattern = { patterns: v.patterns };
                    setupAndValidatePatterns(repo);
                }
            });
        }

        if (pattern.patterns) {
            const repo: TokenRepoPattern = { patterns: pattern.patterns };
            setupAndValidatePatterns(repo);
        }

        let reEndSource = pattern.end.source;
        pattern._hasBackref = /\\\d+/.test(reEndSource);
        //reEndSource = reEndSource.replaceAll("\\A", "¨0");
        reEndSource = reEndSource.replaceAll("\\Z", "$(?!\\n)(?<!\\n)");
        pattern.end = new RegExp(reEndSource, pattern.end.flags);
    } else if (isMatchPattern(pattern)) {
        if (pattern._pattern_id !== undefined) return true; // This pattern was already validated

        pattern._pattern_id = currentPatternId;
        currentPatternId++;

        if (!pattern.match.global) {
            console.error("To match this pattern the 'g' flag is required!");
            return false;
        }
        if (pattern.captures) {
            if (!pattern.match.hasIndices) {
                console.error("To match this pattern the 'd' flag is required!");
                return false;
            }

            Object.entries(pattern.captures).forEach(([k, v]) => {
                if (v.patterns) {
                    const repo: TokenRepoPattern = { patterns: v.patterns };
                    setupAndValidatePatterns(repo);
                }
            });
        }
    }

    return true;
}

export function escapeRegExpCharacters(value: string): string {
    return value.replace(/[\-\\\{\}\*\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, "\\$&");
}

type ScanResult = { pattern: TokenPattern; matchBegin: RegExpExecArray; matchEnd?: RegExpExecArray } | null;
type CachedMatch = { matchBegin: RegExpExecArray; matchEnd?: RegExpExecArray } | null;

class DocumentTokenizer {
    private readonly backrefReplaceRe = /\\(\d+)/g;
    private readonly document: TextDocument;
    public readonly tokens: Token[] = [];

    constructor(document: TextDocument) {
        this.document = document;

        const text = document.getText(); // TODO: is there a string view in typescript?

        this.executePattern(basePatterns, text, 0);
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
                if (i !== 0) console.warn(`There is no pattern defined for capture group '${i}', on a pattern that matched '${match[0]}'.\nThis should probably be added or be a non-capturing group.`);
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
    public scanPattern(p: TokenPattern, text: string, matchOffsetStart: number, cache: Map<number, CachedMatch>): ScanResult {
        if (isIncludePattern(p)) p = p.include;

        if (isRepoPattern(p)) {
            let bestMatchRating = Number.MAX_VALUE;
            let bestResult: ScanResult = null;

            for (let j = 0; j < p.patterns.length; j++) {
                const pattern = isIncludePattern(p.patterns[j]) ? p.patterns[j].include! : p.patterns[j];

                const result = this.scanPattern(pattern, text, matchOffsetStart, cache);
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
            const cachedMatch = cache.get(p._pattern_id!);
            if (cachedMatch !== undefined) {
                if (cachedMatch === null) return null; // If the cached value is null, no match was found in the entire text
                if (cachedMatch.matchBegin.index >= matchOffsetStart) {
                    return { pattern: p, matchBegin: cachedMatch.matchBegin, matchEnd: cachedMatch.matchEnd };
                } else {
                    cache.delete(p._pattern_id!);
                }
            }

            const reBegin = p.begin;
            reBegin.lastIndex = matchOffsetStart;
            const matchBegin = reBegin.exec(text);

            if (matchBegin) {
                let reEnd = p.end;

                // Replace all back references in end source
                if (p._hasBackref!) {
                    let reEndSource = p.end.source;

                    this.backrefReplaceRe.lastIndex = 0;
                    reEndSource = reEndSource.replace(this.backrefReplaceRe, (_, g1) => {
                        return escapeRegExpCharacters(matchBegin[parseInt(g1, 10)]);
                    });

                    reEnd = new RegExp(reEndSource, p.end.flags);
                }

                // Start end pattern after the last matched character in the begin pattern
                reEnd.lastIndex = matchBegin.index + matchBegin[0].length;
                const matchEnd = reEnd.exec(text);

                if (matchEnd) {
                    cache.set(p._pattern_id!, { matchBegin: matchBegin, matchEnd: matchEnd });
                    return { pattern: p, matchBegin: matchBegin, matchEnd: matchEnd };
                }
            } else {
                cache.set(p._pattern_id!, null);
            }
        } else if (isMatchPattern(p)) {
            const cachedMatch = cache.get(p._pattern_id!);
            if (cachedMatch !== undefined) {
                if (cachedMatch === null) return null; // If the cached value is null, no match was found in the entire text
                if (cachedMatch.matchBegin.index >= matchOffsetStart) {
                    return { pattern: p, matchBegin: cachedMatch.matchBegin };
                } else {
                    cache.delete(p._pattern_id!);
                }
            }

            const re = p.match;
            re.lastIndex = matchOffsetStart;
            const match = re.exec(text);
            if (match) {
                cache.set(p._pattern_id!, { matchBegin: match });
                return { pattern: p, matchBegin: match };
            } else {
                cache.set(p._pattern_id!, null);
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

        const cache = new Map<number, CachedMatch>();
        const lastPos = text.length;
        for (let lastMatchIndex = 0; lastMatchIndex < lastPos; ++lastMatchIndex) {
            const bestMatch = this.scanPattern(pattern, text, lastMatchIndex, cache);

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
