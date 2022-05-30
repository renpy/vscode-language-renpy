/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert } from "console";
import { performance } from "perf_hooks";
import { TextDocument, Uri } from "vscode";
import { Token, isRangePattern, isMatchPattern, isRepoPattern, TokenPosition } from "./token-definitions";
import { basePatterns } from "./token-patterns";
import { Stack } from "../utilities/stack";
import { Vector } from "../utilities/vector";
import { CharacterTokenType, TokenType } from "./renpy.tokens";

type ScanResult = { pattern: TokenizerTokenPattern; matchBegin: RegExpExecArray; matchEnd?: RegExpExecArray } | null;
type TokenCache = { readonly documentVersion: number; readonly tokens: Token[] };

const tokenCache = new Map<Uri, TokenCache>();
const runBenchmark = false;
let uniquePatternCount = -1;

export function tokenizeDocument(document: TextDocument): Token[] {
    setupAndValidatePatterns();

    if (runBenchmark) benchmark(document);

    const cachedTokens = tokenCache.get(document.uri);
    if (cachedTokens?.documentVersion === document.version) {
        return cachedTokens.tokens;
    }

    const tokenizer = new DocumentTokenizer(document);
    const tokens = tokenizer.tokens.toArray();
    tokenCache.set(document.uri, { documentVersion: document.version, tokens: tokens });
    return tokens;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function benchmark(document: TextDocument) {
    // screens.rpy, 10000 loops; 19.69293530988693 avg.

    const loops = 10000;
    const reportEveryXPercent = 1;

    const onePercent = loops / 100;
    const everyX = onePercent * reportEveryXPercent;

    console.log(`Running tokenizer benchmark for ${loops} loops...`);

    let avg = 0;
    for (let i = 0; i < loops; ++i) {
        const t0 = performance.now();
        const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
        const t1 = performance.now();

        avg += t1 - t0;

        // This is really just here to prevent the unused variable error
        if (tokenizer.tokens.isEmpty()) {
            console.error("No tokens were found.");
        }

        // Show timer
        const msLoop = avg / (i + 1);
        const sRemaining = msLoop * (loops - i + 1) * 0.001;
        const h = Math.floor(sRemaining / 3600);
        const m = Math.floor((sRemaining / 60) % 60);
        const s = Math.ceil(sRemaining % 60);
        const timeString = [h ? h + "h" : false, m ? m + "m" : false, s ? s + "s" : false]
            .filter(Boolean)
            .join(":")
            .replace(/\b(\d)(?=[hms])/g, "0$1");

        if (i % everyX === 0) console.log(`${i / onePercent}% complete... (avg.: ${msLoop.toFixed(2)}ms, approx. ${timeString} remaining)`);
    }
    avg /= loops;

    console.log(`DocumentTokenizer took ${avg} avg. milliseconds to complete.`);
}

function setupAndValidatePatterns() {
    if (uniquePatternCount !== -1) return;

    uniquePatternCount = 0;
    const stack = new Stack<TokenizerTokenPattern>(32);
    stack.push(basePatterns as ExTokenRepoPattern);

    while (!stack.isEmpty()) {
        const p = stack.pop()!;

        if (p._patternId !== undefined && p._patternId !== -1) continue; // This pattern was already validated
        p._patternId = uniquePatternCount;
        uniquePatternCount++;

        if (isRepoPattern(p)) {
            p._patternType = TokenPatternType.RepoPattern;
            for (let i = 0; i < p.patterns.length; ++i) stack.push(p.patterns[i]);
        } else if (isRangePattern(p)) {
            p._patternType = TokenPatternType.RangePattern;

            assert(p.begin.global && p.end.global, "To match this pattern the 'g' flag is required on the begin and end RegExp!");
            if (p.beginCaptures) {
                assert(p.begin.hasIndices, "To match this begin pattern the 'd' flag is required!");

                Object.entries(p.beginCaptures).forEach(([, v]) => {
                    if (v.patterns) stack.push(v as ExTokenRepoPattern);
                });
            } else {
                assert(!p.begin.hasIndices, "This pattern should not have the 'd' flag set!");
            }
            if (p.endCaptures) {
                assert(p.end.hasIndices, "To match this end pattern the 'd' flag is required!");

                Object.entries(p.endCaptures).forEach(([, v]) => {
                    if (v.patterns) stack.push(v as ExTokenRepoPattern);
                });
            } else {
                assert(!p.end.hasIndices, "This pattern should not have the 'd' flag set!");
            }

            if (p.patterns) {
                p.patternsRepo = {
                    patterns: p.patterns as TokenizerTokenPatternArray,
                    _patternId: -1,
                    _patternType: TokenPatternType.RepoPattern,
                };
                stack.push(p.patternsRepo!);
            }

            let reEndSource = p.end.source;
            p._hasBackref = /\\\d+/.test(reEndSource);
            //reEndSource = reEndSource.replaceAll("\\A", "¨0");
            reEndSource = reEndSource.replaceAll("\\Z", "$(?!\r\n|\r|\n)"); // This assumes (CR)LF without trailig new line right?...
            p.end = new RegExp(reEndSource, p.end.flags);
        } else if (isMatchPattern(p)) {
            p._patternType = TokenPatternType.MatchPattern;

            assert(p.match.global, "To match this pattern the 'g' flag is required!");
            if (p.captures) {
                assert(p.match.hasIndices, "To match this pattern the 'd' flag is required!");

                Object.entries(p.captures).forEach(([, v]) => {
                    if (v.patterns) stack.push(v as ExTokenRepoPattern);
                });
            } else {
                assert(!p.match.hasIndices, "This pattern should not have the 'd' flag set!");
            }
        } else {
            assert(false, "Should not get here!");
        }
    }
}

export function escapeRegExpCharacters(value: string): string {
    return value.replace(/[-\\{}*+?|^$.,[\]()#\s]/g, "\\$&");
}

class DocumentTokenizer {
    private readonly backrefReplaceRe = /\\(\d+)/g;
    public readonly tokens: Vector<Token> = new Vector<Token>(16384);

    constructor(document: TextDocument) {
        const text = document.getText();
        const carret = new TokenPosition(0, 0, 0);
        this.executePattern(basePatterns as ExTokenRepoPattern, text, carret);
    }

    /**
     * Apply the capture patterns to the match
     * @param captures The captures to apply
     * @param match The match to apply the captures on
     * @param caret The reader head position within the document
     */
    private applyCaptures(captures: TokenPatternCapture, match: RegExpExecArray, caret: TokenPosition) {
        let lastMatchEnd = match.index;
        for (let i = 0; i < match.indices!.length; i++) {
            if (match.indices![i] === undefined) continue; // If the object at i is undefined, the capture is empty
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
            const [startPos, endPos] = match.indices![i];

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
                this.tokens.pushBack(new Token(p.token, startCaret, endCaret));
            }

            if (p.patterns) {
                const captureCaret = startCaret.clone();
                this.executePattern(p as ExTokenRepoPattern, content, captureCaret);

                assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                if (captureCaret.line !== endCaret.line) {
                    // Note: Moving the endCaret will also move the token, since this is a reference object
                    endCaret.setValue(captureCaret);
                }
            }

            caret.setValue(endCaret);
        }
    }

    private scanMatchPattern(pattern: ExTokenMatchPattern, text: string, matchOffsetStart: number, cache: Array<ScanResult | undefined>): ScanResult {
        const re = pattern.match;
        re.lastIndex = matchOffsetStart;
        const match = re.exec(text);
        if (match) {
            const result = { pattern: pattern, matchBegin: match };
            cache[pattern._patternId] = result;
            return result;
        }

        cache[pattern._patternId] = null;
        return null;
    }

    private scanRangePattern(next: ExTokenRangePattern, text: string, matchOffsetStart: number, cache: Array<ScanResult | undefined>): ScanResult {
        const reBegin = next.begin;
        reBegin.lastIndex = matchOffsetStart;
        const matchBegin = reBegin.exec(text);

        if (matchBegin) {
            let reEnd = next.end;

            // Replace all back references in end source
            if (next._hasBackref) {
                let reEndSource = next.end.source;

                this.backrefReplaceRe.lastIndex = 0;
                reEndSource = reEndSource.replace(this.backrefReplaceRe, (_, g1) => {
                    const content = matchBegin.at(parseInt(g1, 10));
                    if (content !== undefined) return escapeRegExpCharacters(content);
                    return "";
                });

                reEnd = new RegExp(reEndSource, next.end.flags);
            }

            // Start end pattern after the last matched character in the begin pattern
            reEnd.lastIndex = matchBegin.index + matchBegin[0].length;
            const matchEnd = reEnd.exec(text);

            if (matchEnd) {
                const result = { pattern: next, matchBegin: matchBegin, matchEnd: matchEnd };
                cache[next._patternId] = result;
                return result;
            }
        }

        cache[next._patternId] = null;
        return null;
    }

    /**
     * Scans the text for the best matching pattern.
     * @param p The pattern to use for matches
     * @param text The text to match on
     * @param matchOffsetStart The character offset in 'text' to start the match at.
     */
    public scanPattern(p: ExTokenRepoPattern, text: string, matchOffsetStart: number, cache: Array<ScanResult | undefined>): ScanResult {
        if (p.patterns.length === 0) return null;

        const cachedP = cache[p._patternId];
        if (cachedP !== undefined) {
            // If the cached value is null, no match was found in the entire text
            if (cachedP === null || cachedP.matchBegin.index >= matchOffsetStart) {
                return cachedP;
            }
        }

        let bestMatchRating = Number.MAX_VALUE;
        let bestResult: ScanResult = null;

        const size = p.patterns.length;
        let scanResult: ScanResult = null;

        for (let j = 0; j < size; j++) {
            const next = p.patterns[j];
            scanResult = null;

            // First check the cache
            const cachedResult = cache[next._patternId];
            if (cachedResult !== undefined) {
                // If the cached value is null, no match was found in the entire text
                if (cachedResult === null) continue;
                if (cachedResult.matchBegin.index >= matchOffsetStart) {
                    scanResult = cachedResult;
                }
            }

            if (scanResult === null) {
                switch (next._patternType) {
                    case TokenPatternType.MatchPattern:
                        scanResult = this.scanMatchPattern(next, text, matchOffsetStart, cache);
                        break;
                    case TokenPatternType.RangePattern:
                        scanResult = this.scanRangePattern(next, text, matchOffsetStart, cache);
                        break;
                    case TokenPatternType.RepoPattern:
                        scanResult = this.scanPattern(next, text, matchOffsetStart, cache);
                        cache[next._patternId] = scanResult;
                        break;
                    default:
                        assert(false, "Should not get here!");
                        break;
                }
            }

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
        cache[p._patternId] = bestResult;
        return bestResult;
    }

    /**
     * Executes the pattern on 'text', adding tokens to the token list.
     * @param pattern The repo pattern to use for matches.
     * @param text The text to match on.
     * @param caret The location of the reader head
     * @returns True if the pattern was matched
     * @todo Timeout after it was running too long
     */
    public executePattern(pattern: ExTokenRepoPattern, text: string, caret: TokenPosition) {
        const cache = new Array<ScanResult | undefined>(uniquePatternCount).fill(undefined);
        const initialCharOffset = caret.charStartOffset;
        const lastCharIndex = text.length;

        for (let lastMatchIndex = 0; lastMatchIndex < lastCharIndex; ) {
            const bestMatch = this.scanPattern(pattern, text, lastMatchIndex, cache);

            if (bestMatch === null) {
                // No match was found in the remaining text. Break the loop
                caret.advance(lastCharIndex - lastMatchIndex);
                lastMatchIndex = lastCharIndex;
                continue;
            }
            const failSafeIndex = lastMatchIndex; // Debug index to break in case of an infinite loop

            const p = bestMatch.pattern;
            switch (p._patternType) {
                case TokenPatternType.RangePattern:
                    {
                        const matchBegin = bestMatch.matchBegin;
                        const matchEnd = bestMatch.matchEnd!;
                        lastMatchIndex = matchEnd.index + matchEnd[0].length;
                        const contentLength = matchEnd.index - (matchBegin.index + matchBegin[0].length);

                        // Check for missing characters in a match
                        const matchOffset = initialCharOffset + matchBegin.index - caret.charStartOffset;
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
                        contentEndCaret.advance(contentLength); // Move caret to end of content

                        const endCaret = contentEndCaret.clone();
                        endCaret.advance(matchEnd[0].length); // Move caret to end of match

                        // p.token matches the whole range including the begin and end match content
                        if (p.token) {
                            this.tokens.pushBack(new Token(p.token, startCaret, endCaret));
                        }
                        // Begin captures are only applied to beginMatch[0] content
                        if (p.beginCaptures) {
                            const captureCaret = startCaret.clone();
                            this.applyCaptures(p.beginCaptures, matchBegin, captureCaret);

                            assert(captureCaret.charStartOffset === contentStartCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                            if (captureCaret.line !== endCaret.line) {
                                // Line was moved, all characters should reset to 0 and move by content length
                                contentStartCaret.setValue(captureCaret);

                                contentEndCaret.setValue(contentStartCaret);
                                contentEndCaret.advance(contentLength); // Move caret to end of content

                                // Note: Moving the endCaret will also move the token, since this is a reference object
                                endCaret.setValue(contentEndCaret);
                                endCaret.advance(matchEnd[0].length); // Move caret to end of match
                            }
                        }

                        // p.contentToken matches the range 'between'; after the end of beginMatch and before the start of endMatch
                        if (p.contentToken) {
                            this.tokens.pushBack(new Token(p.contentToken, contentStartCaret, contentEndCaret));
                        }

                        // Patterns are only applied on 'content' (see p.contentToken above)
                        if (p.patternsRepo) {
                            const captureCaret = contentStartCaret.clone();
                            const content = text.substring(matchBegin.index + matchBegin[0].length, matchEnd.index);
                            this.executePattern(p.patternsRepo, content, captureCaret);

                            assert(captureCaret.charStartOffset === contentEndCaret.charStartOffset, "The token read position was misaligned by the capture context!");

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

                            assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                            if (captureCaret.line !== endCaret.line) {
                                // Line was moved, all characters should reset to 0 and move by content length
                                // Note: Moving the endCaret will also move the token, since this is a reference object
                                endCaret.setValue(captureCaret);
                            }
                        }

                        caret.setValue(endCaret);
                    }
                    break;
                case TokenPatternType.MatchPattern:
                    {
                        const match = bestMatch.matchBegin;
                        lastMatchIndex = match.index + match[0].length;

                        // Check for missing characters in a match
                        const matchOffset = initialCharOffset + match.index - caret.charStartOffset;
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

                            this.tokens.pushBack(new Token(p.token, startCaret, endCaret));
                        }

                        if (p.captures) {
                            const captureCaret = startCaret.clone();
                            this.applyCaptures(p.captures, match, captureCaret);

                            assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                            // Note: Moving the endCaret will also move the token, since this is a reference object
                            if (captureCaret.line !== endCaret.line) {
                                endCaret.setValue(captureCaret);
                            }
                        }

                        caret.setValue(endCaret);
                    }
                    break;
                default:
                    assert(false, "Should not get here!");
                    break;
            }

            if (failSafeIndex === lastMatchIndex) {
                console.error("The loop has not advanced since the last cycle. This indicates a programming error. Breaking the loop!");
                break;
            }
        }
    }
}

// eslint-disable-next-line no-shadow
const enum TokenPatternType {
    RepoPattern = 0,
    RangePattern = 1,
    MatchPattern = 2,
}

interface PatternStateProperties {
    // Private cache properties set by the tokenizer
    _patternId: number;
    _patternType: TokenPatternType;
}

interface ExTokenCapturePattern extends TokenCapturePattern, PatternStateProperties {
    _patternType: TokenPatternType.RepoPattern;
    readonly token?: TokenType;
    readonly patterns?: TokenizerTokenPatternArray;
}

interface TokenizerTokenPatternCapture extends TokenPatternCapture {
    readonly [k: string | number]: ExTokenCapturePattern;
}

interface ExTokenRepoPattern extends TokenRepoPattern, PatternStateProperties {
    _patternType: TokenPatternType.RepoPattern;
    readonly patterns: TokenizerTokenPatternArray;
}

interface ExTokenRangePattern extends TokenRangePattern, PatternStateProperties {
    _patternType: TokenPatternType.RangePattern;
    _hasBackref: boolean;

    readonly beginCaptures?: TokenizerTokenPatternCapture;
    readonly endCaptures?: TokenizerTokenPatternCapture;

    patternsRepo?: ExTokenRepoPattern;
}

interface ExTokenMatchPattern extends TokenMatchPattern, PatternStateProperties {
    _patternType: TokenPatternType.MatchPattern;
    readonly captures?: TokenizerTokenPatternCapture;
}

type TokenizerTokenPatternArray = Array<TokenizerTokenPattern>;
type TokenizerTokenPattern = ExTokenRangePattern | ExTokenRepoPattern | ExTokenMatchPattern;
