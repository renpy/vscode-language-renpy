/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { CharacterTokenType, EntityTokenType, EscapedCharacterTokenType, LiteralTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { TokenPattern } from "./token-pattern-types";

export const newLine: TokenPattern = {
    token: CharacterTokenType.NewLine,
    match: /\r\n|\r|\n/g,
};

export const whiteSpace: TokenPattern = {
    token: CharacterTokenType.WhiteSpace,
    match: /[ \t]+/g,
};

export const invalidToken: TokenPattern = {
    match: /(.*)/dg,
    captures: {
        1: { token: MetaTokenType.Invalid },
    },
};

export const numFloat: TokenPattern = {
    debugName: "numFloat",

    match: /(?<!\w)(?:\.[0-9]+|[0-9]*\.[0-9]*|[0-9]*\.)\b/g,
    token: LiteralTokenType.Float,
};
export const numInt: TokenPattern = {
    debugName: "numInt",
    match: /(?<![\w.])([1-9]+|0+|0([0-9]+)(?![eE.]))\b/dg,
    captures: {
        1: { token: LiteralTokenType.Integer },
        2: { token: MetaTokenType.Invalid },
    },
};

export const escapedChar: TokenPattern = {
    debugName: "escapedChar",

    match: /(\\")|(\\')|(\\ )|(\\n)|(\\\\)|(\[\[)|({{)/dg,
    captures: {
        1: {
            token: EscapedCharacterTokenType.EscDoubleQuote,
        },
        2: {
            token: EscapedCharacterTokenType.EscQuote,
        },
        3: {
            token: EscapedCharacterTokenType.EscWhitespace,
        },
        4: {
            token: EscapedCharacterTokenType.EscNewline,
        },
        5: {
            token: EscapedCharacterTokenType.EscBackslash,
        },
        6: {
            token: EscapedCharacterTokenType.EscOpenBracket,
        },
        7: {
            token: EscapedCharacterTokenType.EscOpenSquareBracket,
        },
    },
};

export const hexLiteral: TokenPattern = {
    debugName: "hexLiteral",

    // Note: This pattern has no end check. Only use as include pattern!
    patterns: [
        {
            // rgb, rgba, rrggbb, rrggbbaa
            match: /#(?:[a-f0-9]{8}|[a-f0-9]{6}|[a-f0-9]{3,4})\b/gi,
            token: LiteralTokenType.Color,
        },
        {
            match: /#[a-f0-9]+\b/gi,
            token: MetaTokenType.Invalid,
        },
        {
            match: /(?:#[a-f0-9]*)?(.+)/dgi,
            token: LiteralTokenType.Color,
            captures: {
                1: { token: MetaTokenType.Invalid },
            },
        },
    ],
};

export const constantPlaceholder: TokenPattern = {
    debugName: "constantPlaceholder",

    // Python value interpolation using [ ... ]
    token: MetaTokenType.Placeholder,
    match: /(\[)(.*?)(\])(?![^[]*?\])/dg,
    captures: {
        1: { token: CharacterTokenType.OpenSquareBracket },
        2: { token: MetaTokenType.PythonLine },
        3: { token: CharacterTokenType.CloseSquareBracket },
    },
};

export const stringsInterior: TokenPattern = {
    debugName: "stringsInterior",

    patterns: [
        newLine,
        escapedChar,
        constantPlaceholder,
        /*stringTags*/ // pushed below
    ],
};

export const stringTags: TokenPattern = {
    debugName: "stringTags",

    patterns: [
        {
            // Valid tags without params (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(nw|done|fast|p|w|clear)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(p|w)(=)(\+)?(\d*(?:.\d+)?)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Plus },
                5: { token: LiteralTokenType.Float },
                6: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(v?space)(=)(\+)?(\d+)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Plus },
                5: { token: LiteralTokenType.Integer },
                6: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Comment tag (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(#)\s*(.*?)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Comment },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: LiteralTokenType.UnquotedString },
                5: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with file param
            token: MetaTokenType.TagBlock,
            match: /({)\s*(font|image)(=)([\w.]+)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: LiteralTokenType.UnquotedString },
                5: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags without params (close required)
            begin: /({)\s*(u|i|b|s|plain|alt|noalt|art|rb|rt)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
            end: /({)(\/)(\s+)?(\2)(\s+)?(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: EntityTokenType.Tag },
                5: { token: CharacterTokenType.WhiteSpace },
                6: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [stringsInterior],
        },
        {
            // Valid tags with numeric params (close required)
            begin: /({)\s*(alpha|cps|k)(=)(?:(\*)|(-)|(\+))?(\d+(?:.\d+)?)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Multiply },
                5: { token: OperatorTokenType.Minus },
                6: { token: OperatorTokenType.Plus },
                7: { token: LiteralTokenType.Float },
                8: { token: CharacterTokenType.CloseBracket },
            },
            end: /({)(\/)(\s+)?(\2)(\s+)?(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: EntityTokenType.Tag },
                5: { token: CharacterTokenType.WhiteSpace },
                6: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [stringsInterior],
        },
        {
            // Valid tags with numeric params (close required)
            begin: /({)\s*(size)(=)(?:(-)|(\+))?(\d+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Minus },
                5: { token: OperatorTokenType.Plus },
                6: { token: LiteralTokenType.Integer },
                7: { token: CharacterTokenType.CloseBracket },
            },
            end: /({)(\/)(\s+)?(\2)(\s+)?(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: EntityTokenType.Tag },
                5: { token: CharacterTokenType.WhiteSpace },
                6: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [stringsInterior],
        },
        {
            // Color tag
            begin: /({)\s*(color|outlinecolor)(=)(#?[a-zA-Z0-9]+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: {
                    patterns: [hexLiteral],
                },
                5: { token: CharacterTokenType.CloseBracket },
            },
            end: /({)(\/)(\s+)?(\2)(\s+)?(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: EntityTokenType.Tag },
                5: { token: CharacterTokenType.WhiteSpace },
                6: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [stringsInterior],
        },
        {
            // a tag
            begin: /({)\s*(a)(=)(.*?)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: {
                    token: LiteralTokenType.UnquotedString,
                },
                5: { token: CharacterTokenType.CloseBracket },
            },
            end: /({)(\/)(\s+)?(\2)(\s+)?(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: EntityTokenType.Tag },
                5: { token: CharacterTokenType.WhiteSpace },
                6: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [stringsInterior],
        },
        {
            contentToken: MetaTokenType.TagBlock,
            begin: /({)([ \t]+)?(\w+)\b(?:(=)(.*?))?([ \t]+)?(})/dg,
            beginCaptures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.WhiteSpace },
                3: { token: EntityTokenType.Tag },
                4: { token: OperatorTokenType.Assign },
                5: { token: MetaTokenType.Arguments },
                6: { token: CharacterTokenType.WhiteSpace },
                7: { token: CharacterTokenType.CloseBracket },
            },
            end: /({)(\/)([ \t]+)?(\3)([ \t]+)?(})/dg,
            endCaptures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: EntityTokenType.Tag },
                5: { token: CharacterTokenType.WhiteSpace },
                6: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [stringsInterior],
        },
        {
            // Empty tag end
            token: MetaTokenType.Invalid,
            match: /({)(\/)?(\s+)?(})/dg,
            captures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.ForwardSlash },
                3: { token: CharacterTokenType.WhiteSpace },
                4: { token: CharacterTokenType.CloseBracket },
            },
        },
    ],
};

stringsInterior.patterns!.push(stringTags);

export const stringQuotedDouble: TokenPattern = {
    debugName: "stringQuotedDouble",

    patterns: [
        {
            // Triple quoted block string
            token: LiteralTokenType.String,
            begin: /(")(")(")/dg,
            beginCaptures: {
                1: { token: CharacterTokenType.DoubleQuote },
                2: { token: CharacterTokenType.DoubleQuote },
                3: { token: CharacterTokenType.DoubleQuote },
            },
            end: /(?<!\\)((?<=""")(")""|""")/dg,
            endCaptures: {
                1: { token: CharacterTokenType.DoubleQuote },
                2: { token: MetaTokenType.EmptyString },
            },
            patterns: [stringsInterior],
        },
        {
            // Double quoted single line string
            token: LiteralTokenType.String,
            begin: /(")/dg,
            beginCaptures: {
                1: { token: CharacterTokenType.DoubleQuote },
            },
            end: /(?<!\\)((?<=")(")|")/dg,
            endCaptures: {
                1: { token: CharacterTokenType.DoubleQuote },
                2: { token: MetaTokenType.EmptyString },
                3: { token: MetaTokenType.Invalid },
            },
            patterns: [stringsInterior],
        },
    ],
};

export const stringQuotedSingle: TokenPattern = {
    debugName: "stringQuotedSingle",

    patterns: [
        {
            // Single quoted block string
            token: LiteralTokenType.String,
            begin: /(''')/dg,
            beginCaptures: {
                0: { token: CharacterTokenType.Quote },
            },
            end: /(?<!\\)((?<=''')('|''')|''')/dg,
            endCaptures: {
                1: { token: CharacterTokenType.Quote },
                2: { token: MetaTokenType.EmptyString },
            },
            patterns: [stringsInterior],
        },
        {
            // Single quoted single line string
            token: LiteralTokenType.String,
            begin: /(')/dg,
            beginCaptures: {
                1: { token: CharacterTokenType.Quote },
            },
            end: /(?<!\\)((?<=')(')|')/dg,
            endCaptures: {
                1: { token: CharacterTokenType.Quote },
                2: { token: MetaTokenType.EmptyString },
                3: { token: MetaTokenType.Invalid },
            },
            patterns: [stringsInterior],
        },
    ],
};

export const stringQuotedBack: TokenPattern = {
    debugName: "stringQuotedBack",

    patterns: [
        {
            // Back quoted block string
            token: LiteralTokenType.String,
            begin: /(```)/dg,
            beginCaptures: {
                0: { token: CharacterTokenType.BackQuote },
            },
            end: /(?<!\\)((?<=```)(`)``|```)/dg,
            endCaptures: {
                1: { token: CharacterTokenType.BackQuote },
                2: { token: MetaTokenType.EmptyString },
            },
            patterns: [stringsInterior],
        },
        {
            // Back quoted single line string
            token: LiteralTokenType.String,
            begin: /(`)/dg,
            beginCaptures: {
                1: { token: CharacterTokenType.BackQuote },
            },
            end: /(?<!\\)((?<=`)(`)|`)/dg,
            endCaptures: {
                1: { token: CharacterTokenType.BackQuote },
                2: { token: MetaTokenType.EmptyString },
                3: { token: MetaTokenType.Invalid },
            },
            patterns: [stringsInterior],
        },
    ],
};

export const strings: TokenPattern = {
    debugName: "strings",

    patterns: [stringQuotedDouble, stringQuotedSingle, stringQuotedBack],
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
    patterns: [
        /* Items included in renpy token-patterns file*/
    ],
};

export const expressions: TokenPattern = {
    debugName: "expressions",
    patterns: [
        /* Items included in renpy token-patterns file*/
    ],
};
