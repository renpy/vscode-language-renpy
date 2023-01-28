import { CharacterTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { TokenPattern } from "./token-pattern-types";

export const newLine: TokenPattern = {
    token: CharacterTokenType.NewLine,
    match: /\r\n|\r|\n/g,
};

export const whiteSpace: TokenPattern = {
    token: CharacterTokenType.WhiteSpace,
    match: /[ \t]+/g,
};

// NOTE: Having these patterns separated increases performance.
// Benchmark before making a change!
export const charactersPatten: TokenPattern = {
    debugName: "charactersPatten",

    patterns: [
        newLine,
        whiteSpace,
        {
            token: CharacterTokenType.OpenParentheses,
            match: /\(/g,
        },
        {
            token: CharacterTokenType.CloseParentheses,
            match: /\)/g,
        },

        {
            token: CharacterTokenType.OpenBracket,
            match: /{/g,
        },
        {
            token: CharacterTokenType.CloseBracket,
            match: /}/g,
        },

        {
            token: CharacterTokenType.OpenSquareBracket,
            match: /\[/g,
        },
        {
            token: CharacterTokenType.CloseSquareBracket,
            match: /\]/g,
        },

        {
            token: CharacterTokenType.Period,
            match: /\./g,
        },
        {
            token: CharacterTokenType.Colon,
            match: /:/g,
        },
        {
            token: CharacterTokenType.Semicolon,
            match: /;/g,
        },
        {
            token: CharacterTokenType.Comma,
            match: /,/g,
        },
        {
            token: CharacterTokenType.Hashtag,
            match: /#/g,
        },

        {
            token: CharacterTokenType.Quote,
            match: /'/g,
        },
        {
            token: CharacterTokenType.DoubleQuote,
            match: /"/g,
        },
        {
            token: CharacterTokenType.BackQuote,
            match: /`/g,
        },

        {
            token: CharacterTokenType.Backslash,
            match: /\\/g,
        },
        {
            token: CharacterTokenType.ForwardSlash,
            match: /\//g,
        },

        {
            token: OperatorTokenType.Assign,
            match: /=/g,
        },

        {
            token: MetaTokenType.Invalid,
            match: /\b\w+\b/g,
        },
        {
            token: CharacterTokenType.Unknown,
            match: /./g,
        },
    ],
};

export const comments: TokenPattern = {
    debugName: "comments",

    token: MetaTokenType.Comment,
    match: /(#)(.*)$/dgm,
    captures: {
        1: { token: CharacterTokenType.Hashtag },
        2: {
            patterns: [
                {
                    match: /(?:\b(NOTE|XXX|HACK|FIXME|BUG|TODO)\b)/dg,
                    captures: { 1: { token: MetaTokenType.CommentCodeTag } },
                },
            ],
        },
    },
};

export const statements: TokenPattern = {
    debugName: "statements",
    patterns: [/* Items included in renpy token-patterns file*/],
};

export const expressions: TokenPattern = {
    debugName: "expressions",
    patterns: [/* Items included in renpy token-patterns file*/],
};