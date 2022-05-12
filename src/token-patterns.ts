import { CharacterTokenType, ConstantTokenType, EntityTokenType, EscapedCharacterTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType, TokenPattern } from "./token-definitions";

// These patterns are converted from the tmLanguage file.
// Copy the patterns (the contents of the repository group) over and apply the following find and replace patterns:

// find: ^( +)"(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?": \{$\n((?:^.*$\n)+?)^\1\},?
// replace with: const \L$2\u$3\u$4\u$5: TokenPattern = {\n$6};

// find: "include": "#?(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?"
// replace with: include: \L$1\u$2\u$3\u$4

// find: (?<=^ *|\{ )"comment": "(.*?)",?$
// replace with: // $1

// find: (?<=^ *|\{ )"name": "(.*?)"(?=: [{["])
// replace with: token: "$1"

// find: (?<=^ *|\{ )"contentName": "(.*?)"(?=: [{["])
// replace with: contentToken: "$1"

// find: (?<=^ *|\{ )"(.*?)"(?=: [{["])
// replace with: $1

// find: (?<=(?:^ *|\{ )(?:match|begin|end): )"(.*?)"(?=,?$)
// replace with: /$1/dg

// find: (?<=(?:^ *|\{ )(?:match|begin|end): /.*?)\\\\(?=.*?/dg,?$)
// replace with: \

// Result should be manually fixed

const pythonParameters: TokenPattern = { patterns: [] };

const pythonSource: TokenPattern = { patterns: [] };

const pythonStatements: TokenPattern = {
    patterns: [
        {
            // Renpy python block
            contentToken: MetaTokenType.PythonBlock,

            begin: /(^[ \t]+)?(?:\b(init)\b\s+(?:(-)?(\d*)\s+)?)?\b(python)\b(.*?)(:)/dg,
            beginCaptures: {
                1: {
                    token: CharacterTokenType.WhiteSpace,
                },
                2: {
                    token: KeywordTokenType.Init,
                },
                3: {
                    token: OperatorTokenType.Plus,
                },
                4: {
                    token: ConstantTokenType.Integer,
                },
                5: {
                    token: KeywordTokenType.Python,
                },
                6: {
                    token: MetaTokenType.Arguments,

                    patterns: [
                        {
                            // in statement
                            match: /(?:\s*(in)\s*([a-zA-Z_]\w*)\b)/dg,
                            captures: {
                                1: {
                                    token: KeywordTokenType.In,
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
                                    token: KeywordTokenType.In,
                                },
                            },
                        },
                    ],
                },
                7: {
                    token: CharacterTokenType.Colon,
                },
            },
            end: /^(?!(\1[ \t]+)|($))/dg,
            patterns: [{ include: pythonSource }],
        },
        {
            // Match begin and end of python one line statements
            contentToken: MetaTokenType.PythonLine,
            begin: /(\$)|\b(define)|\b(default)(?=\s)/dg,
            beginCaptures: {
                1: {
                    token: KeywordTokenType.DollarSign,
                },
                2: {
                    token: KeywordTokenType.Define,
                },
                3: {
                    token: KeywordTokenType.Default,
                },
            },
            end: /\R$/dg,

            patterns: [
                {
                    // Type the first name as a variable (Probably not needed, but python doesn't seem to catch it)
                    match: /(?<!\.)\b(\w+)(?=\s=\s)/dg,
                    token: EntityTokenType.Variable,
                },
                { include: pythonSource },
            ],
        },
    ],
};

