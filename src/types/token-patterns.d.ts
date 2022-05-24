interface TokenCapturePattern {
    readonly token?: TokenType;
    readonly patterns?: TokenPatternArray;
}

interface TokenPatternCapture {
    readonly [k: string | number]: TokenCapturePattern;
}

interface TokenRepoPattern {
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

interface TokenRangePattern {
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

interface TokenMatchPattern {
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

declare type TokenPattern = TokenRangePattern | TokenMatchPattern | TokenRepoPattern;
declare type TokenPatternArray = Array<TokenPattern>;
