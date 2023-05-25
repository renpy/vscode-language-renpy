/* eslint-disable no-useless-escape */
/* eslint-disable no-useless-backreference */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { CharacterTokenType, EntityTokenType, EscapedCharacterTokenType, LiteralTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { TokenPattern } from "./token-pattern-types";

export const newLine: TokenPattern = {
    token: CharacterTokenType.NewLine,
    match: /\r\n|\r|\n/g,
};

export const whiteSpace: TokenPattern = {
    token: CharacterTokenType.Whitespace,
    match: /[ \t]+/g,
};

export const invalidToken: TokenPattern = {
    match: /.+/g,
    token: MetaTokenType.Invalid /*invalid.unknown.token.renpy*/,
};

export const numFloat: TokenPattern = {
    debugName: "numFloat",

    token: LiteralTokenType.Float, // constant.numeric.float.renpy
    match: /(?<!\w)(?:\.[0-9]*|[0-9]*\.[0-9]*|[0-9]*\.)\b/g,
};
export const numInt: TokenPattern = {
    debugName: "numInt",

    token: LiteralTokenType.Integer, // constant.numeric.dec.renpy
    match: /(?<![\w.])(?:[1-9]*|0+|0([0-9]+)(?![eE.]))\b/dg,
    captures: {
        1: { token: MetaTokenType.Invalid },
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
    patterns: [
        {
            debugName: "stringTags.patterns![0]",

            // Valid tags without params (self-closing)
            token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.self-closing.renpy*/,
            match: /({)\s*(nw|done|fast|p|w|clear)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![1]",

            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.self-closing.renpy*/,
            match: /({)\s*(p|w)(=)(\+?)(\d*(?:.\d+)?)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: OperatorTokenType.Plus /*keyword.operator.arithmetic.plus.renpy*/ },
                5: { token: LiteralTokenType.Float /*constant.numeric.float.renpy support.constant.property-value.renpy*/ },
                6: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![2]",

            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.self-closing.renpy*/,
            match: /({)\s*(v?space)(=)(\+?)(\d+)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: OperatorTokenType.Plus /*keyword.operator.arithmetic.plus.renpy*/ },
                5: { token: LiteralTokenType.Integer /*constant.numeric.integer.renpy support.constant.property-value.renpy*/ },
                6: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![3]",

            // Comment tag (self-closing)
            token: MetaTokenType.StringTag /*meta.string.tag.comment.self-closing.renpy*/,
            match: /({)\s*(#)\s*(.*?)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: MetaTokenType.Comment /*comment.line.number-sign.renpy punctuation.definition.comment.renpy*/ },
                3: { token: MetaTokenType.Comment /*comment.line.number-sign.renpy*/ },
                4: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![4]",

            // Valid tags with file param
            token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.self-closing.renpy*/,
            match: /({)\s*(image)(=)([\w.]+)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: LiteralTokenType.String /*string.unquoted.renpy support.constant.property-value.renpy*/ },
                5: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![5]",

            // Valid tags without params (close required)
            contentToken: MetaTokenType.TaggedString /*meta.tagged.string.renpy renpy.meta.${2:/downcase}*/,
            begin: /({)\s*(u|i|b|s|plain|alt|noalt|art|rb|rt)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            patterns: [stringsInterior],
        },
        {
            debugName: "stringTags.patterns![6]",

            // Valid tags with numeric params (close required)
            contentToken: MetaTokenType.TaggedString /*meta.tagged.string.renpy renpy.meta.${2:/downcase}*/,
            begin: /({)\s*(alpha|cps|k)(=)(?:(\*)|(\-)|(\+))?(\d*(?:.\d+)?)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: OperatorTokenType.Multiply /*keyword.operator.arithmetic.Multiply.renpy*/ },
                5: { token: OperatorTokenType.Minus /*keyword.operator.arithmetic.Minus.renpy*/ },
                6: { token: OperatorTokenType.Plus /*keyword.operator.arithmetic.Plus.renpy*/ },
                7: { token: MetaTokenType.ConstantNumeric /*constant.numeric.renpy support.constant.property-value.renpy*/ },
                8: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            patterns: [stringsInterior],
        },
        {
            debugName: "stringTags.patterns![7]",

            // Valid tags with numeric params (close required)
            contentToken: MetaTokenType.TaggedString /*meta.tagged.string.renpy renpy.meta.${2:/downcase}*/,
            begin: /({)\s*(size)(=)([\-+]?)(\d+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: MetaTokenType.ArithmeticOperator /*keyword.operator.arithmetic.renpy*/ },
                5: { token: LiteralTokenType.Integer /*constant.numeric.integer.renpy support.constant.property-value.renpy*/ },
                6: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            patterns: [stringsInterior],
        },
        {
            debugName: "stringTags.patterns![8]",

            // Valid tags with file param (close required)
            token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.self-closing.renpy*/,
            begin: /({)\s*(font)(=)([\w.]+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: LiteralTokenType.String /*string.unquoted.renpy support.constant.property-value.renpy*/ },
                5: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            patterns: [stringsInterior],
        },
        {
            debugName: "stringTags.patterns![9]",

            // Color tag
            contentToken: MetaTokenType.TaggedString /*meta.tagged.string.renpy renpy.meta.${2:/downcase}.${4:/downcase}*/,
            begin: /({)\s*(color|outlinecolor)(=)(#?[a-zA-Z0-9]+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: {
                    token: LiteralTokenType.Color /*constant.color.renpy*/,
                    patterns: [hexLiteral],
                },
                5: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            patterns: [stringsInterior],
        },
        {
            debugName: "stringTags.patterns![10]",

            // a tag
            contentToken: MetaTokenType.TaggedString /*meta.tagged.string.renpy renpy.meta.${2:/downcase}*/,
            begin: /({)\s*(a)(=)(.*?)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: {
                    token: LiteralTokenType.String /*string.unquoted.renpy support.constant.property-value.renpy*/,
                    patterns: [],
                },
                5: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
            patterns: [stringsInterior],
        },
        {
            debugName: "stringTags.patterns![11]",

            // Unknown tag (Single line support only cus \R does not work) (Since we don't know if a tag is self closing, we can't assume that an end pattern exists)
            match: /({)[ \t]*(\w+)\b(?:(=)(.*?))?\s*(})((?:.|\R)+?)\s*({\/)\s*(\2)\s*(})/dg,
            captures: {
                1: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy punctuation.definition.tag.begin.renpy*/ },
                2: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy renpy.meta.u entity.name.tag.${2:/downcase}.renpy*/ },
                3: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy constant.other.placeholder.tags.renpy*/ },
                5: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy punctuation.definition.tag.end.renpy*/ },
                6: { token: MetaTokenType.TaggedString /*meta.tagged.string.renpy renpy.meta.string.tag.custom.${2:/downcase }*/, patterns: [stringsInterior] },
                7: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy punctuation.definition.tag.begin.renpy*/ },
                8: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy renpy.meta.u entity.name.tag.${2:/downcase}.renpy*/ },
                9: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![12]",

            // Unknown tag start
            match: /({)\s*(\w*)(?:(=)(.*?))?\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.start.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy renpy.meta.u*/ },
                3: { token: CharacterTokenType.EqualsSymbol /*punctuation.separator.key-value.renpy keyword.operator.assignment.renpy*/ },
                4: {
                    token: MetaTokenType.ConstantCaps /*constant.other.placeholder.tags.renpy support.constant.property-value.renpy*/,
                    patterns: [],
                },
                5: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
        {
            debugName: "stringTags.patterns![13]",

            // Unknown tag end
            match: /({\/)\s*(\w*?)\b\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.StringTag /*meta.string.tag.${2:/downcase}.end.renpy*/ },
                1: { token: CharacterTokenType.OpenBracket /*punctuation.definition.tag.begin.renpy*/ },
                2: { token: EntityTokenType.TagName /*entity.name.tag.${2:/downcase}.renpy renpy.meta.u*/ },
                3: { token: CharacterTokenType.CloseBracket /*punctuation.definition.tag.end.renpy*/ },
            },
        },
    ],
};

stringsInterior.patterns!.push(stringTags);

export const strings: TokenPattern = {
    debugName: "strings",

    token: LiteralTokenType.String /*string.quoted.renpy*/,
    begin: /"""|"|'''|'|```|`/dg,
    beginCaptures: {
        0: { token: MetaTokenType.StringBegin /*punctuation.definition.string.begin.renpy*/ },
    },
    end: /(?<![^\\]\\)(((?<=\0)\0)|\0)/dg,
    endCaptures: {
        1: { token: MetaTokenType.StringEnd /*punctuation.definition.string.end.renpy*/ },
        2: { token: MetaTokenType.EmptyString /*meta.empty-string.renpy*/ },
    },
    patterns: [stringsInterior],
};

// NOTE: Having these patterns separated increases performance.
// Benchmark before making a change!
export const fallbackCharacters: TokenPattern = {
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
            token: OperatorTokenType.Assignment,
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
