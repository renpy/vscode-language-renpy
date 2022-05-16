// Workspace and file functions
"use strict";

import { Range } from "vscode";

export class Token {
    readonly tokenType: TokenType;
    readonly range: Range;

    constructor(tokenType: TokenType, range: Range) {
        this.range = range;
        this.tokenType = tokenType;
    }
}

export function isIncludePattern(p: TokenPattern): p is TokenIncludePattern {
    return (p as TokenIncludePattern).include !== undefined;
}

export function isRangePattern(p: TokenPattern): p is TokenRangePattern {
    return (p as TokenRangePattern).begin !== undefined;
}

export function isMatchPattern(p: TokenPattern): p is TokenMatchPattern {
    return (p as TokenMatchPattern).match !== undefined;
}

export function isRepoPattern(p: TokenPattern): p is TokenRepoPattern {
    return !isRangePattern(p) && (p as TokenRepoPattern).patterns !== undefined;
}
