// Workspace and file functions
"use strict";

import { Range } from "vscode";

export enum StatementToken {
    Keyword,
    Entity,
    Meta,
}

export enum KeywordTokenType {
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
}

export enum EntityTokenType {
    Namespace,
    Function,
    Tag,
    Variable,
}

export enum MetaTokenType {
    Comment,
    CommentCodeTag,
    PythonLine,
    PythonBlock,
    Arguments,

    Tag,
    Block,
}

export enum ExpressionToken {
    Unknown,
    Constant,

    Operator,
    Character,
}

export enum ConstantToken {
    String,
    Color,
    Boolean,
    Integer,
    Float,
}

export enum OperatorTokenType {
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

export enum CharacterTokenType {
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
export enum EscapedCharacterTokenType {
    Escaped_Whitespace, // \
    Escaped_Newline, // \n

    Escaped_Quote, // \'
    Escaped_DoubleQuote, // \"
    Escaped_Backslash, // \\
    Escaped_OpenSquareBracket, // [[
    Escaped_OpenBracket, // {{
}

export type TokenType = StatementToken | ExpressionToken;
export type StatementTokenSubType = KeywordTokenType | EntityTokenType | MetaTokenType;
export type ExpressionTokenSubType = ConstantToken | OperatorTokenType | CharacterTokenType | EscapedCharacterTokenType;
export type TokenSubType = StatementTokenSubType | ExpressionTokenSubType;

export class Token {
    tokenType: TokenType;
    tokenSubType: TokenSubType;
    range: Range;

    constructor(tokenType: TokenType, tokenSubType: TokenSubType, range: Range) {
        this.range = range;
        this.tokenType = tokenType;
        this.tokenSubType = tokenSubType;
    }
}

export type TokenPatternCapture = {
    [k: string | number]: {
        token: TokenType;
        subToken: TokenSubType;
        patterns?: TokenPattern[];
    };
};

export interface ITokenPattern {
    token?: TokenType;
    subToken?: TokenSubType;
    patterns?: TokenPattern[];
}

export interface TokenIncludePattern {
    include?: TokenPattern;
}

export interface TokenRangePattern extends ITokenPattern {
    contentToken?: TokenType;

    begin: RegExp;
    beginCaptures?: TokenPatternCapture;

    end: RegExp;
    endCaptures?: TokenPatternCapture;
}

export interface TokenMatchPattern extends ITokenPattern {
    match: RegExp;
    captures?: TokenPatternCapture;
}

export type TokenPattern = TokenIncludePattern | TokenRangePattern | TokenMatchPattern | ITokenPattern;
