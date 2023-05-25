/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-useless-backreference */
import { fallbackCharacters, comments, strings, whiteSpace, newLine } from "./common-token-patterns";
import { MetaTokenType } from "./renpy-tokens";
import { TokenPattern, TokenRepoPattern } from "./token-pattern-types";

export const pythonMemberAccess: TokenPattern = {
    patterns: [fallbackCharacters],
};

export const pythonExpressionBare: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonExpressionBase: TokenPattern = {
    patterns: [strings],
};
export const pythonExpression: TokenPattern = {
    // All valid Python expressions
    patterns: [pythonExpressionBase, pythonMemberAccess, fallbackCharacters],
};

export const semicolon: TokenPattern = {
    patterns: [
        {
            token: MetaTokenType.Invalid,
            match: /\\;$/g,
        },
    ],
};

export const pythonLiteral: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonIllegalOperator: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonOperator: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonCurlyBraces: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonItemAccess: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonList: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonOddFunctionCall: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonRoundBraces: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonFunctionCall: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonParameters: TokenPattern = {
    patterns: [whiteSpace],
};
export const pythonBuiltinFunctions: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonBuiltinTypes: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonBuiltinExceptions: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonMagicNames: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonSpecialNames: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonIllegalNames: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonSpecialVariables: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonEllipsis: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonPunctuation: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonLineContinuation: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonBuiltinPossibleCallables: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonFunctionArguments: TokenPattern = {
    patterns: [fallbackCharacters],
};
export const pythonNumber: TokenPattern = {
    patterns: [fallbackCharacters],
};

export const python: TokenRepoPattern = {
    patterns: [comments, strings, whiteSpace, newLine],
};
