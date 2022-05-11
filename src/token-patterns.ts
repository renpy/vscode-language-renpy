import { CharacterTokenType, ConstantToken, EntityTokenType, ExpressionToken, KeywordTokenType, MetaTokenType, OperatorTokenType, StatementToken, Token, TokenPattern } from "./token-definitions";

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
// replace with: /$1/gd

// find: (?<=(?:^ *|\{ )(?:match|begin|end): /.*?)\\\\(?=.*?/gd,?$)
// replace with: \

// Result should be manually fixed

const pythonStatements: TokenPattern = {
    patterns: [
        {
            // Renpy python block
            contentToken: MetaTokenType.PythonBlock,

            begin: /(^[ \t]+)?(?:\b(init)\b\s+(?:(-)?(\d*)\s+)?)?\b(python)\b(.*?)(:)/gd,
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
                    token: ConstantToken.Integer,
                },
                5: {
                    token: KeywordTokenType.Python,
                },
                6: {
                    token: "meta.python.block.arguments.renpy",

                    patterns: [
                        {
                            // in statement
                            match: /(?:\s*(in)\s*([a-zA-Z_]\w*)\b)/gd,
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
                            match: /\b(hide|early|in)\b/gd,
                            token: KeywordTokenType.,
                        },
                    ],
                },
                7: {
                    token: "punctuation.section.python.begin.renpy",
                },
            },
            end: /^(?!(\1[ \t]+)|($))/gd,
            patterns: [{ include: "source.python" }],
        },
        {
            // Match begin and end of python one line statements
            contentToken: "meta.embedded.line.python",
            begin: /(\$|\bdefine|\bdefault)(?=\s)/gd,
            beginCaptures: {
                1: {
                    token: KeywordTokenType.,
                },
            },
            end: /\R$/gd,

            patterns: [
                {
                    // Type the first name as a variable (Probably not needed, but python doesn't seem to catch it)
                    match: /(?<!\.)\b(\w+)(?=\s=\s)/gd,
                    token: "variable.other.python",
                },
                { include: "source.python" },
            ],
        },
    ],
};

