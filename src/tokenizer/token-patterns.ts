/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-useless-backreference */

// These patterns are converted from the tmLanguage file.
// Copy the patterns (the contents of the repository group) over and apply the following find and replace patterns:

import { CharacterTokenType, ConstantTokenType, EntityTokenType, EscapedCharacterTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "./renpy.tokens";

// find: ^( +)"(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?": \{$\n((?:^.*$\n)+?)^\1\},?
// replace with: const \L$2\u$3\u$4\u$5: TokenPattern = {\n$6};

// find: \{ "include": "#?(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?" }
// replace with: \L$1\u$2\u$3\u$4

// find: (?<=^ *|\{ )"comment": "(.*?)"(?=,$| })
// replace with: // $1

// find: (?<=^ *|\{ )"name": "(.*?)"(?=,$| })
// replace with: token: "$1"

// find: (?<=^ *|\{ )"contentName": "(.*?)"(?=,$| })
// replace with: contentToken: "$1"

// find: (?<=^ *|\{ )"(.*?)"(?=: [{["])
// replace with: $1

// find: (?<=(?:^ *|\{ )(?:match|begin|end): /.*?)\\\\(?=.*?/dg,?$)
// replace with: \

// find: (?<=(?:^ *|\{ )(?:match|begin|end): )"(.*?)"(?=,?$)
// replace with: /$1/dg

// Result should be manually fixed
// Make sure to include this in internal captures to detect all newline tokens

const lineContinuationPattern = /^(?!$|#)(?=(?!\1) *[^ \t#]|\1[^ \t#])|\Z/gm;

const newLine: TokenPattern = {
    token: CharacterTokenType.NewLine,
    match: /\r\n|\r|\n/g,
};

const whiteSpace: TokenPattern = {
    token: CharacterTokenType.WhiteSpace,
    match: /[ \t]+/g,
};

// NOTE: Having these patterns separated increases performance.
// Benchmark before making a change!
const unmatchedLoseChars: TokenPattern = {
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
            token: CharacterTokenType.Unknown,
            match: /./g,
        },
    ],
};

