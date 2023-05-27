/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert, log } from "console";
import { performance } from "perf_hooks";
import { TextDocument, Uri, Range as VSRange } from "vscode";
import { Token, isRangePattern, isMatchPattern, isRepoPattern, TokenPosition, TokenTree, TreeNode, Range } from "./token-definitions";
import { basePatterns } from "./token-patterns.g";
import { Stack } from "../utilities/stack";
import { Vector } from "../utilities/vector";
import { CharacterTokenType } from "./renpy-tokens";
import { TokenPatternCapture, TokenCapturePattern, TokenRepoPattern, TokenRangePattern, TokenMatchPattern } from "./token-pattern-types";

interface MatchScanResult {
    pattern: ExTokenPattern;
    matchBegin: RegExpExecArray;
    matchEnd?: never;
    contentMatches?: never;
}
interface RangeScanResult {
    pattern: ExTokenPattern;
    matchBegin: RegExpExecArray;
    matchEnd: RegExpExecArray;
    contentMatches: Vector<ScanResult>;
}
type ScanResult = MatchScanResult | RangeScanResult | null;
type TokenCache = { readonly documentVersion: number; readonly tokens: TokenTree };

const tokenCache = new Map<Uri, TokenCache>();
const runBenchmark = false;
let uniquePatternCount = -1;

export function tokenizeDocument(document: TextDocument): TokenTree {
    setupAndValidatePatterns();

    if (runBenchmark) {
        benchmark(document);
    }

    const cachedTokens = tokenCache.get(document.uri);
    if (cachedTokens?.documentVersion === document.version) {
        return cachedTokens.tokens;
    }

    console.log(`Running tokenizer on document: ${document.fileName}`);
    const tokenizer = new DocumentTokenizer(document);
    console.log(`Tokenizer completed!`);
    tokenCache.set(document.uri, { documentVersion: document.version, tokens: tokenizer.tokens });
    return tokenizer.tokens;
}