const label: TokenPattern = {
    patterns: [
        {
            token: "meta.label.renpy",
            begin: /(^[ \t]+)?\b(label)\s+([a-zA-Z_.]\w*(?:\(.*\))?)(?=\s*)(:)/gd,
            beginCaptures: {
                1: {
                    token: "punctuation.whitespace.label.leading.renpy",
                },
                2: {
                    token: "keyword.renpy storage.type.function.renpy",
                },
                3: {
                    token: "meta.label.renpy",
                    patterns: [
                        {
                            // Function name
                            match: /([a-zA-Z_.]\w*)/gd,
                            token: "entity.name.function.renpy",
                        },
                        { include: "source.python#parameters" },
                    ],
                },
                4: {
                    token: "punctuation.section.label.begin.renpy",
                },
            },

            end: /(:|(?=[#'\"\n]))/gd,
            endCaptures: {
                1: {
                    token: "punctuation.section.label.begin.renpy",
                },
            },
        },
    ],
};

const keywords: TokenPattern = {
    patterns: [
        {
            // Python statement keywords
            match: /\b(init|python|hide|early|in|define|default)\b/gd,
            token: KeywordTokenType.,
        },
        {
            // Renpy keywords
            match: /\b(label|play|pause|screen|scene|show|image|transform)\b/gd,
            token: "keyword.other.renpy",
        },
        {
            // Conditional control flow keywords
            match: /\b(if|elif|else)\b/gd,
            token: "keyword.control.conditional.renpy",
        },
        {
            // Control flow keywords
            match: /\b(for|while|pass|return|menu|jump|call)\b/gd,
            token: "keyword.control.renpy",
        },
        {
            // [TODO: Should probably only be a keyword in the expression]Renpy sub expression keywords
            match: /\b(set|expression|sound|at|with|from)\b/gd,
            token: "keyword.other.renpy",
        },
    ],
};

const codeTags: TokenPattern = {
    match: /(?:\b(NOTE|XXX|HACK|FIXME|BUG|TODO)\b)/gd,
    captures: { 1: { token: "keyword.codetag.notation.renpy" } },
};

const comments: TokenPattern = {
    token: "comment.line.number-sign.renpy",
    begin: /(\#)/gd,
    beginCaptures: {
        1: { token: "punctuation.definition.comment.renpy" },
    },
    end: /($)/gd,
    patterns: [{ include: codeTags }],
};

const escapedChar: TokenPattern = {
    match: /(\\\")|(\\')|(\\ )|(\\n)|(\\\\)|(?|(\[\[)|({{))/gd,
    captures: {
        1: {
            token: "constant.character.escape.double-quote.python.renpy",
        },
        2: {
            token: "constant.character.escape.single-quote.python.renpy",
        },
        3: {
            token: "constant.character.escape.space.python.renpy",
        },
        4: {
            token: "constant.character.escape.newline.python.renpy",
        },
        5: {
            token: "constant.character.escape.backslash.python.renpy",
        },
        6: {
            token: "constant.character.escape.placeholder.python.renpy",
        },
    },
};

const constantPlaceholder: TokenPattern = {
    patterns: [
        { include: stringTags },
        {
            // Python value interpolation using [ ... ]
            token: "meta.brackets.renpy constant.other.placeholder.tags.renpy",
            match: /(\[)((?:.*\[.*?\])*.*?)(\])/gd,
            captures: {
                1: { token: "constant.character.format.placeholder.other.renpy" },
                2: { token: "meta.embedded.line.python source.python" },
                3: { token: "constant.character.format.placeholder.other.renpy" },
            },
        },
    ],
};

const hexLiteral: TokenPattern = {
    // Note: This pattern has no end check. Only use as include pattern!
    patterns: [
        {
            // rgb, rgba, rrggbb, rrggbbaa
            match: /(?i)#(?:[a-f0-9]{8}|[a-f0-9]{6}|[a-f0-9]{3,4})\b/gd,
            token: "support.constant.color.renpy",
        },
        {
            match: /(?i)#[a-f0-9]+\b/gd,
            token: "invalid.illegal.unexpected-number-of-hex-values.renpy",
        },
        {
            match: /(?i)(?:#[a-f0-9]*)?(.+)/gd,
            token: "support.constant.color.renpy",
            captures: {
                1: { token: "invalid.illegal.character-not-allowed-here.renpy" },
            },
        },
    ],
};

const stringsInterior: TokenPattern = {
    patterns: [{ include: escapedChar }, { include: constantPlaceholder }],
};

const stringTags: TokenPattern = {
    patterns: [
        {
            // Valid tags without params (self-closing)
            match: /({)\s*(nw|done|fast|p|w|clear)\s*(})/gd,
            captures: {
                0: { token: "meta.tag.$2.self-closing.renpy" },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: "meta.tag.$2.self-closing.renpy",
            match: /({)\s*(p|w)(=)(\+?)(\d+(?:.\d+)?)\s*(})/gd,
            captures: {
                0: { token: "meta.tag.$2.self-closing.renpy" },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: { token: "keyword.operator.arithmetic.renpy" },
                5: { token: "support.constant.property-value constant.numeric.float.renpy" },
                6: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Valid tags with numeric params (self-closing)
            token: "meta.tag.$2.self-closing.renpy",
            match: /({)\s*(v?space)(=)(\+?)(\d+)\s*(})/gd,
            captures: {
                0: { token: MetaTokenType.Tag },
                1: { token: CharacterTokenType.OpenBracket },
                2: { token: EntityTokenType.Tag },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Plus },
                5: { token: ConstantToken.Integer },
                6: { token: CharacterTokenType.CloseBracket },
            },
        },
        {
            // Hashtag tag (self-closing)
            token: "meta.tag.$2.self-closing.renpy",
            match: /({)\s*(#)\s*(.*?)\s*(})/gd,
            captures: {
                0: { token: "meta.tag.$2.self-closing.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: { token: "support.constant.property-value string.unquoted.renpy" },
                5: { token: "punctuation.definition.tag.end.renpy" },
            },
        },
        {
            // Valid tags with file param
            token: "meta.tag.$2.self-closing.renpy",
            match: /({)\s*(font|image)(=)([\w.]+)\s*(})/gd,
            captures: {
                0: { token: "meta.tag.$2.self-closing.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: { token: "support.constant.property-value string.unquoted.renpy" },
                5: { token: "punctuation.definition.tag.end.renpy" },
            },
        },
        {
            // Valid tags without params (close required)
            contentToken: "renpy.meta.$2",
            begin: /({)\s*(u|i|b|s|plain|alt|noalt|art|rb|rt)\s*(})/gd,
            beginCaptures: {
                0: { token: "meta.tag.$2.start.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.definition.tag.end.renpy" },
            },
            end: /({/)\s*(\2)\s*(})/gd,
            endCaptures: {
                0: { token: "meta.tag.$2.end.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.definition.tag.end.renpy" },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Valid tags with numeric params (close required)
            contentToken: "renpy.meta.$2",
            begin: /({)\s*(alpha|cps|k)(=)([*\-+]?)(\d+(?:.\d+)?)\s*(})/gd,
            beginCaptures: {
                0: { token: "meta.tag.$2.start.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: { token: "keyword.operator.arithmetic.renpy" },
                5: { token: "support.constant.property-value constant.numeric.renpy" },
                6: { token: "punctuation.definition.tag.end.renpy" },
            },
            end: /({/)\s*(\2)\s*(})/gd,
            endCaptures: {
                0: {
                    token: "meta.tag.$2.end.renpy",
                },
                1: {
                    token: "punctuation.definition.tag.begin.renpy",
                },
                2: {
                    token: "entity.name.tag.$2.renpy",
                },
                3: {
                    token: "punctuation.definition.tag.end.renpy",
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Valid tags with numeric params (close required)
            contentToken: "renpy.meta.$2",
            begin: /({)\s*(size)(=)([\-+]?)(\d+)\s*(})/gd,
            beginCaptures: {
                0: { token: "meta.tag.$2.start.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: { token: "keyword.operator.arithmetic.renpy" },
                5: { token: "support.constant.property-value constant.numeric.integer.renpy" },
                6: { token: "punctuation.definition.tag.end.renpy" },
            },
            end: /({/)\s*(\2)\s*(})/gd,
            endCaptures: {
                0: {
                    token: "meta.tag.$2.end.renpy",
                },
                1: {
                    token: "punctuation.definition.tag.begin.renpy",
                },
                2: {
                    token: "entity.name.tag.$2.renpy",
                },
                3: {
                    token: "punctuation.definition.tag.end.renpy",
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Color tag
            contentToken: "renpy.meta.$2.$4",
            begin: /({)\s*(color|outlinecolor)(=)(#?[a-zA-Z0-9]+)\s*(})/gd,
            beginCaptures: {
                0: { token: "meta.tag.$2.start.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: {
                    token: "support.constant.property-value",
                    patterns: [{ include: hexLiteral }],
                },
                5: { token: "punctuation.definition.tag.end.renpy" },
            },
            end: /({/)\s*(\2)\s*(})/gd,
            endCaptures: {
                0: {
                    token: "meta.tag.$2.end.renpy",
                },
                1: {
                    token: "punctuation.definition.tag.begin.renpy",
                },
                2: {
                    token: "entity.name.tag.$2.renpy",
                },
                3: {
                    token: "punctuation.definition.tag.end.renpy",
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // a tag
            contentToken: "renpy.meta.$2",
            begin: /({)\s*(a)(=)(.*?)\s*(})/gd,
            beginCaptures: {
                0: { token: "meta.tag.$2.start.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: {
                    token: "support.constant.property-value string.unquoted.renpy",
                    patterns: [],
                },
                5: { token: "punctuation.definition.tag.end.renpy" },
            },
            end: /({/)\s*(\2)\s*(})/gd,
            endCaptures: {
                0: {
                    token: "meta.tag.$2.end.renpy",
                },
                1: {
                    token: "punctuation.definition.tag.begin.renpy",
                },
                2: {
                    token: "entity.name.tag.$2.renpy",
                },
                3: {
                    token: "punctuation.definition.tag.end.renpy",
                },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Unknown tag (Single line support only cus \\R does not work) (Since we don't know if a tag is self closing, we can't assume that an end pattern exists)
            match: /({)\s*(\w+)\b(?:(=)(.*?))?\s*(})((?:.|\R)+?)\s*({/)\s*(\2)\s*(})/gd,
            captures: {
                1: { token: "meta.tag.$2.start.renpy punctuation.definition.tag.begin.renpy" },
                2: { token: "renpy.meta.u meta.tag.$2.start.renpy entity.name.tag.$2.renpy" },
                3: { token: "meta.tag.$2.start.renpy punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: { token: "meta.tag.$2.start.renpy constant.other.placeholder.tags.renpy" },
                5: { token: "meta.tag.$2.start.renpy punctuation.definition.tag.end.renpy" },
                6: {
                    token: "renpy.meta.tag.custom.$2",
                    patterns: [{ include: stringsInterior }],
                },
                7: { token: "meta.tag.$2.end.renpy punctuation.definition.tag.begin.renpy" },
                8: { token: "renpy.meta.u meta.tag.$2.end.renpy entity.name.tag.$2.renpy" },
                9: { token: "meta.tag.$2.end.renpy punctuation.definition.tag.end.renpy" },
            },
        },
        {
            // Unknown tag start
            match: /({)\s*(\w*)(?:(=)(.*?))?\s*(})/gd,
            captures: {
                0: { token: "meta.tag.$2.start.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "renpy.meta.u entity.name.tag.$2.renpy" },
                3: { token: "punctuation.separator.key-value.renpy keyword.operator.assignment.renpy" },
                4: {
                    token: "support.constant.property-value constant.other.placeholder.tags.renpy",
                    patterns: [],
                },
                5: { token: "punctuation.definition.tag.end.renpy" },
            },
        },
        {
            // Unknown tag end
            match: /({/)\s*(\w*?)\b\s*(})/gd,
            captures: {
                0: { token: "meta.tag.$2.end.renpy" },
                1: { token: "punctuation.definition.tag.begin.renpy" },
                2: { token: "renpy.meta.u entity.name.tag.$2.renpy" },
                3: { token: "punctuation.definition.tag.end.renpy" },
            },
        },
    ],
};

const stringQuotedDouble: TokenPattern = {
    patterns: [
        {
            // Triple quoted block string
            token: "string.quoted.triple.block.renpy",
            begin: '(""")',
            beginCaptures: {
                0: { token: "punctuation.definition.string.begin.renpy" },
            },
            end: '(?<!\\\\)((?<=""")(")""|""")',
            endCaptures: {
                1: { token: "punctuation.definition.string.end.renpy" },
                2: { token: "meta.empty-string.triple.block.renpy" },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Double quoted single line string
            token: "string.quoted.double.line.renpy",
            begin: '(")',
            beginCaptures: {
                1: { token: "punctuation.definition.string.begin.renpy" },
            },
            end: '(?<!\\\\)((?<=")(")|")',
            endCaptures: {
                1: { token: "punctuation.definition.string.end.renpy" },
                2: { token: "meta.empty-string.double.renpy" },
                3: { token: "invalid.illegal.unclosed-string.renpy" },
            },
            patterns: [{ include: stringsInterior }],
        },
    ],
};

const stringQuotedSingle: TokenPattern = {
    patterns: [
        {
            // Single quoted block string
            token: "string.quoted.single.block.renpy",
            begin: /(''')/gd,
            beginCaptures: {
                0: { token: "punctuation.definition.string.begin.renpy" },
            },
            end: /(?<!\\)((?<=''')('|''')|''')/gd,
            endCaptures: {
                1: { token: "punctuation.definition.string.end.renpy" },
                2: { token: "meta.empty-string.single.block.renpy" },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Single quoted single line string
            token: "string.quoted.single.line.renpy",
            begin: /(')/gd,
            beginCaptures: {
                1: { token: "punctuation.definition.string.begin.renpy" },
            },
            end: /(?<!\\)((?<=')(')|')/gd,
            endCaptures: {
                1: { token: "punctuation.definition.string.end.renpy" },
                2: { token: "meta.empty-string.single.renpy" },
                3: { token: "invalid.illegal.unclosed-string.renpy" },
            },
            patterns: [{ include: stringsInterior }],
        },
    ],
};

const stringQuotedBack: TokenPattern = {
    patterns: [
        {
            // Back quoted block string
            token: "string.quoted.back.block.renpy",
            begin: /(```)/gd,
            beginCaptures: {
                0: { token: "punctuation.definition.string.begin.renpy" },
            },
            end: /(?<!\\)((?<=```)(`)``|```)/gd,
            endCaptures: {
                1: { token: "punctuation.definition.string.end.renpy" },
                2: { token: "meta.empty-string.back.block.renpy" },
            },
            patterns: [{ include: stringsInterior }],
        },
        {
            // Back quoted single line string
            token: "string.quoted.back.line.renpy",
            begin: /(`)/gd,
            beginCaptures: {
                1: { token: "punctuation.definition.string.begin.renpy" },
            },
            end: /(?<!\\)((?<=`)(`)|`)/gd,
            endCaptures: {
                1: { token: "punctuation.definition.string.end.renpy" },
                2: { token: "meta.empty-string.back.renpy" },
                3: { token: "invalid.illegal.unclosed-string.renpy" },
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
    patterns: [{ include: comments }, { include: renpyStatements }, { include: pythonStatements }, { include: keywords }],
};
const expressions: TokenPattern = {
    patterns: [{ include: strings }],
};

export const basePatterns: TokenPattern = {
    patterns: [{ include: statements }, { include: expressions }],
};