const escapedChar: TokenPattern = {
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

const hexLiteral: TokenPattern = {
    // Note: This pattern has no end check. Only use as include pattern!
    patterns: [
        {
            // rgb, rgba, rrggbb, rrggbbaa
            match: /#(?:[a-f0-9]{8}|[a-f0-9]{6}|[a-f0-9]{3,4})\b/gi,
            token: ConstantTokenType.Color,
        },
        {
            match: /#[a-f0-9]+\b/gi,
            token: MetaTokenType.Invalid,
        },
        {
            match: /(?:#[a-f0-9]*)?(.+)/dgi,
            token: ConstantTokenType.Color,
            captures: {
                1: { token: MetaTokenType.Invalid },
            },
        },
    ],
};

const constantPlaceholder: TokenPattern = {
    patterns: [
        {
            // Python value interpolation using [ ... ]
            token: MetaTokenType.Placeholder,
            match: /(\[)((?:.*\[.*?\])*.*?)(\])/dg,
            captures: {
                1: { token: CharacterTokenType.OpenSquareBracket },
                2: { token: MetaTokenType.PythonLine },
                3: { token: CharacterTokenType.CloseSquareBracket },
            },
        },
    ],
};

const stringsInterior: TokenPattern = {
    patterns: [
        newLine,
        escapedChar,
        constantPlaceholder,
        /*stringTags*/ // pushed below
    ],
};

const stringTags: TokenPattern = {
    patterns: [
        {
            // Valid tags without params (self-closing)
            match: /({)\s*(nw|done|fast|p|w|clear)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(p|w)(=)(\+)?(\d+(?:.\d+)?)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Plus },
                5: { token: ConstantTokenType.Float },
                6: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(v?space)(=)(\+)?(\d+)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Plus },
                5: { token: ConstantTokenType.Integer },
                6: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Hashtag tag (self-closing)
            token: MetaTokenType.TagBlock,
            match: /({)\s*(#)\s*(.*?)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: ConstantTokenType.UnquotedString },
                5: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with file param
            token: MetaTokenType.TagBlock,
            match: /({)\s*(font|image)(=)([\w.]+)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.TagBlock },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: ConstantTokenType.UnquotedString },
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
                7: { token: ConstantTokenType.Float },
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
                6: { token: ConstantTokenType.Integer },
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
                    token: ConstantTokenType.UnquotedString,
                    patterns: [],
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
            match: /({)(\s+)?(\w+)\b(?:(=)(.*?))?(\s+)?(})((?:.|\r\n|\r|\n)+?)({)(\/)(\s+)?(\3)(\s+)?(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: CharacterTokenType.WhiteSpace },
                3: { token: EntityTokenType.Tag },
                4: { token: OperatorTokenType.Assign },
                5: { token: MetaTokenType.Arguments },
                6: { token: CharacterTokenType.WhiteSpace },
                7: { token: CharacterTokenType.CloseBracket },
                8: {
                    token: MetaTokenType.TagBlock,
                    patterns: [stringsInterior],
                },
                9: { token: CharacterTokenType.OpenBracket },
                10: { token: CharacterTokenType.ForwardSlash },
                11: { token: CharacterTokenType.WhiteSpace },
                12: { token: EntityTokenType.Tag },
                13: { token: CharacterTokenType.WhiteSpace },
                14: { token: CharacterTokenType.CloseBracket },
            },
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

const stringQuotedDouble: TokenPattern = {
    patterns: [
        {
            // Triple quoted block string
            token: ConstantTokenType.String,
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
            token: ConstantTokenType.String,
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

const stringQuotedSingle: TokenPattern = {
    patterns: [
        {
            // Single quoted block string
            token: ConstantTokenType.String,
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
            token: ConstantTokenType.String,
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

const stringQuotedBack: TokenPattern = {
    patterns: [
        {
            // Back quoted block string
            token: ConstantTokenType.String,
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
            token: ConstantTokenType.String,
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

const strings: TokenPattern = {
    patterns: [stringQuotedDouble, stringQuotedSingle, stringQuotedBack],
};

const codeTags: TokenPattern = {
    match: /(?:\b(NOTE|XXX|HACK|FIXME|BUG|TODO)\b)/dg,
    captures: { 1: { token: MetaTokenType.CommentCodeTag } },
};

const comments: TokenPattern = {
    token: MetaTokenType.Comment,
    match: /(#)(.*)$/dgm,
    captures: {
        1: { token: CharacterTokenType.Hashtag },
        2: { patterns: [codeTags] },
    },
};

const pythonExpression: TokenPattern = {
    patterns: [whiteSpace],
};

const pythonParameters: TokenPattern = {
    patterns: [whiteSpace],
};

const pythonSource: TokenPattern = {
    patterns: [comments, strings, whiteSpace, newLine],
};

const pythonStatements: TokenPattern = {
    patterns: [
        {
            // Renpy python block
            token: MetaTokenType.Block,
            contentToken: MetaTokenType.PythonBlock,

            begin: /^([ \t]+)?(?:(init)(?:[ \t]+(-)?(\d+))?[ \t]+)?(python)[ \t]*(.*)?(:)/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: {}, // required for end match, but is already named by capture[0]
                2: { token: KeywordTokenType.Init },
                3: { token: OperatorTokenType.Minus },
                4: { token: ConstantTokenType.Integer },
                5: { token: KeywordTokenType.Python },
                6: {
                    token: MetaTokenType.Arguments,

                    patterns: [
                        {
                            // in statement
                            match: /(?:\s*(in)\s*([a-zA-Z_]\w*)\b)/dg,
                            captures: {
                                1: {
                                    token: OperatorTokenType.In,
                                },
                                2: {
                                    token: EntityTokenType.Namespace,
                                },
                            },
                        },
                        {
                            // keywords
                            match: /\b(hide)|(early)|(in)\b/dg,
                            captures: {
                                1: {
                                    token: KeywordTokenType.Hide,
                                },
                                2: {
                                    token: KeywordTokenType.Early,
                                },
                                3: {
                                    token: OperatorTokenType.In,
                                },
                            },
                        },
                    ],
                },
                7: {
                    token: CharacterTokenType.Colon,
                },
            },
            end: lineContinuationPattern,
            patterns: [pythonSource],
        },
        {
            // Match begin and end of python one line statements
            match: /^([ \t]+)?(?:(\$)|(define)|(default))([ \t]+)(.*)$/dgm,
            captures: {
                1: {
                    token: CharacterTokenType.WhiteSpace,
                },
                2: {
                    token: KeywordTokenType.DollarSign,
                },
                3: {
                    token: KeywordTokenType.Define,
                },
                4: {
                    token: KeywordTokenType.Default,
                },
                5: {
                    token: CharacterTokenType.WhiteSpace,
                },
                6: {
                    token: MetaTokenType.PythonLine,
                    patterns: [
                        {
                            // Type the first name as a variable (Probably not needed, but python doesn't seem to catch it)
                            match: /(?<!\.)\b\w+(?=\s=\s)/g,
                            token: EntityTokenType.Variable,
                        },
                        pythonSource,
                    ],
                },
            },
        },
    ],
};

const label: TokenPattern = {
    token: MetaTokenType.Block,
    match: /^[ \t]*(label)[ \t]+(.+)?(:)/dgm,
    captures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Label },
        2: {
            // label arguments
            token: MetaTokenType.Arguments,
            patterns: [
                {
                    // Function name
                    match: /[a-zA-Z_.]\w*/g,
                    token: EntityTokenType.Function,
                },
                {
                    match: /\(.*\)/dg,
                    captures: {
                        0: { patterns: [pythonParameters] },
                    },
                },
            ],
        },
        3: { token: CharacterTokenType.Colon },
    },
};

const menuOption: TokenPattern = {
    contentToken: MetaTokenType.MenuOptionBlock,
    begin: /^([ \t]+)?((?:".+")|(?:'.+')|(?:""".+"""))[ \t]*(.+)?(:)/dgm,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: {}, // required for end match, but is already named by capture[0]
        2: {
            token: MetaTokenType.MenuOption,
            patterns: [strings],
        },
        3: {
            // Menu Option arguments
            token: MetaTokenType.Arguments,
            patterns: [
                {
                    // Menu name
                    match: /[a-zA-Z_.]\w*/g,
                    token: EntityTokenType.Function,
                },
                {
                    match: /\(.*\)/dg,
                    captures: {
                        0: { patterns: [pythonParameters] },
                    },
                },
            ],
        },
        4: { token: CharacterTokenType.Colon },
    },
    end: /^(?!$|#)(?=(?!\1) *[^ \t#]|\1[^ \t#])|\Z/gm,

    patterns: [
        /*basePatterns*/
        // pushed below
    ],
};
const menu: TokenPattern = {
    token: MetaTokenType.Block,
    contentToken: MetaTokenType.MenuBlock,
    begin: /^([ \t]+)?(menu)[ \t]*(.+)?(:)/dgm,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: {}, // required for end match, but is already named by capture[0]
        2: { token: KeywordTokenType.Menu },
        3: {
            // Menu arguments
            token: MetaTokenType.Arguments,
            patterns: [
                {
                    // if condition
                    match: /\b(if)[ \t]+(.*)/dg,
                    captures: {
                        1: { token: KeywordTokenType.If },
                        2: { patterns: [pythonExpression] },
                    },
                },
                {
                    match: /.*/g,
                    token: MetaTokenType.Invalid,
                },
            ],
        },
        4: { token: CharacterTokenType.Colon },
    },
    end: /^(?!$|#)(?=(?!\1) *[^ \t#]|\1[^ \t#])|\Z/gm,
    patterns: [comments, strings, menuOption, unmatchedLoseChars],
};

const image: TokenPattern = {
    match: /^([ \t]+)?(image)([ \t]+)((?:[a-zA-Z_.]\w*[ \t]+)+)(=)/dgm,
    captures: {
        1: {
            token: CharacterTokenType.WhiteSpace,
        },
        2: {
            token: KeywordTokenType.Image,
        },
        3: {
            token: CharacterTokenType.WhiteSpace,
        },
        4: {
            patterns: [
                {
                    token: CharacterTokenType.WhiteSpace,
                    match: /[ \t]+/g,
                },
                {
                    // image names
                    token: EntityTokenType.Variable,
                    match: /[a-zA-Z_.]\w*/g,
                },
            ],
        },
        5: {
            token: OperatorTokenType.Assign,
        },
    },
};

const keywords: TokenPattern = {
    patterns: [
        {
            // Python statement keywords
            match: /\b(?:(init)|(python)|(hide)|(early)|(in)|(define)|(default))\b/dg,
            captures: {
                1: {
                    token: KeywordTokenType.Init,
                },
                2: {
                    token: KeywordTokenType.Python,
                },
                3: {
                    token: KeywordTokenType.Hide,
                },
                4: {
                    token: KeywordTokenType.Early,
                },
                5: {
                    token: OperatorTokenType.In,
                },
                6: {
                    token: KeywordTokenType.Define,
                },
                7: {
                    token: KeywordTokenType.Default,
                },
            },
        },
        {
            // Renpy keywords
            match: /\b(?:(label)|(play)|(pause)|(screen)|(scene)|(show)|(image)|(transform))\b/dg,
            captures: {
                1: {
                    token: KeywordTokenType.Label,
                },
                2: {
                    token: KeywordTokenType.Play,
                },
                3: {
                    token: KeywordTokenType.Pause,
                },
                4: {
                    token: KeywordTokenType.Screen,
                },
                5: {
                    token: KeywordTokenType.Scene,
                },
                6: {
                    token: KeywordTokenType.Show,
                },
                7: {
                    token: KeywordTokenType.Image,
                },
                8: {
                    token: KeywordTokenType.Transform,
                },
            },
        },
        {
            // Conditional control flow keywords
            match: /\b(?:(if)|(elif)|(else))\b/dg,
            captures: {
                1: {
                    token: KeywordTokenType.If,
                },
                2: {
                    token: KeywordTokenType.Elif,
                },
                3: {
                    token: KeywordTokenType.Else,
                },
            },
        },
        {
            // Control flow keywords
            match: /\b(?:(for)|(while)|(pass)|(return)|(menu)|(jump)|(call))\b/dg,
            captures: {
                1: {
                    token: KeywordTokenType.For,
                },
                2: {
                    token: KeywordTokenType.While,
                },
                3: {
                    token: KeywordTokenType.Pass,
                },
                4: {
                    token: KeywordTokenType.Return,
                },
                5: {
                    token: KeywordTokenType.Menu,
                },
                6: {
                    token: KeywordTokenType.Jump,
                },
                7: {
                    token: KeywordTokenType.Call,
                },
            },
        },
        {
            // [TODO: Should probably only be a keyword in the expression]Renpy sub expression keywords
            match: /\b(?:(set)|(expression)|(sound)|(at)|(with)|(from))\b/dg,
            captures: {
                1: {
                    token: KeywordTokenType.Set,
                },
                2: {
                    token: KeywordTokenType.Expression,
                },
                3: {
                    token: KeywordTokenType.Sound,
                },
                4: {
                    token: KeywordTokenType.At,
                },
                5: {
                    token: KeywordTokenType.With,
                },
                6: {
                    token: KeywordTokenType.From,
                },
                7: {
                    token: KeywordTokenType.Call,
                },
            },
        },
    ],
};

const renpyStatements: TokenPattern = {
    patterns: [label, menu, image],
};

const statements: TokenPattern = {
    patterns: [comments, strings, renpyStatements, pythonStatements],
};
const expressions: TokenPattern = {
    patterns: [keywords, unmatchedLoseChars],
};

export const basePatterns: TokenRepoPattern = {
    patterns: [statements, expressions],
};

menuOption.patterns!.push(basePatterns);