const label: TokenPattern = {
    patterns: [
        {
            token: MetaTokenType.Block,
            begin: /(^[ \t]+)?\b(label)\s+([a-zA-Z_.]\w*(?:\(.*\))?)(?=\s*)(:)/dg,
            beginCaptures: {
                1: {
                    token: CharacterTokenType.WhiteSpace,
                },
                2: {
                    token: KeywordTokenType.Label,
                },
                3: {
                    patterns: [
                        {
                            // Function name
                            match: /([a-zA-Z_.]\w*)/dg,
                            token: EntityTokenType.Function,
                        },
                        { include: pythonParameters },
                    ],
                },
                4: {
                    token: CharacterTokenType.Colon,
                },
            },

            end: /(:|(?=[#'\"\n]))/dg,
            endCaptures: {
                1: {
                    token: CharacterTokenType.Colon,
                },
            },
        },
    ],
};

const keywords: TokenPattern = {
    patterns: [
        {
            // Python statement keywords
            match: /\b(init)|(python)|(hide)|(early)|(in)|(define)|(default)\b/dg,
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
                    token: KeywordTokenType.In,
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
            match: /\b(label)|(play)|(pause)|(screen)|(scene)|(show)|(image)|(transform)\b/dg,
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
            match: /\b(if)|(elif)|(else)\b/dg,
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
            match: /\b(for)|(while)|(pass)|(return)|(menu)|(jump)|(call)\b/dg,
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
            match: /\b(set)|(expression)|(sound)|(at)|(with)|(from)\b/dg,
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

const codeTags: TokenPattern = {
    match: /(?:\b(NOTE|XXX|HACK|FIXME|BUG|TODO)\b)/dg,
    captures: { 1: { token: MetaTokenType.CommentCodeTag } },
};

const comments: TokenPattern = {
    token: MetaTokenType.Comment,
    begin: /(\#)(.*)$/dg,
    beginCaptures: {
        1: { token: CharacterTokenType.Hashtag },
    },
    end: /($)/dg,
    patterns: [{ include: codeTags }],
};

const escapedChar: TokenPattern = {
    match: /(\\\")|(\\')|(\\ )|(\\n)|(\\\\)|(\[\[)|({{)/dg,
    captures: {
        1: {
            token: EscapedCharacterTokenType.Escaped_DoubleQuote,
        },
        2: {
            token: EscapedCharacterTokenType.Escaped_Quote,
        },
        3: {
            token: EscapedCharacterTokenType.Escaped_Whitespace,
        },
        4: {
            token: EscapedCharacterTokenType.Escaped_Newline,
        },
        5: {
            token: EscapedCharacterTokenType.Escaped_Backslash,
        },
        6: {
            token: EscapedCharacterTokenType.Escaped_OpenBracket,
        },
        7: {
            token: EscapedCharacterTokenType.Escaped_OpenSquareBracket,
        },
    },
};

const hexLiteral: TokenPattern = {
    // Note: This pattern has no end check. Only use as include pattern!
    patterns: [
        {
            // rgb, rgba, rrggbb, rrggbbaa
            match: /#(?:[a-f0-9]{8}|[a-f0-9]{6}|[a-f0-9]{3,4})\b/dgi,
            token: ConstantTokenType.Color,
        },
        {
            match: /#[a-f0-9]+\b/dgi,
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
    patterns: [{ include: escapedChar }, { include: constantPlaceholder }], // { include: stringTags } (Recursive pattern. See below)
};

const stringTags: TokenPattern = {
    patterns: [
        {
            // Valid tags without params (self-closing)
            match: /({)\s*(nw|done|fast|p|w|clear)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: MetaTokenType.Tag,
            match: /({)\s*(p|w)(=)(\+?)(\d+(?:.\d+)?)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
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
            token: MetaTokenType.Tag,
            match: /({)\s*(v?space)(=)(\+?)(\d+)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
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
            token: MetaTokenType.Tag,
            match: /({)\s*(#)\s*(.*?)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: ConstantTokenType.UnquotedString },
                5: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with file param
            token: MetaTokenType.Tag,
            match: /({)\s*(font|image)(=)([\w.]+)\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
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
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Valid tags with numeric params (close required)
            begin: /({)\s*(alpha|cps|k)(=)(?:(\*)|(\-)|(\+))?(\d+(?:.\d+)?)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Multiply },
                5: { token: OperatorTokenType.Minus },
                6: { token: OperatorTokenType.Plus },
                7: { token: ConstantTokenType.Float },
                8: { token: CharacterTokenType.CloseBracket },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: {
                    token: MetaTokenType.Tag,
                },
                1: {
                    token: CharacterTokenType.OpenBracket,
                },
                2: {
                    token: EntityTokenType.Tag,
                },
                3: {
                    token: CharacterTokenType.CloseBracket,
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Valid tags with numeric params (close required)
            begin: /({)\s*(size)(=)(?:(\-)|(\+))?(\d+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Minus },
                5: { token: OperatorTokenType.Plus },
                6: { token: ConstantTokenType.Integer },
                7: { token: CharacterTokenType.CloseBracket },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: {
                    token: MetaTokenType.Tag,
                },
                1: {
                    token: CharacterTokenType.OpenBracket,
                },
                2: {
                    token: EntityTokenType.Tag,
                },
                3: {
                    token: CharacterTokenType.CloseBracket,
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Color tag
            begin: /({)\s*(color|outlinecolor)(=)(#?[a-zA-Z0-9]+)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: {
                    patterns: [{ include: hexLiteral }],
                },
                5: { token: CharacterTokenType.CloseBracket },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: {
                    token: MetaTokenType.Tag,
                },
                1: {
                    token: CharacterTokenType.OpenBracket,
                },
                2: {
                    token: EntityTokenType.Tag,
                },
                3: {
                    token: CharacterTokenType.CloseBracket,
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // a tag
            begin: /({)\s*(a)(=)(.*?)\s*(})/dg,
            beginCaptures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: {
                    token: ConstantTokenType.UnquotedString,
                    patterns: [],
                },
                5: { token: CharacterTokenType.CloseBracket },
            },
            end: /({\/)\s*(\2)\s*(})/dg,
            endCaptures: {
                0: {
                    token: MetaTokenType.Tag,
                },
                1: {
                    token: CharacterTokenType.OpenBracket,
                },
                2: {
                    token: EntityTokenType.Tag,
                },
                3: {
                    token: CharacterTokenType.CloseBracket,
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Unknown tag (Single line support only cus \\R does not work) (Since we don't know if a tag is self closing, we can't assume that an end pattern exists)
            match: /({)\s*(\w+)\b(?:(=)(.*?))?\s*(})((?:.|\R)+?)\s*({\/)\s*(\2)\s*(})/dg,
            captures: {
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: MetaTokenType.Arguments },
                5: { token: CharacterTokenType.CloseBracket },
                6: {
                    token: MetaTokenType.Tag,
                    patterns: [{ include: stringsInterior }],
                },
                7: { token: CharacterTokenType.OpenBracket },
                8: { token: EntityTokenType.Tag },
                9: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Unknown tag start
            match: /({)\s*(\w*)(?:(=)(.*?))?\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: {
                    token: MetaTokenType.Arguments,
                    patterns: [],
                },
                5: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Unknown tag end
            match: /({\/)\s*(\w*?)\b\s*(})/dg,
            captures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: CharacterTokenType.CloseBracket },
            },
        },
    ],
};

stringsInterior.patterns!.push({ include: stringTags });

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
            patterns: [{ include: stringsInterior }],
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
            patterns: [{ include: stringsInterior }],
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
            patterns: [{ include: stringsInterior }],
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
            patterns: [{ include: stringsInterior }],
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
            patterns: [{ include: stringsInterior }],
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
            patterns: [{ include: stringsInterior }],
        },
    ],
};

const strings: TokenPattern = {
    patterns: [{ include: stringQuotedDouble }, { include: stringQuotedSingle }, { include: stringQuotedBack }],
};

const renpyStatements: TokenPattern = {
    patterns: [{ include: label }],
};

const statements: TokenPattern = {
    patterns: [{ include: strings }, { include: comments }, { include: renpyStatements }, { include: pythonStatements }],
};
const expressions: TokenPattern = {
    patterns: [{ include: keywords }],
};

export const basePatterns: TokenPattern = {
    patterns: [{ include: statements }, { include: expressions }],
};
