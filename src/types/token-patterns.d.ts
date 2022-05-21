declare type TokenPatternCapture = {
    readonly [k: string | number]: { readonly token?: TokenType; readonly patterns?: TokenPatternArray };
};

interface TokenMatchPattern {
    _patternId?: number;

    readonly token?: TokenType;
    match: RegExp;
    readonly captures?: TokenPatternCapture;

    // These are added to prevent falsy assignment
    include?: never;
    patterns?: never;
    contentToken?: never;
    begin?: never;
    beginCaptures?: never;
    end?: never;
    endCaptures?: never;
}

interface TokenRangePattern {
    _patternId?: number;
    _hasBackref?: boolean;

    readonly token?: TokenType;
    readonly contentToken?: TokenType;

    begin: RegExp;
    readonly beginCaptures?: TokenPatternCapture;

    end: RegExp;
    readonly endCaptures?: TokenPatternCapture;

    readonly patterns?: TokenPatternArray;

    // These are added to prevent falsy assignment
    include?: never;
    match?: never;
    captures?: never;
}

interface TokenRepoPattern {
    _patternId?: number;
    readonly patterns: TokenPatternArray;

    // These are added to prevent falsy assignment
    include?: never;
    token?: never;
    contentToken?: never;
    match?: never;
    begin?: never;
    end?: never;
    captures?: never;
    beginCaptures?: never;
    endCaptures?: never;
}

declare type TokenPattern = TokenRangePattern | TokenMatchPattern | TokenRepoPattern;
declare type TokenPatternArray = Array<TokenPattern>;