export function clearTokenCache() {
    tokenCache.clear();
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
    const stack = new Stack<ExTokenPattern>(32);
    stack.push(basePatterns as ExTokenRepoPattern);

    const mFlagRe = /(?<!\[)[\^$]/g;
    const gReferenceRe = /\\G/g;
    while (!stack.isEmpty()) {
        const p = stack.pop()!;
        assert(p !== undefined, "This pattern is undefined! Please make sure that circular includes are added after both patterns are defined.");

        if (p._patternId !== undefined && p._patternId !== -1) continue; // This pattern was already validated

        p._patternId = uniquePatternCount;
        ++uniquePatternCount;

        if (isRepoPattern(p)) {
            p._patternType = TokenPatternType.RepoPattern;
            for (let i = 0; i < p.patterns.length; ++i) stack.push(p.patterns[i]);
        } else if (isRangePattern(p)) {
            p._patternType = TokenPatternType.RangePattern;
            if (p.begin.source.match(mFlagRe)) {
                assert(p.begin.multiline, "To match this pattern the 'm' flag is required on the begin RegExp!");
            }

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
                p._patternsRepo = {
                    patterns: p.patterns as ExTokenPatternArray,
                    _patternId: -1,
                    _patternType: TokenPatternType.RepoPattern,
                };
                stack.push(p._patternsRepo!);
            }

            let reEndSource = p.end.source;

            if (reEndSource.match(mFlagRe)) {
                assert(p.end.multiline, "To match this pattern the 'm' flag is required on the end RegExp!");
            }

            p._hasBackref = /\\\d+/.test(reEndSource);
            //reEndSource = reEndSource.replaceAll("\\A", "¨0");
            reEndSource = reEndSource.replaceAll("\\Z", "$(?!\r\n|\r|\n)");
            reEndSource = reEndSource.replaceAll("\\R", "(?!\r\n|\r|\n)");

            if (gReferenceRe.test(reEndSource)) {
                console.warn("Found \\G reference in end pattern. This is currently not supported. Replacing with empty string.");
                reEndSource = reEndSource.replaceAll("\\G", "");
            }

            p.end = new RegExp(reEndSource, p.end.flags);
        } else if (isMatchPattern(p)) {
            p._patternType = TokenPatternType.MatchPattern;

            if (p.match.source.match(mFlagRe)) {
                assert(p.match.multiline, "To match this pattern the 'm' flag is required!");
            }

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
    public readonly tokens: TokenTree = new TokenTree();
    private readonly document: TextDocument;

    constructor(document: TextDocument) {
        this.document = document;
        const text = document.getText();
        const caret = new TokenPosition(0, 0, 0);
        this.executePattern(basePatterns as ExTokenRepoPattern, text, caret, this.tokens.root);
    }

    private checkTokenTreeCoverage(root: TreeNode, matchRange: Range): { valid: boolean; gaps: Range[] } {
        // Collect all token ranges
        const tokenRanges = new Vector<Range>(root.count());
        if (root.token) {
            tokenRanges.pushBack(root.token.getRange());
        }
        root.forEach((node) => {
            if (node.token) {
                tokenRanges.pushBack(node.token.getRange());
            }
        });

        // Sort the token ranges by their start position
        tokenRanges.sort((a, b) => a.start - b.start);

        // Check if the combined ranges of all tokens overlap the entire character range of the match
        let currentEnd = matchRange.start;
        const gaps: Range[] = [];
        for (const range of tokenRanges) {
            if (!matchRange.contains(range.start)) {
                // The start of the next token range is outside the match range
                return { valid: false, gaps };
            }
            if (range.start > currentEnd) {
                // There is a gap between the current end position and the start of the next token range
                gaps.push(new Range(currentEnd, range.start));
            }
            currentEnd = Math.max(currentEnd, range.end);
        }
        if (currentEnd < matchRange.end) {
            // The last token range does not extend to the end of the match
            gaps.push(new Range(currentEnd, matchRange.end));
        }
        return { valid: gaps.length === 0, gaps };
    }

    /**
     * Apply the capture patterns to the match
     * @param captures The captures to apply
     * @param match The match to apply the captures on
     * @param caret The reader head position within the document
     */
    private applyCaptures(captures: TokenPatternCapture, match: RegExpExecArray, caret: TokenPosition, parentNode: TreeNode) {
        let rootNode = parentNode;

        if (captures[0] !== undefined) {
            // If capture 0 is used, treat it as a wrapper token.
            rootNode = new TreeNode();
            parentNode.addChild(rootNode);
        }

        const originalCaret = caret.clone();

        let lastMatchEnd = match.index;
        for (let i = 1; i < match.indices!.length; i++) {
            if (match.indices![i] === undefined) continue; // If the object at i is undefined, the capture is empty

            if (captures[i] === undefined) {
                console.warn(`There is no pattern defined for capture group '${i}', on a pattern that matched '${match[i]}' near L:${caret.line + 1} C:${caret.character + 1}.\nThis should probably be added or be a non-capturing group.`);
                continue;
            }

            const p = captures[i];
            const content = match[i];

            // Update the position carets
            const [startPos, endPos] = match.indices![i];

            // Check for missing characters in a match
            const matchOffset = startPos - lastMatchEnd;
            if (matchOffset !== 0) {
                // TODO: Fix match 0 pattern capture to include the missing tokens
                /*console.warn(
                    `A capture was misaligned (expected: ${startPos}, got: ${lastMatchEnd}) on a pattern that matched '${content}' near L:${caret.line + 1} C:${
                        caret.character + 1
                    }.\nYou should probably update the pattern to capture everything.\nApplying a fix...`
                );*/
                caret.advance(matchOffset);
            }
            lastMatchEnd = endPos;

            const startCaret = caret.clone();
            const endCaret = caret.clone();
            endCaret.advance(content.length); // Move caret to end of the current match

            const captureNode = new TreeNode();
            if (p.token) {
                if (p.token === CharacterTokenType.NewLine) {
                    endCaret.nextLine();
                }

                captureNode.token = new Token(p.token, startCaret, endCaret);
            }

            if (p.patterns) {
                const captureCaret = startCaret.clone();
                this.executePattern(p as ExTokenRepoPattern, content, captureCaret, captureNode);

                assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                if (captureCaret.line !== endCaret.line) {
                    // Note: Moving the endCaret will also move the token, since this is a reference object
                    endCaret.setValue(captureCaret);
                }
            }

            if (!captureNode.isEmpty()) {
                rootNode.addChild(captureNode);
            }

            caret.setValue(endCaret);
        }

        // Apply fix for ignored characters at the end of a match
        const matchOffset = match.index + match[0].length - lastMatchEnd;
        if (matchOffset !== 0) {
            caret.advance(matchOffset);
        }

        if (captures[0] !== undefined) {
            const p = captures[0];
            const content = match[0];

            const startCaret = originalCaret.clone();
            const endCaret = originalCaret.clone();
            endCaret.advance(content.length); // Move caret to end of the current match

            if (p.token) {
                if (p.token === CharacterTokenType.NewLine) {
                    endCaret.nextLine();
                }
                rootNode.token = new Token(p.token, startCaret, endCaret);
            }

            if (p.patterns) {
                const captureNode = new TreeNode();
                rootNode.addChild(captureNode);

                const captureCaret = startCaret.clone();
                this.executePattern(p as ExTokenRepoPattern, content, captureCaret, captureNode);

                assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

                if (captureCaret.line !== endCaret.line) {
                    // Note: Moving the endCaret will also move the token, since this is a reference object
                    endCaret.setValue(captureCaret);
                }
            }
        }
    }

    private scanMatchPattern(pattern: ExTokenMatchPattern, source: string, sourceStartOffset: number): ScanResult {
        const re = pattern.match;
        re.lastIndex = sourceStartOffset;
        const match = re.exec(source);
        if (match) {
            const result = { pattern: pattern, matchBegin: match };
            return result;
        }

        return null;
    }

    private scanRangePattern(next: ExTokenRangePattern, source: string, sourceStartOffset: number): ScanResult {
        const reBegin = next.begin;
        reBegin.lastIndex = sourceStartOffset;
        const matchBegin = reBegin.exec(source);

        if (matchBegin) {
            let reEnd = next.end;

            // Replace all back references in end source
            if (next._hasBackref) {
                let reEndSource = next.end.source;

                this.backrefReplaceRe.lastIndex = 0;
                reEndSource = reEndSource.replace(this.backrefReplaceRe, (_, g1) => {
                    const rangeContent = matchBegin.at(parseInt(g1, 10));
                    if (rangeContent !== undefined) {
                        return escapeRegExpCharacters(rangeContent);
                    }
                    return "";
                });

                reEnd = new RegExp(reEndSource, next.end.flags);
            }

            // Start end pattern after the last matched character in the begin pattern
            reEnd.lastIndex = matchBegin.index + matchBegin[0].length;
            let matchEnd = reEnd.exec(source);

            if (matchEnd) {
                // Check if any child pattern has content that would extend the currently determined end match
                const contentMatches = new Vector<ScanResult>(8);
                if (next._patternsRepo) {
                    const contentStartIndex = matchBegin.index + matchBegin[0].length;
                    const lastMatchedChar = matchEnd.index + matchEnd[0].length;

                    // Scan the content for any matches that would extend beyond the current end match
                    const tempCache = new Array<ScanResult | undefined>(uniquePatternCount).fill(undefined);
                    for (let lastMatchIndex = contentStartIndex; lastMatchIndex < lastMatchedChar; ) {
                        const bestChildMatch = this.scanPattern(next._patternsRepo, source, lastMatchIndex, tempCache);
                        if (!bestChildMatch) {
                            break; // No more matches
                        }
                        contentMatches.pushBack(bestChildMatch);

                        // Update the last match index to the end of the child match, so the next scan starts after it
                        const childMatchBegin = bestChildMatch.matchBegin;
                        if (bestChildMatch.pattern._patternType === TokenPatternType.RangePattern) {
                            const childMatchEnd = bestChildMatch.matchEnd!;
                            lastMatchIndex = childMatchEnd.index + childMatchEnd[0].length;
                        } else {
                            lastMatchIndex = childMatchBegin.index + childMatchBegin[0].length;
                        }

                        // Check if the match starts after the currently determined last character, if so we ignore it
                        if (childMatchBegin.index >= lastMatchedChar) {
                            continue;
                        }
                        // If the child match last char doesn't extend the current range, we can also ignore it
                        if (lastMatchIndex <= lastMatchedChar) {
                            continue;
                        }

                        // The child match is outside the range, so we should find a new end match
                        reEnd.lastIndex = lastMatchIndex;
                        matchEnd = reEnd.exec(source);

                        // If no end match could be found, assume the whole pattern is invalid
                        if (!matchEnd) {
                            break;
                        }
                    }
                }

                if (matchEnd) {
                    const result = {
                        pattern: next,
                        matchBegin: matchBegin,
                        matchEnd: matchEnd,
                        contentMatches: contentMatches,
                    };
                    return result;
                }
            }
        }

        return null;
    }

    /**
     * Scans the text for the best matching pattern.
     * @param p The pattern to use for matches
     * @param source The text to match on
     * @param sourceStartOffset The character offset in 'text' to start the match at.
     */
    public scanPattern(p: ExTokenRepoPattern, source: string, sourceStartOffset: number, cache: Array<ScanResult | undefined>): ScanResult {
        if (p.patterns.length === 0) {
            return null;
        }

        const cachedP = cache[p._patternId];
        if (cachedP !== undefined) {
            // If the cached value is null, no match was found in the entire text
            if (cachedP === null || cachedP.matchBegin.index >= sourceStartOffset) {
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
                if (cachedResult === null) {
                    continue;
                }

                if (cachedResult.matchBegin.index >= sourceStartOffset) {
                    scanResult = cachedResult;
                }
            }

            // The result wasn't cached or was invalidated, so we need to scan for the next match
            if (scanResult === null) {
                switch (next._patternType) {
                    case TokenPatternType.MatchPattern:
                        scanResult = this.scanMatchPattern(next, source, sourceStartOffset);
                        break;
                    case TokenPatternType.RangePattern:
                        scanResult = this.scanRangePattern(next, source, sourceStartOffset);
                        break;
                    case TokenPatternType.RepoPattern:
                        scanResult = this.scanPattern(next, source, sourceStartOffset, cache);
                        break;
                    default:
                        assert(false, "Invalid TokenPatternType found! If this triggers, setupAndValidatePatterns() didn't assign the PatternStateProperties properly.");
                        break;
                }

                // Cache the result
                cache[next._patternId] = scanResult;
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
            if (bestMatchRating === sourceStartOffset) {
                break;
            }
        }
        cache[p._patternId] = bestResult;
        return bestResult;
    }

    private executeRangePattern(p: ExTokenRangePattern, bestMatch: ScanResult, source: string, initialCharOffset: number, caret: TokenPosition, parentNode: TreeNode) {
        if (!bestMatch) {
            return;
        }
        const matchBegin = bestMatch.matchBegin;
        const matchEnd = bestMatch.matchEnd!;
        const contentLength = matchEnd.index - (matchBegin.index + matchBegin[0].length);

        // Check for missing characters in a match
        const matchOffset = initialCharOffset + matchBegin.index - caret.charStartOffset;
        if (matchOffset !== 0) {
            /*console.warn(
                                `A range begin match was misaligned (expected: ${initialCharOffset + matchBegin.index}, got: ${caret.charStartOffset}) on pattern '${p.begin.source}' that matched '${matchBegin[0]}' near L:${caret.line + 1} C:${
                                    caret.character + 1
                                }.\nYou probably didn't catch all characters in the match or the match before this one.\nApplying a fix...`;
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
        const rangeNode = new TreeNode();
        if (p.token) {
            rangeNode.token = new Token(p.token, startCaret, endCaret);
        }
        // Begin captures are only applied to beginMatch[0] content
        if (p.beginCaptures) {
            const captureCaret = startCaret.clone();
            this.applyCaptures(p.beginCaptures, matchBegin, captureCaret, rangeNode);

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

        // Add an additional node for the content of the range pattern, since the content can be wrapped by an additional token
        const contentNode = new TreeNode();

        // p.contentToken matches the range 'between'; after the end of beginMatch and before the start of endMatch
        if (p.contentToken) {
            contentNode.token = new Token(p.contentToken, contentStartCaret, contentEndCaret);
        }

        // Patterns are only applied on 'content' (see p.contentToken above)
        if (p._patternsRepo) {
            const captureCaret = contentStartCaret.clone();
            const content = source.substring(matchBegin.index + matchBegin[0].length, matchEnd.index);
            this.executePattern(p._patternsRepo, content, captureCaret, contentNode);

            if (captureCaret.line !== endCaret.line) {
                // TODO: Caret validation logic rewrite
                // Line was moved, all characters should reset to 0 and move by content length
                contentEndCaret.setValue(captureCaret);

                // Note: Moving the endCaret will also move the token, since this is a reference object
                endCaret.setValue(contentEndCaret);
                endCaret.advance(matchEnd[0].length); // Move caret to end of match
            }
        }

        if (!contentNode.isEmpty()) {
            rangeNode.addChild(contentNode);
        }

        // End captures are only applied to endMatch[0] content
        if (p.endCaptures) {
            const captureCaret = contentEndCaret.clone();
            this.applyCaptures(p.endCaptures, matchEnd, captureCaret, rangeNode);

            if (captureCaret.line !== endCaret.line) {
                // TODO: Caret validation logic rewrite
                // Line was moved, all characters should reset to 0 and move by content length
                // Note: Moving the endCaret will also move the token, since this is a reference object
                endCaret.setValue(captureCaret);
            }
        }

        assert(!rangeNode.isEmpty(), "A RangePattern must produce a valid token tree!");

        const coverageResult = this.checkTokenTreeCoverage(rangeNode, new Range(startCaret.charStartOffset, endCaret.charStartOffset));
        if (!coverageResult.valid) {
            console.warn(`The token tree is not covering the entire match range!`);
            for (const gap of coverageResult.gaps) {
                const gapStartPos = this.document.positionAt(gap.start);
                const gapEndPos = this.document.positionAt(gap.end);
                const text = this.document.getText(new VSRange(gapStartPos, gapEndPos));
                console.warn(`Gap from L${gapStartPos.line + 1}:${gapStartPos.character + 1} to L${gapEndPos.line + 1}:${gapEndPos.character + 1}, Text: '${text}'`);
            }
        }

        parentNode.addChild(rangeNode);

        caret.setValue(endCaret);
    }

    private executeMatchPattern(p: ExTokenMatchPattern, bestMatch: ScanResult, initialCharOffset: number, caret: TokenPosition, parentNode: TreeNode) {
        if (!bestMatch) {
            return;
        }

        const match = bestMatch.matchBegin;

        // Check for missing characters in a match
        const matchOffset = initialCharOffset + match.index - caret.charStartOffset;
        if (matchOffset !== 0) {
            /*console.warn(
                `A match was misaligned (expected: ${initialCharOffset + match.index}, got: ${caret.charStartOffset}) on pattern '${p.match.source}' that matched '${match[0]}' near L:${caret.line + 1} C:${
                    caret.character + 1
                }.\nYou probably didn't catch all characters in the match or the match before this one.\nApplying a fix...`
            );*/
            caret.advance(matchOffset);
        }

        const startCaret = caret.clone();

        const endCaret = startCaret.clone();
        endCaret.advance(match[0].length); // Move caret to end of match

        const contentNode = new TreeNode();
        if (p.token) {
            if (p.token === CharacterTokenType.NewLine) {
                endCaret.nextLine();
            }
            contentNode.token = new Token(p.token, startCaret, endCaret);
        }

        if (p.captures) {
            const captureCaret = startCaret.clone();
            this.applyCaptures(p.captures, match, captureCaret, contentNode);

            //assert(captureCaret.charStartOffset === endCaret.charStartOffset, "The token read position was misaligned by the capture context!");

            // Note: Moving the endCaret will also move the token, since this is a reference object
            if (captureCaret.line !== endCaret.line) {
                // TODO: Caret validation logic rewrite
                endCaret.setValue(captureCaret);
            }
        }

        const coverageResult = this.checkTokenTreeCoverage(contentNode, new Range(startCaret.charStartOffset, endCaret.charStartOffset));
        if (!coverageResult.valid) {
            console.warn(`The token tree is not covering the entire match range!`);
            for (const gap of coverageResult.gaps) {
                const gapStartPos = this.document.positionAt(gap.start);
                const gapEndPos = this.document.positionAt(gap.end);
                const text = this.document.getText(new VSRange(gapStartPos, gapEndPos));
                console.warn(`Gap from L${gapStartPos.line + 1}:${gapStartPos.character + 1} to L${gapEndPos.line + 1}:${gapEndPos.character + 1}, Text: '${text}'`);
            }
        }

        assert(p.token || p.captures, "A MatchPattern must have either a token or captures!");
        assert(!contentNode.isEmpty(), "A MatchPattern must produce a valid token tree!");
        parentNode.addChild(contentNode);

        caret.setValue(endCaret);
    }

    /**
     * Executes the pattern on 'text', adding tokens to the token list.
     * @param pattern The repo pattern to use for matches.
     * @param source The text to match on.
     * @param caret The location of the reader head
     * @returns True if the pattern was matched
     * @todo Timeout after it was running too long
     */
    public executePattern(pattern: ExTokenRepoPattern, source: string, caret: TokenPosition, parentNode: TreeNode) {
        if (source.length === 0) {
            return;
        }

        const cache = new Array<ScanResult | undefined>(uniquePatternCount).fill(undefined);
        const initialCharOffset = caret.charStartOffset;
        const lastCharIndex = source.length;

        for (let lastMatchIndex = 0; lastMatchIndex < lastCharIndex; ) {
            const bestMatch = this.scanPattern(pattern, source, lastMatchIndex, cache);

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
                    lastMatchIndex = bestMatch.matchEnd!.index + bestMatch.matchEnd![0].length;
                    this.executeRangePattern(p as ExTokenRangePattern, bestMatch, source, initialCharOffset, caret, parentNode);
                    break;
                case TokenPatternType.MatchPattern:
                    lastMatchIndex = bestMatch.matchBegin.index + bestMatch.matchBegin[0].length;
                    this.executeMatchPattern(p as ExTokenMatchPattern, bestMatch, initialCharOffset, caret, parentNode);
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

// These private cache properties are added to the pattern objects by the setupAndValidatePatterns() function.
// It uses a bit of javascript magic to add them to the original objects while leaving the references in tact.
// The remaining interfaces are there purely for type safety.
interface PatternStateProperties {
    _patternId: number;
    _patternType: TokenPatternType;
}

interface ExTokenCapturePattern extends TokenCapturePattern, PatternStateProperties {
    _patternType: TokenPatternType.RepoPattern;
    readonly patterns?: ExTokenPatternArray;
}

interface ExTokenPatternCapture extends TokenPatternCapture {
    readonly [k: number]: ExTokenCapturePattern;
}

interface ExTokenRepoPattern extends TokenRepoPattern, PatternStateProperties {
    _patternType: TokenPatternType.RepoPattern;
    readonly patterns: ExTokenPatternArray;
}

interface ExTokenRangePattern extends TokenRangePattern, PatternStateProperties {
    _patternType: TokenPatternType.RangePattern;
    _hasBackref: boolean;
    _patternsRepo?: ExTokenRepoPattern;

    readonly beginCaptures?: ExTokenPatternCapture;
    readonly endCaptures?: ExTokenPatternCapture;
    readonly patterns?: ExTokenPatternArray;
}

interface ExTokenMatchPattern extends TokenMatchPattern, PatternStateProperties {
    _patternType: TokenPatternType.MatchPattern;
    readonly captures?: ExTokenPatternCapture;
}

type ExTokenPattern = ExTokenRangePattern | ExTokenRepoPattern | ExTokenMatchPattern;
type ExTokenPatternArray = Array<ExTokenPattern>;
