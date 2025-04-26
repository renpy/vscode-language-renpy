/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert } from "console";
import { performance } from "perf_hooks";
import { LogLevel, TextDocument, Uri, Range as VSRange, workspace } from "vscode";
import { Token, isRangePattern, isMatchPattern, isRepoPattern, TokenPosition, TokenTree, TreeNode, Range } from "./token-definitions";
import { RenpyPatterns } from "./token-patterns.g";
import { Stack } from "../utilities/stack";
import { Vector } from "../utilities/vector";
import { TokenPatternCapture, TokenCapturePattern, TokenRepoPattern, TokenRangePattern, TokenMatchPattern } from "./token-pattern-types";
import { LogCategory, logCatMessage } from "../logger";
import { escapeRegExpCharacters } from "../utilities/utils";
import { isShippingBuild } from "../extension";

interface MatchScanResult {
    pattern: ExTokenPattern;
    matchBegin: RegExpExecArray;
    matchEnd?: never;
    expanded?: never;
    contentMatches?: never;
    source?: never;
}
interface RangeScanResult {
    pattern: ExTokenPattern;
    matchBegin: RegExpExecArray;
    matchEnd: RegExpExecArray | null;
    expanded: boolean;
    contentMatches: Stack<ScanResult> | null;
    source: string;
}
type ScanResult = MatchScanResult | RangeScanResult | null;
type TokenCache = { readonly documentVersion: number; readonly tokens: TokenTree };

const RUN_BENCHMARKS = false;
//const TOKENIZER_TIMEOUT = 5_000;

export class Tokenizer {
    private static _uniquePatternCount = -1;
    private static _tokenCache = new Map<Uri, TokenCache>();

    public static get UNIQUE_PATTERN_COUNT() {
        return this._uniquePatternCount;
    }

    public static async tokenizeDocument(document: TextDocument) {
        this.setupAndValidatePatterns();

        if (RUN_BENCHMARKS) {
            this.benchmark(document);
        }

        const cachedTokens = this._tokenCache.get(document.uri);
        if (cachedTokens?.documentVersion === document.version) {
            return cachedTokens.tokens;
        }

        return await this.runTokenizer(document);
    }

    public static clearTokenCache() {
        this._tokenCache.clear();
    }

    private static async runTokenizer(document: TextDocument) {
        logCatMessage(LogLevel.Info, LogCategory.Tokenizer, `Running tokenizer on document: "${workspace.asRelativePath(document.uri, true)}"`);
        const tokenizer = new DocumentTokenizer(document);

        const t0 = performance.now();

        await Promise.resolve(tokenizer.tokenize());

        // TODO: Need to mark all these functions async for this to work properly
        /*await withTimeout(, TOKENIZER_TIMEOUT, () => {
            // If the tokenizer times out, we still want to cache the document so that we don't try to tokenize it again
            this._tokenCache.set(document.uri, { documentVersion: document.version, tokens: new TokenTree() });
            logToast(LogLevel.Info, `Tokenizer timed out after ${TOKENIZER_TIMEOUT}ms, while attempting to tokenize the document at: "${workspace.asRelativePath(document.uri, true)}"`);
        });*/

        const t1 = performance.now();

        logCatMessage(LogLevel.Info, LogCategory.Tokenizer, `Tokenizer completed in ${(t1 - t0).toFixed(2)}ms`);
        this._tokenCache.set(document.uri, { documentVersion: document.version, tokens: tokenizer.tokens });
        return tokenizer.tokens;
    }

