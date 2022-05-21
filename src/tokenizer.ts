// Workspace and file functions
"use strict";

import { performance } from "perf_hooks";
import { TextDocument } from "vscode";
import { Token, isRangePattern, isMatchPattern, isRepoPattern, TokenPosition } from "./token-definitions";
import { basePatterns } from "./token-patterns";
import { Stack } from "./utilities/stack";

export function tokenizeDocument(document: TextDocument): Token[] {
    if (!setupAndValidatePatterns(basePatterns)) return [];

    const t0 = performance.now();
    const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
    const t1 = performance.now();
    console.log(`DocumentTokenizer took ${t1 - t0} milliseconds to complete.`);

    return tokenizer.tokens;
}

function setupAndValidatePatterns(pattern: TokenPattern): boolean {
    if (pattern._patternId !== undefined) return true; // This pattern was already validated

    let currentPatternId = 0;
    const stack = new Stack<TokenPattern>();
    stack.push(pattern);

    while (!stack.isEmpty()) {
        const p = stack.pop()!;

        if (p._patternId !== undefined) continue; // This pattern was already validated
        p._patternId = currentPatternId;
        currentPatternId++;

        // TODO: Is there some kind of unit test thing that applies this on build?

        if (isRepoPattern(p)) {
            for (let i = 0; i < p.patterns.length; ++i) stack.push(p.patterns[i]);
        } else if (isRangePattern(p)) {
            if (!p.begin.global || !p.end.global) {
                console.error("To match this pattern the 'g' flag is required on the begin and end RegExp!");
                return false;
            }
            if (p.beginCaptures) {
                if (!p.begin.hasIndices) {
                    console.error("To match this begin pattern the 'd' flag is required!");
                    return false;
                }

                Object.entries(p.beginCaptures).forEach(([, v]) => {
                    v.patterns?.forEach((x) => stack.push(x));
                });
            }
            if (p.endCaptures) {
                if (!p.end.hasIndices) {
                    console.error("To match this end pattern the 'd' flag is required!");
                    return false;
                }

                Object.entries(p.endCaptures).forEach(([, v]) => {
                    v.patterns?.forEach((x) => stack.push(x));
                });
            }

            p.patterns?.forEach((x) => stack.push(x));

            let reEndSource = p.end.source;
            p._hasBackref = /\\\d+/.test(reEndSource);
            //reEndSource = reEndSource.replaceAll("\\A", "¨0");
            reEndSource = reEndSource.replaceAll("\\Z", "$(?!\r\n|\r|\n)"); // This assumes LF without trailig new line right?...
            p.end = new RegExp(reEndSource, p.end.flags);
        } else if (isMatchPattern(p)) {
            if (!p.match.global) {
                console.error("To match this pattern the 'g' flag is required!");
                return false;
            }
            if (p.captures) {
                if (!p.match.hasIndices) {
                    console.error("To match this pattern the 'd' flag is required!");
                    return false;
                }

                Object.entries(p.captures).forEach(([, v]) => {
                    v.patterns?.forEach((x) => stack.push(x));
                });
            }
        }
    }
    return true;
}

