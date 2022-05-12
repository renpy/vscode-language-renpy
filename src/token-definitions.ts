// Workspace and file functions
"use strict";

import { Range } from "vscode";

export const enum StatementToken {
    Keyword,
    Entity,
    Meta,
}

export const enum KeywordTokenType {
    // Python statement keywords
    Init,
    Python,
    Hide,
    Early,
    In,
    Define,
    Default,

    // Renpy keywords
    Label,
    Play,
    Pause,
    Screen,
    Scene,
    Show,
    Image,
    Transform,

    // Conditional control flow keywords
    If,
    Elif,
    Else,

    // Control flow keywords
    For,
    While,
    Pass,
    Return,
    Menu,
    Jump,
    Call,

    // Renpy sub expression keywords
    Set,
    Expression,
    Sound,
    At,
    With,
    From,
    DollarSign,
}

export const enum EntityTokenType {
    Namespace,
    Function,
    Tag,
    Variable,
}

export const enum MetaTokenType {
    Comment,
    CommentCodeTag,
    PythonLine,
    PythonBlock,
    Arguments,

    Tag,
    Placeholder,
    Block,
    Invalid,
    EmptyString,
}

export const enum ExpressionToken {
    Unknown,
    Constant,

    Operator,
    Character,
}

export const enum ConstantTokenType {
    String,
    UnquotedString,
    Color,
    Boolean,
    Integer,
    Float,
}

export const enum OperatorTokenType {
    Assign, // =
    PlusPlus, // ++
    MinMin, // --
    PlusAssign, // +=
    MinusAssign, // -=
    MultiplyAssign, // *=
    DivideAssign, // /=

    Divide, // /
    Multiply, // *
    Plus, // +
    Minus, // -

    And, // &&
    Or, // ||
    Equals, // ==
    NotEquals, // !=
    Not, // !
    GreaterThan, // >
    LessThan, // <
    GreaterThanEquals, // >=
    LessThanEquals, // <=
}

export const enum CharacterTokenType {
    Unknown,
    WhiteSpace,

    OpenParentheses, // (
    CloseParentheses, // )

    OpenBracket, // {
    CloseBracket, // }

    OpenSquareBracket, // [
    CloseSquareBracket, // ]

    Colon, // :
    Semicolon, // ;
    Comma, // ,

    Hashtag, // #

    Quote, // '
    DoubleQuote, // "
    BackQuote, // `

    Backslash, // \
}

// Only valid inside strings
export const enum EscapedCharacterTokenType {
    Escaped_Whitespace, // \
    Escaped_Newline, // \n

    Escaped_Quote, // \'
    Escaped_DoubleQuote, // \"
    Escaped_Backslash, // \\
    Escaped_OpenSquareBracket, // [[
    Escaped_OpenBracket, // {{
}

export type TokenBaseType = StatementToken | ExpressionToken;
export type StatementTokenSubType = KeywordTokenType | EntityTokenType | MetaTokenType;
export type ExpressionTokenSubType = ConstantTokenType | OperatorTokenType | CharacterTokenType | EscapedCharacterTokenType;
export type TokenType = StatementTokenSubType | ExpressionTokenSubType;

export class Token {
    readonly tokenType: TokenType;
    readonly range: Range;

    constructor(tokenType: TokenType, range: Range) {
        this.range = range;
        this.tokenType = tokenType;
    }
}

export interface TokenIncludePattern {
    readonly include: TokenPattern;
}

export type TokenPatternCapture = {
    readonly [k: string | number]: { readonly token?: TokenType; readonly patterns?: TokenPatternArray };
};

export interface TokenMatchPattern {
    readonly token?: TokenType;
    readonly match: RegExp;
    readonly captures?: TokenPatternCapture;
}

export interface TokenRangePattern {
    readonly token?: TokenType;
    readonly contentToken?: TokenType;

    readonly begin: RegExp;
    readonly beginCaptures?: TokenPatternCapture;

    readonly end: RegExp;
    readonly endCaptures?: TokenPatternCapture;

    readonly patterns?: TokenPatternArray;
}

export interface TokenRepoPattern {
    readonly patterns: TokenPatternArray;
}

export type TokenPatternArray = Array<TokenIncludePattern | TokenRangePattern | TokenMatchPattern>;
export type TokenPattern = TokenIncludePattern | TokenRangePattern | TokenMatchPattern | TokenRepoPattern;

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