    private static benchmark(document: TextDocument) {
        // screens.rpy, 10000 loops; 19.69293530988693 avg.

        const loops = 10000;
        const reportEveryXPercent = 1;

        const onePercent = loops / 100;
        const everyX = onePercent * reportEveryXPercent;

        logCatMessage(LogLevel.Info, LogCategory.Tokenizer, `Running tokenizer benchmark for ${loops} loops...`);

        let avg = 0;
        for (let i = 0; i < loops; ++i) {
            const t0 = performance.now();
            const tokenizer: DocumentTokenizer = new DocumentTokenizer(document);
            const t1 = performance.now();

            avg += t1 - t0;

            // This is really just here to prevent the unused variable error
            if (tokenizer.tokens.isEmpty()) {
                logCatMessage(LogLevel.Error, LogCategory.Tokenizer, "No tokens were found.");
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

            if (i % everyX === 0) {
                logCatMessage(LogLevel.Info, LogCategory.Tokenizer, `${i / onePercent}% complete... (avg.: ${msLoop.toFixed(2)}ms, approx. ${timeString} remaining)`);
            }
        }
        avg /= loops;

        logCatMessage(LogLevel.Info, LogCategory.Tokenizer, `DocumentTokenizer took ${avg} avg. milliseconds to complete.`);
    }

    private static setupAndValidatePatterns() {
        if (this._uniquePatternCount !== -1) {
            return;
        }

        this._uniquePatternCount = 0;
        const stack = new Stack<ExTokenPattern>(32);
        stack.push(RenpyPatterns.basePatterns as ExTokenRepoPattern);

        const mFlagRe = /(?<!\[)[\^$]/g;
        const gAnchorRe = /(?:\(\?!\\G\))|(?:\\G)/g;
        while (!stack.isEmpty()) {
            const p = stack.pop()!;
            assert(p !== undefined, "This pattern is undefined! Please make sure that circular includes are added after both patterns are defined.");

            if (p._patternId !== undefined && p._patternId !== -1) {
                continue; // This pattern was already validated
            }

            p._patternId = this._uniquePatternCount;
            ++this._uniquePatternCount;

            if (isRepoPattern(p)) {
                p._patternType = TokenPatternType.RepoPattern;
                for (let i = 0; i < p.patterns.length; ++i) {
                    stack.push(p.patterns[i]);
                }
            } else if (isRangePattern(p)) {
                p._patternType = TokenPatternType.RangePattern;
                let reBeginSource = p.begin.source;

                if (reBeginSource.match(mFlagRe)) {
                    assert(p.begin.multiline, "To match this pattern the 'm' flag is required on the begin RegExp!");
                }

                if (gAnchorRe.test(reBeginSource)) {
                    assert(false, "Can't use the \\G anchor, please update the regex!");
                    reBeginSource = reBeginSource.replace(gAnchorRe, "");
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

                if (mFlagRe.test(reEndSource)) {
                    assert(p.end.multiline, "To match this pattern the 'm' flag is required on the end RegExp!");
                }

                p._endNotG = false;
                if (gAnchorRe.test(reEndSource)) {
                    if (reEndSource.startsWith("(?!\\G)")) {
                        p._endNotG = true;
                    } else {
                        assert(false, "The end patterns only supports (?!\\G) at the start of the regex. Please update the regex!");
                        reEndSource = reEndSource.replace(gAnchorRe, "");
                    }
                }

                p._hasBackref = /\\\d+/.test(reEndSource);
                //reEndSource = reEndSource.replaceAll("\\A", "¨0");
                reEndSource = reEndSource.replaceAll("\\Z", "$(?!\r\n|\r|\n)");
                reEndSource = reEndSource.replaceAll("\\R", "(?!\r\n|\r|\n)");

                p.begin = new RegExp(reBeginSource, p.begin.flags);
                p.end = new RegExp(reEndSource, p.end.flags);
            } else if (isMatchPattern(p)) {
                p._patternType = TokenPatternType.MatchPattern;

                if (p.match.source.match(mFlagRe)) {
                    assert(p.match.multiline, "To match this pattern the 'm' flag is required!");
                }

                if (gAnchorRe.test(p.match.source)) {
                    assert(false, "The \\G anchors are not yet supported on match patterns!");
                    p.match = new RegExp(p.match.source.replace(gAnchorRe, ""), p.match.flags);
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
}

// eslint-disable-next-line no-shadow
const enum CaptureSource {
    MatchCaptures = 0,
    BeginCaptures = 1,
    EndCaptures = 2,
}

class DocumentTokenizer {
    private readonly backrefTestRe = /\\(\d+)/g;
    public readonly tokens: TokenTree = new TokenTree();
    private readonly document: TextDocument;

    constructor(document: TextDocument) {
        this.document = document;
    }

    public tokenize() {
        const text = this.document.getText();
        this.executePattern(RenpyPatterns.basePatterns as ExTokenRepoPattern, text, new Range(0, text.length), this.tokens.root);
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
     * @param pattern The source pattern
     * @param captureSource The capture source to use from the pattern
     * @param match The match to apply the captures on
     * @param caret The reader head position within the document
     */
    private applyCaptures(pattern: ExTokenPattern, captureSource: CaptureSource, match: RegExpExecArray, source: string, parentNode: TreeNode) {
        const captures = captureSource === CaptureSource.MatchCaptures ? pattern.captures : captureSource === CaptureSource.BeginCaptures ? pattern.beginCaptures : pattern.endCaptures;

        if (captures === undefined || match.indices === undefined) {
            return; // syntax error
        }

        let rootNode = parentNode;

        if (captures[0] !== undefined) {
            // If capture 0 is used, treat it as a wrapper token.
            rootNode = new TreeNode();
            parentNode.addChild(rootNode);
        }

        for (let i = 1; i < match.indices!.length; i++) {
            if (match.indices![i] === undefined) {
                continue; // If the object at i is undefined, the capture is empty
            }

            const [startPos, endPos] = match.indices![i];

            if (captures[i] === undefined) {
                if (!isShippingBuild()) {
                    // If this is a 'begin' capture it's also possible to have it matched on the end pattern. Let's make sure we don't report false positives.
                    if (captureSource === CaptureSource.BeginCaptures && pattern.end !== undefined) {
                        // test the end pattern for backreferences to this capture index
                        const captureRe = new RegExp(`\\\\${i}`, "g");
                        if (captureRe.test(pattern.end.source)) {
                            continue;
                        }
                    }

                    const pos = this.positionAt(startPos);
                    logCatMessage(
                        LogLevel.Debug,
                        LogCategory.Tokenizer,
                        `There is no pattern defined for capture group '${i}', on a pattern that matched '${match[i]}' near L:${pos.line + 1} C:${pos.character + 1}.\nThis should probably be added or be a non-capturing group.`,
                    );
                }

                continue;
            }

            const p = captures[i];
            const captureNode = new TreeNode();
            if (p.token) {
                captureNode.token = new Token(p.token, this.positionAt(startPos), this.positionAt(endPos));
            }

            if (p.patterns) {
                this.executePattern(p as ExTokenRepoPattern, source, new Range(startPos, endPos), captureNode);
            }

            if (!captureNode.isEmpty()) {
                rootNode.addChild(captureNode);
            }
        }

        if (captures[0] !== undefined) {
            const p = captures[0];
            const content = match[0];

            const startPos = match.index;
            const endPos = startPos + content.length;

            if (p.token) {
                rootNode.token = new Token(p.token, this.positionAt(startPos), this.positionAt(endPos));
            }

            if (p.patterns) {
                const captureNode = new TreeNode();
                rootNode.addChild(captureNode);

                this.executePattern(p as ExTokenRepoPattern, source, new Range(startPos, endPos), captureNode);
            }
        }
    }

    private scanMatchPattern(pattern: ExTokenMatchPattern, source: string, sourceStartOffset: number) {
        const re = pattern.match;
        re.lastIndex = sourceStartOffset;
        const match = re.exec(source);
        if (!match) {
            return null;
        }

        return { pattern, matchBegin: match } as MatchScanResult;
    }

    private scanRangePattern(pattern: ExTokenRangePattern, source: string, sourceStartOffset: number) {
        const reBegin = pattern.begin;
        reBegin.lastIndex = sourceStartOffset;
        const matchBegin = reBegin.exec(source);

        if (!matchBegin) {
            return null;
        }

        return { pattern, matchBegin: matchBegin, matchEnd: null, expanded: false, contentMatches: null, source } as RangeScanResult;
    }

    private expandRangeScanResult(result: RangeScanResult, cache: Array<ScanResult | undefined>) {
        const p = result.pattern as ExTokenRangePattern;
        const matchBegin = result.matchBegin;

        let reEnd = p.end;

        // Replace all back references in end source
        if (p._hasBackref) {
            let reEndSource = p.end.source;

            this.backrefTestRe.lastIndex = 0;
            reEndSource = reEndSource.replace(this.backrefTestRe, (_, g1) => {
                const backref = matchBegin.at(parseInt(g1, 10));
                if (backref !== undefined) {
                    return escapeRegExpCharacters(backref);
                }
                logCatMessage(LogLevel.Warning, LogCategory.Tokenizer, `Could not find content to replace backreference ${g1}!`);
                return "";
            });

            reEnd = new RegExp(reEndSource, p.end.flags);
        }

        // Start end pattern after the last matched character in the begin pattern
        reEnd.lastIndex = matchBegin.index + matchBegin[0].length;
        if (p._endNotG) {
            ++reEnd.lastIndex;
        }
        let matchEnd = reEnd.exec(result.source);
        const contentMatches = new Stack<ScanResult>();

        if (!matchEnd) {
            // If no end match could be found, we'll need to expand the range to the end of the source
            const reLastChar = /$(?!\r\n|\r|\n)/dg;
            reLastChar.lastIndex = Math.max(0, result.source.length - 1);
            matchEnd = reLastChar.exec(result.source);
        }

        if (matchEnd) {
            // Check if any child pattern has content that would extend the currently determined end match
            if (p._patternsRepo) {
                const sourceRange = new Range(matchBegin.index + matchBegin[0].length, matchEnd.index);

                // Scan the content for any matches that would extend beyond the current end match
                let lastCharIndex = sourceRange.end;
                let lastMatchIndex = sourceRange.start;
                while (lastMatchIndex < lastCharIndex) {
                    const bestMatch = this.scanPattern(p._patternsRepo, result.source, lastMatchIndex, cache);

                    if (!bestMatch || bestMatch.matchBegin.index >= lastCharIndex) {
                        break; // No valid match was found in the remaining text. Break the loop
                    }

                    const failSafeIndex = lastMatchIndex; // Debug index to break in case of an infinite loop

                    // Update the last match index to the end of the child match, so the next scan starts after it
                    const childMatchBegin = bestMatch.matchBegin;
                    if (bestMatch.pattern._patternType === TokenPatternType.RangePattern) {
                        if (bestMatch?.pattern._patternType === TokenPatternType.RangePattern && !bestMatch.expanded) {
                            this.expandRangeScanResult(bestMatch as RangeScanResult, cache);
                        }

                        const childMatchEnd = bestMatch.matchEnd!;
                        lastMatchIndex = childMatchEnd.index + childMatchEnd[0].length;
                    } else {
                        lastMatchIndex = childMatchBegin.index + childMatchBegin[0].length;
                    }

                    if (failSafeIndex === lastMatchIndex) {
                        logCatMessage(LogLevel.Error, LogCategory.Tokenizer, "The range expand loop has not advanced since the last cycle. This indicates a programming error. Breaking the loop!");
                        break;
                    }

                    // To speed up the search, we can add any tokens that are within the content range
                    contentMatches.push(bestMatch);

                    // If the child match last char doesn't extend the current range, we can also ignore it
                    if (lastMatchIndex <= lastCharIndex) {
                        continue;
                    }

                    // The child match is outside the range, so we should find a new end match
                    reEnd.lastIndex = lastMatchIndex;
                    matchEnd = reEnd.exec(result.source);

                    // If no end match could be found, assume the whole pattern is invalid
                    if (!matchEnd) {
                        break;
                    }

                    // Else update the new source range end
                    lastCharIndex = matchEnd.index;
                }
            }
        }

        if (!matchEnd) {
            // If no end match could be found, we'll need to expand the range to the end of the source
            const reLastChar = /$(?!\r\n|\r|\n)/g;
            reLastChar.lastIndex = Math.max(0, result.source.length - 1);
            matchEnd = reLastChar.exec(result.source);
        }

        result.matchEnd = matchEnd;
        result.contentMatches = contentMatches;
        result.expanded = true;
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
                if (cachedP?.pattern._patternType === TokenPatternType.RangePattern && !cachedP.expanded) {
                    this.expandRangeScanResult(cachedP as RangeScanResult, cache);
                }
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

            if (!scanResult) {
                continue;
            }

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

    private executeRangePattern(bestMatch: ScanResult, source: string, parentNode: TreeNode) {
        if (!bestMatch) {
            return;
        }
        assert(bestMatch.expanded, "A range pattern should always be expanded on execute.");

        const p = bestMatch.pattern as ExTokenRangePattern;
        const matchBegin = bestMatch.matchBegin;
        const matchEnd = bestMatch.matchEnd;

        const startPos = matchBegin.index;
        const endPos = matchEnd!.index + matchEnd![0].length;
        const contentStart = matchBegin.index + matchBegin[0].length;
        const contentEnd = matchEnd!.index;

        // p.token matches the whole range including the begin and end match content
        const rangeNode = new TreeNode();
        if (p.token) {
            rangeNode.token = new Token(p.token, this.positionAt(startPos), this.positionAt(endPos));
        }
        // Begin captures are only applied to beginMatch[0] content
        this.applyCaptures(p, CaptureSource.BeginCaptures, matchBegin, source, rangeNode);

        // Add an additional node for the content of the range pattern, since the content can be wrapped by an additional token
        const contentNode = new TreeNode();

        // p.contentToken matches the range 'between'; after the end of beginMatch and before the start of endMatch
        if (p.contentToken && contentStart !== contentEnd) {
            contentNode.token = new Token(p.contentToken, this.positionAt(contentStart), this.positionAt(contentEnd));
        }

        // Patterns are only applied on 'content' (see p.contentToken above)
        if (p._patternsRepo) {
            while (!bestMatch.contentMatches!.isEmpty()) {
                const contentScanResult = bestMatch.contentMatches!.pop()!;
                this.applyScanResult(contentScanResult, source, contentNode);
            }

            //this.executePattern(p._patternsRepo, source, new Range(contentStart, matchEnd!.index), contentNode);
        }

        if (!contentNode.isEmpty()) {
            rangeNode.addChild(contentNode);
        }

        // End captures are only applied to endMatch[0] content
        this.applyCaptures(p, CaptureSource.EndCaptures, matchEnd!, source, rangeNode);

        //assert(!rangeNode.isEmpty(), "A RangePattern must produce a valid token tree!");

        const coverageResult = this.checkTokenTreeCoverage(rangeNode, new Range(startPos, endPos));
        if (!coverageResult.valid) {
            logCatMessage(LogLevel.Debug, LogCategory.Tokenizer, `The token tree is not covering the entire match range!`);
            for (const gap of coverageResult.gaps) {
                const gapStartPos = this.document.positionAt(gap.start);
                const gapEndPos = this.document.positionAt(gap.end);
                const text = this.document.getText(new VSRange(gapStartPos, gapEndPos));
                logCatMessage(LogLevel.Debug, LogCategory.Tokenizer, `Gap from L:${gapStartPos.line + 1} C:${gapStartPos.character + 1} to L:${gapEndPos.line + 1} C:${gapEndPos.character + 1}, Text: '${text}'`);
            }
        }

        parentNode.addChild(rangeNode);
    }

    private executeMatchPattern(bestMatch: MatchScanResult, source: string, parentNode: TreeNode) {
        const p = bestMatch.pattern as ExTokenMatchPattern;
        const match = bestMatch.matchBegin;

        const contentNode = new TreeNode();
        const startPos = match.index;
        const endPos = startPos + match[0].length;

        if (p.token) {
            contentNode.token = new Token(p.token, this.positionAt(startPos), this.positionAt(endPos));
        }

        this.applyCaptures(p, CaptureSource.MatchCaptures, match, source, contentNode);

        const coverageResult = this.checkTokenTreeCoverage(contentNode, new Range(startPos, endPos));
        if (!coverageResult.valid) {
            logCatMessage(LogLevel.Debug, LogCategory.Tokenizer, `The token tree is not covering the entire match range!`);
            for (const gap of coverageResult.gaps) {
                const gapStartPos = this.document.positionAt(gap.start);
                const gapEndPos = this.document.positionAt(gap.end);
                const text = this.document.getText(new VSRange(gapStartPos, gapEndPos));
                logCatMessage(LogLevel.Debug, LogCategory.Tokenizer, `Gap from L${gapStartPos.line + 1}:${gapStartPos.character + 1} to L${gapEndPos.line + 1}:${gapEndPos.character + 1}, Text: '${text}'`);
            }
        }

        assert(p.token || p.captures, "A MatchPattern must have either a token or captures!");
        assert(!contentNode.isEmpty(), "A MatchPattern must produce a valid token tree!");

        parentNode.addChild(contentNode);
    }

    private applyScanResult(bestMatch: ScanResult, source: string, parentNode: TreeNode) {
        const p = bestMatch!.pattern;
        switch (p._patternType) {
            case TokenPatternType.RangePattern:
                this.executeRangePattern(bestMatch as RangeScanResult, source, parentNode);
                break;
            case TokenPatternType.MatchPattern:
                this.executeMatchPattern(bestMatch as MatchScanResult, source, parentNode);
                break;
            default:
                assert(false, "Should not get here!");
                break;
        }
    }

    /**
     * Executes the pattern on 'text', adding tokens to the token list.
     * @param pattern The repo pattern to use for matches.
     * @param source The text to match on.
     * @param caret The location of the reader head
     * @returns True if the pattern was matched
     * @todo Timeout after it was running too long
     */
    public executePattern(pattern: ExTokenRepoPattern, source: string, sourceRange: Range, parentNode: TreeNode) {
        if (source.length === 0) {
            return;
        }

        const cache = new Array<ScanResult | undefined>(Tokenizer.UNIQUE_PATTERN_COUNT).fill(undefined);
        const lastCharIndex = sourceRange.end;

        let lastMatchIndex = sourceRange.start;
        while (lastMatchIndex < lastCharIndex) {
            const bestMatch = this.scanPattern(pattern, source, lastMatchIndex, cache);

            if (!bestMatch) {
                break; // No valid match was found in the remaining text. Break the loop
            }

            const matchBegin = bestMatch.matchBegin;
            const beginMatchEnd = matchBegin.index + matchBegin[0].length;
            if (matchBegin.index >= lastCharIndex || beginMatchEnd > lastCharIndex) {
                break;
            }

            const failSafeIndex = lastMatchIndex; // Debug index to break in case of an infinite loop

            if (bestMatch.pattern._patternType === TokenPatternType.RangePattern) {
                if (bestMatch?.pattern._patternType === TokenPatternType.RangePattern && !bestMatch.expanded) {
                    this.expandRangeScanResult(bestMatch as RangeScanResult, cache);
                }

                const matchEnd = bestMatch.matchEnd!;
                lastMatchIndex = matchEnd.index + matchEnd[0].length;
            } else {
                lastMatchIndex = beginMatchEnd;
            }

            if (failSafeIndex === lastMatchIndex) {
                logCatMessage(LogLevel.Error, LogCategory.Tokenizer, "The loop has not advanced since the last cycle. This indicates a programming error. Breaking the loop!");
                break;
            }

            this.applyScanResult(bestMatch, source, parentNode);
        }
    }

    public positionAt(offset: number): TokenPosition {
        const pos = this.document.positionAt(offset);
        return new TokenPosition(pos.line, pos.character, offset);
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
    _endNotG: boolean;
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