export function escapeRegExpCharacters(value: string): string {
    return value.replace(/[-\\{}*+?|^$.,[\]()#\s]/g, "\\$&");
}

type ScanResult = { pattern: TokenPattern; matchBegin: RegExpExecArray; matchEnd?: RegExpExecArray } | null;

class DocumentTokenizer {
    private readonly backrefReplaceRe = /\\(\d+)/g;
    public readonly tokens: Token[] = [];

    constructor(document: TextDocument) {
        const text = document.getText();
        const carret = new TokenPosition(0, 0, 0);
        this.executePattern(basePatterns, text, carret, 0);
    }

    /**
     * Apply the capture patterns to the match
     * @param captures The captures to apply
     * @param match The match to apply the captures on
     * @param caret The reader head position within the document
     */
    private applyCaptures(captures: TokenPatternCapture, match: RegExpExecArray, caret: TokenPosition) {
        if (!match.indices) return;

        let lastMatchEnd = match.index;
        for (let i = 0; i < match.indices.length; i++) {
            if (match.indices[i] === undefined) continue; // If the object at i is undefined, the capture is empty
            if (captures[i] === undefined) {
                if (i !== 0)
                    console.warn(
                        `There is no pattern defined for capture group '${i}', on a pattern that matched '${match[i]}' near L:${caret.line + 1} C:${caret.character + 1}.\nThis should probably be added or be a non-capturing group.`
                    );
                continue;
            }
            const p = captures[i];
            const content = match[i];

            // Update the position carets
            const [startPos, endPos] = match.indices[i];

            // Check for missing characters in a match
            const matchOffset = startPos - lastMatchEnd;
            lastMatchEnd = endPos;
            if (matchOffset !== 0) {
                /*console.warn(
                    `A capture was misaligned (expected: ${startPos}, got: ${lastMatchEnd}) on a pattern that matched '${content}' near L:${caret.line + 1} C:${
                        caret.character + 1
                    }.\nYou should probably update the pattern to capture everything.\nApplying a fix...`
                );*/
                caret.advance(matchOffset);
            }

            const startCaret = caret.clone();
            const endCaret = caret.clone();
            endCaret.advance(content.length); // Move caret to end of the current match

            if (p.token) {
                if (p.token === CharacterTokenType.NewLine) endCaret.nextLine();
                this.tokens.push(new Token(p.token, startCaret, endCaret));
            }

            if (p.patterns) {
                const captureCaret = startCaret.clone();

                const repo: TokenRepoPattern = { patterns: p.patterns };
                this.executePattern(repo, content, captureCaret, captureCaret.charStartOffset);
                console.assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                if (captureCaret.line !== endCaret.line) {
                    // Note: Moving the endCaret will also move the token, since this is a reference object
                    endCaret.setValue(captureCaret);
                }
            }

            caret.setValue(endCaret);
        }
    }

    /**
     * Scans the text for the best matching pattern.
     * @param p The pattern to use for matches
     * @param text The text to match on
     * @param matchOffsetStart The character offset in 'text' to start the match at.
     */
    public scanPattern(pattern: TokenPattern, text: string, matchOffsetStart: number, cache: Map<number, ScanResult>): ScanResult {
        const p = pattern;
        const cachedResult = cache.get(p._patternId!);
        if (cachedResult !== undefined) {
            if (cachedResult === null) return null; // If the cached value is null, no match was found in the entire text
            if (cachedResult.matchBegin.index >= matchOffsetStart) {
                return cachedResult;
            } else {
                cache.delete(p._patternId!);
            }
        }

        let result: ScanResult = null;
        if (isRepoPattern(p)) {
            let bestMatchRating = Number.MAX_VALUE;
            let bestResult: ScanResult = null;

            for (let j = 0; j < p.patterns.length; j++) {
                const scanResult = this.scanPattern(p.patterns[j], text, matchOffsetStart, cache);
                if (!scanResult) continue;

                const matchRating = scanResult.matchBegin.index;
                if (matchRating >= bestMatchRating) {
                    // Patterns are sorted by priority, so the previous pattern had a better or equal priority
                    continue;
                }

                bestMatchRating = matchRating;
                bestResult = scanResult;

                // If true, this match is valid at the first possible location. No need to check further.
                if (bestMatchRating === matchOffsetStart) {
                    break;
                }
            }
            result = bestResult;
        } else if (isRangePattern(p)) {
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
                        const content = matchBegin[parseInt(g1, 10)];
                        if (content !== undefined) return escapeRegExpCharacters(content);
                        return "";
                    });

                    reEnd = new RegExp(reEndSource, p.end.flags);
                }

                // Start end pattern after the last matched character in the begin pattern
                reEnd.lastIndex = matchBegin.index + matchBegin[0].length;
                const matchEnd = reEnd.exec(text);

                if (matchEnd) {
                    result = { pattern: p, matchBegin: matchBegin, matchEnd: matchEnd };
                }
            }
        } else if (isMatchPattern(p)) {
            const re = p.match;
            re.lastIndex = matchOffsetStart;
            const match = re.exec(text);
            if (match) {
                result = { pattern: p, matchBegin: match };
            }
        }

        cache.set(p._patternId!, result);
        return result;
    }

    public newScanPattern(pattern: TokenPattern, text: string, matchOffsetStart: number, cache: Map<number, ScanResult>): ScanResult {
        const stack = new Stack<TokenPattern>();
        stack.push(pattern);

        let bestMatchRating = Number.MAX_VALUE;
        let bestResult: ScanResult = null;

        while (!stack.isEmpty()) {
            const p = stack.pop()!;

            let result: ScanResult = null;
            const cachedMatch = cache.get(p._patternId!);
            if (cachedMatch !== undefined) {
                if (cachedMatch === null) continue; // If the cached value is null, no match was found in the entire text
                if (cachedMatch.matchBegin.index >= matchOffsetStart) {
                    result = cachedMatch;
                } else {
                    cache.delete(p._patternId!);
                }
            }

            if (result === null) {
                // The result was not cached, try to update the result
                if (isRepoPattern(p)) {
                    for (let j = 0; j < p.patterns.length; j++) stack.push(p.patterns[j]);
                } else if (isRangePattern(p)) {
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
                                const content = matchBegin[parseInt(g1, 10)];
                                if (content !== undefined) return escapeRegExpCharacters(content);
                                return "";
                            });

                            reEnd = new RegExp(reEndSource, p.end.flags);
                        }

                        // Start end pattern after the last matched character in the begin pattern
                        reEnd.lastIndex = matchBegin.index + matchBegin[0].length;
                        const matchEnd = reEnd.exec(text);

                        if (matchEnd) {
                            result = { pattern: p, matchBegin: matchBegin, matchEnd: matchEnd };
                        }
                    }
                } else if (isMatchPattern(p)) {
                    const re = p.match;
                    re.lastIndex = matchOffsetStart;
                    const match = re.exec(text);
                    if (match) {
                        result = { pattern: p, matchBegin: match };
                    }
                }
            }

            if (!result) continue;

            const matchRating = result.matchBegin.index;
            if (matchRating >= bestMatchRating) {
                // Patterns are sorted by priority, so the previous pattern had a better or equal priority
                continue;
            }

            bestMatchRating = matchRating;
            bestResult = result;
            cache.set(p._patternId!, bestResult);

            // If true, this match is valid at the first possible location. No need to check further.
            if (bestMatchRating === matchOffsetStart) break;
        }

        return bestResult;
    }

    /**
     * Executes the pattern on 'text', adding tokens to the token list.
     * @param pattern The pattern to use for matches.
     * @param text The text to match on.
     * @param textDocumentOffset The character offset in the document where 'text' is located.
     * @returns True if the pattern was matched
     * @todo Timeout after it was running too long
     */
    public executePattern(pattern: TokenPattern, text: string, caret: TokenPosition, textDocumentOffset: number) {
        const cache = new Map<number, ScanResult>();
        const lastCharIndex = text.length;

        for (let lastMatchIndex = 0; lastMatchIndex < lastCharIndex; ) {
            const bestMatch = this.scanPattern(pattern, text, lastMatchIndex, cache);

            if (bestMatch === null) {
                // No match was found in the current pattern
                ++lastMatchIndex;
                caret.next();
                continue;
            }
            const failSafeIndex = lastMatchIndex; // Debug index to break in case of an infinite loop

            const p = bestMatch.pattern;
            if (isRangePattern(p)) {
                const matchBegin = bestMatch.matchBegin;
                const matchEnd = bestMatch.matchEnd!;
                lastMatchIndex = matchEnd.index + matchEnd[0].length;
                const content = text.substring(matchBegin.index + matchBegin[0].length, matchEnd.index);

                // Check for missing characters in a match
                const matchOffset = textDocumentOffset + matchBegin.index - caret.charStartOffset;
                if (matchOffset !== 0) {
                    /*console.warn(
                        `A range begin match was misaligned (expected: ${textDocumentOffset + matchBegin.index}, got: ${caret.charStartOffset}) on pattern '${p.begin.source}' that matched '${matchBegin[0]}' near L:${caret.line + 1} C:${
                            caret.character + 1
                        }.\nYou probably didn't catch all characters in the match or the match before this one.\nApplying a fix...`
                    );*/
                    caret.advance(matchOffset);
                }

                const startCaret = caret.clone();

                const contentStartCaret = startCaret.clone();
                contentStartCaret.advance(matchBegin[0].length); // Move caret to end of beginMatch

                const contentEndCaret = contentStartCaret.clone();
                contentEndCaret.advance(content.length); // Move caret to end of content

                const endCaret = contentEndCaret.clone();
                endCaret.advance(matchEnd[0].length); // Move caret to end of match

                // p.token matches the whole range including the begin and end match content
                if (p.token) {
                    this.tokens.push(new Token(p.token, startCaret, endCaret));
                }
                // Begin captures are only applied to beginMatch[0] content
                if (p.beginCaptures) {
                    const captureCaret = startCaret.clone();
                    this.applyCaptures(p.beginCaptures, matchBegin, captureCaret);
                    console.assert(captureCaret.charStartOffset === contentStartCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                    if (captureCaret.line !== endCaret.line) {
                        // Line was moved, all characters should reset to 0 and move by content length
                        contentStartCaret.setValue(captureCaret);

                        contentEndCaret.setValue(contentStartCaret);
                        contentEndCaret.advance(content.length); // Move caret to end of content

                        // Note: Moving the endCaret will also move the token, since this is a reference object
                        endCaret.setValue(contentEndCaret);
                        endCaret.advance(matchEnd[0].length); // Move caret to end of match
                    }
                }

                // p.contentToken matches the range 'between'; after the end of beginMatch and before the start of endMatch
                if (p.contentToken) {
                    this.tokens.push(new Token(p.contentToken, contentStartCaret, contentEndCaret));
                }

                // Patterns are only applied on 'content' (see p.contentToken above)
                if (p.patterns) {
                    const captureCaret = contentStartCaret.clone();
                    const repo: TokenRepoPattern = { patterns: p.patterns };
                    this.executePattern(repo, content, captureCaret, captureCaret.charStartOffset);
                    console.assert(captureCaret.charStartOffset === contentEndCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                    if (captureCaret.line !== endCaret.line) {
                        // Line was moved, all characters should reset to 0 and move by content length
                        contentEndCaret.setValue(captureCaret);

                        // Note: Moving the endCaret will also move the token, since this is a reference object
                        endCaret.setValue(contentEndCaret);
                        endCaret.advance(matchEnd[0].length); // Move caret to end of match
                    }
                }

                // End captures are only applied to endMatch[0] content
                if (p.endCaptures) {
                    const captureCaret = contentEndCaret.clone();
                    this.applyCaptures(p.endCaptures, matchEnd, captureCaret);
                    console.assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                    if (captureCaret.line !== endCaret.line) {
                        // Line was moved, all characters should reset to 0 and move by content length
                        // Note: Moving the endCaret will also move the token, since this is a reference object
                        endCaret.setValue(captureCaret);
                    }
                }

                caret.setValue(endCaret);
            } else if (isMatchPattern(p)) {
                const match = bestMatch.matchBegin;
                lastMatchIndex = match.index + match[0].length;

                // Check for missing characters in a match
                const matchOffset = textDocumentOffset + match.index - caret.charStartOffset;
                if (matchOffset !== 0) {
                    /*console.warn(
                        `A match was misaligned (expected: ${textDocumentOffset + match.index}, got: ${caret.charStartOffset}) on pattern '${p.match.source}' that matched '${match[0]}' near L:${caret.line + 1} C:${
                            caret.character + 1
                        }.\nYou probably didn't catch all characters in the match or the match before this one.\nApplying a fix...`
                    );*/
                    caret.advance(matchOffset);
                }

                const startCaret = caret.clone();

                const endCaret = startCaret.clone();
                endCaret.advance(match[0].length); // Move carret to end of match

                if (p.token) {
                    if (p.token === CharacterTokenType.NewLine) endCaret.nextLine();

                    this.tokens.push(new Token(p.token, startCaret, endCaret));
                }

                if (p.captures) {
                    const captureCaret = startCaret.clone();
                    this.applyCaptures(p.captures, match, captureCaret);
                    console.assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                    // Note: Moving the endCaret will also move the token, since this is a reference object
                    if (captureCaret.line !== endCaret.line) {
                        endCaret.setValue(captureCaret);
                    }
                }

                caret.setValue(endCaret);
            } else {
                console.assert(false, "Should not get here!");
            }

            if (failSafeIndex === lastMatchIndex) {
                console.error("The loop has not advanced since the last cycle. This indicates a programming error. Breaking the loop!");
                break;
            }
        }
    }
}
