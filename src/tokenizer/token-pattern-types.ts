import { TokenType } from "./renpy-tokens";

export interface TokenCapturePattern {
    readonly token?: TokenType;
    readonly patterns?: TokenPatternArray;
}

export interface TokenPatternCapture {
    readonly [k: number]: TokenCapturePattern;
}

export interface TokenRepoPattern {
    readonly patterns: TokenPatternArray;

    // These are added to prevent falsy assignment
    token?: never;
    contentToken?: never;
    match?: never;
    begin?: never;
    end?: never;
    captures?: never;
    beginCaptures?: never;
    endCaptures?: never;
}

export interface TokenRangePattern {
    readonly token?: TokenType;
    readonly contentToken?: TokenType;

    begin: RegExp;
    readonly beginCaptures?: TokenPatternCapture;

    end: RegExp;
    readonly endCaptures?: TokenPatternCapture;

    readonly patterns?: TokenPatternArray;

    // These are added to prevent falsy assignment
    match?: never;
    captures?: never;
}

export interface TokenMatchPattern {
    readonly token?: TokenType;
    match: RegExp;
    readonly captures?: TokenPatternCapture;

    // These are added to prevent falsy assignment
    patterns?: never;
    contentToken?: never;
    begin?: never;
    beginCaptures?: never;
    end?: never;
    endCaptures?: never;
}

interface TokenPatternDebugInfo {
    readonly debugName?: string;
}

export declare type TokenPattern = (TokenRangePattern | TokenMatchPattern | TokenRepoPattern) & TokenPatternDebugInfo;
export declare type TokenPatternArray = Array<TokenPattern>;
