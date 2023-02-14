/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-useless-backreference */

import { CharacterTokenType, LiteralTokenType, EntityTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { comments, expressions, newLine, statements, charactersPatten, whiteSpace, numFloat, numInt, invalidToken, strings, stringsInterior } from "./common-token-patterns";
import { atl } from "./atl-token-patterns";
import { pythonBuiltinPossibleCallables, pythonExpression, pythonExpressionBare, pythonFunctionArguments, pythonNumber, pythonSpecialVariables } from "./python-token-patterns";
import { TokenPattern } from "./token-pattern-types";
// NOTE: These patterns are converted from the tmLanguage file.
// ANY CHANGES MADE HERE SHOULD BE PORTED TO THAT FILE AS WELL
// Copy the patterns (the contents of the repository group) over and apply the following find and replace patterns:

// find: ^( +)"(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?": \{$\n((?:^.*$\n)+?)^\1\},?
// replace with: const \L$2\u$3\u$4\u$5: TokenPattern = {\n$6};

// find: \{ "include": "#?(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?" \}
// find: \{ "include": "([\w\.]+)#?(\w+?)(?:[\-_](\w+?))?(?:[\-_](\w+?))?(?:[\-_](\w+?))?" \}
// replace with: \L$1\u$2\u$3\u$4

// find: (?<=^ *|\{ )"comment": "(.*?)"(?=,$| \}),?
// replace with: // $1

// find: (?<=^ *|\{ )"name": "(.*?)"(?=,$| \})
// replace with: token: "$1"

// find: (?<=^ *|\{ )"contentName": "(.*?)"(?=,$| \})
// replace with: contentToken: "$1"

// find: (?<=^ *|\{ )"(.*?)"(?=: [{["])
// replace with: $1

// find: (?<=(?:^ *|\{ )(?:match|begin|end): /.*?)\\\\(?=.*?/dg,?$)
// replace with: \

// find: (?<=(?:^ *|\{ )(?:match|begin|end): )"(.*?)"(?=,?$)
// replace with: /$1/dg

// Result should be manually fixed
// Make sure to include this in internal captures to detect all newline tokens

const lineContinuationPattern = /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])|\Z/gm;

export const basePatterns: TokenPattern = {
    debugName: "basePatterns",

    patterns: [statements, expressions],
};

const literal: TokenPattern = {
    debugName: "literal",

    patterns: [
        {
            // Python literals,
            token: LiteralTokenType.Boolean,
            match: /\b(?<!\.)(True|False|None)\b/g,
        },
    ],
};

const pythonParameters: TokenPattern = {
    debugName: "pythonParameters",

    patterns: [whiteSpace],
};

const pythonSource: TokenPattern = {
    debugName: "pythonSource",

    patterns: [comments, strings, whiteSpace, newLine],
};

const pythonStatements: TokenPattern = {
    debugName: "pythonStatements",

    patterns: [
        {
            match: /^[ \t]*(init)[ \t]+(offset)[ \t]*(=)[ \t]*(-)?([^#]*?)$/dgm,
            captures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Init },
                2: { token: KeywordTokenType.Offset },
                3: { token: OperatorTokenType.Assign },
                4: { token: OperatorTokenType.Minus },
                5: {
                    patterns: [numInt, invalidToken],
                },
            },
        },
        {
            // Renpy python block
            token: MetaTokenType.CodeBlock,
            contentToken: MetaTokenType.PythonBlock,

            begin: /^([ \t]+)?(?:(init)(?:[ \t]+(-)?(\d+))?[ \t]+)?(python)[ \t]*(.*)?(:)/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: {}, // required for end match, but is already named by capture[0]
                2: { token: KeywordTokenType.Init },
                3: { token: OperatorTokenType.Minus },
                4: { token: LiteralTokenType.Integer },
                5: { token: KeywordTokenType.Python },
                6: {
                    token: MetaTokenType.Arguments,
                    patterns: [
                        {
                            // in statement
                            match: /(?:\s*(in)\s*([a-zA-Z_]\w*)\b)/dg,
                            captures: {
                                1: { token: OperatorTokenType.In },
                                2: { token: EntityTokenType.Namespace },
                            },
                        },
                        {
                            // keywords
                            match: /\b(hide)|(early)|(in)\b/dg,
                            captures: {
                                1: { token: KeywordTokenType.Hide },
                                2: { token: KeywordTokenType.Early },
                                3: { token: OperatorTokenType.In },
                            },
                        },
                    ],
                },
                7: { token: CharacterTokenType.Colon },
            },
            end: lineContinuationPattern,
            patterns: [pythonSource],
        },
        {
            // Match begin and end of python one line statements
            contentToken: MetaTokenType.PythonLine,
            begin: /^[ \t]*(?:(\$)|(define)|(default))(?=[ \t])/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.DollarSign },
                2: { token: KeywordTokenType.Define },
                3: { token: KeywordTokenType.Default },
            },
            end: /$/gm,
            patterns: [
                {
                    // Type the first name as a variable (Probably not needed, but python doesn't seem to catch it)
                    match: /(?<!\.)\b([a-zA-Z_]\w*)(?=\s=\s)/g,
                    token: EntityTokenType.VariableName,
                },
                pythonExpression,
            ],
        },
    ],
};

const sayStatements: TokenPattern = {
    debugName: "sayStatements",

    patterns: [
        {
            token: MetaTokenType.SayStatement,
            contentToken: LiteralTokenType.String,
            begin: /(?<=^[ \t]+)(?:([a-zA-Z_]\w*)\b|"([a-zA-Z_]\w*)\b")((?:[ \t]+(?:@|\w+))*)?[ \t]*("""|"|'''|'|```|`)/dgm,
            beginCaptures: {
                1: {
                    token: EntityTokenType.VariableName,
                    patterns: [
                        {
                            match: /extend/g,
                            token: KeywordTokenType.Extend,
                        },
                        {
                            match: /voice/g,
                            token: KeywordTokenType.Voice,
                        },
                        {
                            // Match special characters,
                            match: /adv|nvl|narrator|name_only|centered|vcentered/g,
                            token: EntityTokenType.VariableName,
                        },
                        invalidToken,
                    ],
                },
                2: {
                    token: MetaTokenType.CharacterNameString,
                },
                3: {
                    token: MetaTokenType.Arguments,
                    patterns: [
                        {
                            token: KeywordTokenType.At,
                            match: /@/g,
                        },
                    ],
                },
                4: { token: CharacterTokenType.Quote },
            },
            end: /(?<!\\)(((?<=\4)\4)|\4)[ \t]*(\(.*?\)(?![^\(]*?\)))?/dg,
            endCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: CharacterTokenType.Quote },
                2: { token: MetaTokenType.EmptyString },
                3: { patterns: [pythonFunctionArguments] },
            },
            patterns: [stringsInterior],
        },
        {
            begin: /(?<=^[ \t]+)(?=["'`])/gm,
            end: /(?<!\\)(?<=["'`])[ \t]*(\(.*?\)(?![^\(]*?\)))?/dg,
            endCaptures: {
                0: { patterns: [whiteSpace] },
                1: { patterns: [pythonFunctionArguments] },
            },
            patterns: [
                {
                    token: LiteralTokenType.String,
                    contentToken: MetaTokenType.NarratorSayStatement,
                    begin: /"""|"|'''|'|```|`/dg,
                    beginCaptures: {
                        0: { token: CharacterTokenType.Quote },
                    },
                    end: /(?<!\\)(((?<=\0)\0)|\0)/dg,
                    endCaptures: {
                        1: { token: CharacterTokenType.Quote },
                        2: { token: MetaTokenType.EmptyString },
                    },
                    patterns: [stringsInterior],
                },
            ],
        },
    ],
};

const menuOption: TokenPattern = {
    debugName: "menuOption",

    contentToken: MetaTokenType.MenuOptionBlock,
    begin: /^([ \t]+)((?:".*")|(?:'.*')|(?:""".*"""))[ \t]*(.+)?(:)/dgm,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: {}, // required for end match, but is already named by capture[0]
        2: {
            token: MetaTokenType.MenuOption,
            patterns: [strings],
        },
        3: {
            token: MetaTokenType.PythonLine,
            patterns: [
                pythonFunctionArguments,
                {
                    // if condition
                    match: /\b(if)[ \t]+(.+)?/dg,
                    captures: {
                        1: { token: KeywordTokenType.If },
                        2: {
                            patterns: [pythonExpressionBare],
                        },
                    },
                },
                {
                    match: /[^ \t]+/g,
                    token: MetaTokenType.Invalid,
                },
            ],
        },
        4: { token: CharacterTokenType.Colon },
    },
    end: lineContinuationPattern,
    patterns: [basePatterns],
};
const menuSet: TokenPattern = {
    debugName: "menuSet",

    match: /^[ \t]+(set)[ \t]+(.+)?/dgm,
    captures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Set },
        2: {
            // set arguments
            token: MetaTokenType.PythonLine,
            patterns: [pythonExpressionBare],
        },
    },
};
const menu: TokenPattern = {
    debugName: "menu",

    token: MetaTokenType.MenuStatement,
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
                    // Menu name
                    match: /[a-zA-Z_.]\w*/g,
                    token: EntityTokenType.FunctionName,
                },
                pythonFunctionArguments,
            ],
        },
        4: { token: CharacterTokenType.Colon },
    },
    end: lineContinuationPattern,
    patterns: [comments, menuOption, sayStatements, menuSet, charactersPatten],
};

const keywords: TokenPattern = {
    debugName: "keywords",

    patterns: [
        {
            // Control flow keywords
            match: /\b(?<!\.)(?:(pass)|(return))\b/dg,
            captures: {
                1: { token: KeywordTokenType.Pass },
                2: { token: KeywordTokenType.Return },
            },
        },
        {
            // Control flow keywords with block
            begin: /\b(?<!\.)(?:(if)|(elif)|(else)|(for)|(while))\b/dg,
            contentToken: MetaTokenType.PythonLine,
            beginCaptures: {
                1: { token: KeywordTokenType.If },
                2: { token: KeywordTokenType.Elif },
                3: { token: KeywordTokenType.Else },
                4: { token: KeywordTokenType.For },
                5: { token: KeywordTokenType.While },
            },
            end: /:/dg,
            endCaptures: {
                0: { token: CharacterTokenType.Colon },
            },
            patterns: [expressions, pythonExpression],
        },
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
            match: /\b(?:(camera)|(image)|(label)|(layeredimage)|(menu)|(nvl[ \\t]+clear)|(play)|(queue)|(scene)|(screen)|(show)|(transform)|(translate)|(voice(?:[ \\t]+sustain)?)|(window)|(frame))\b/dg,
            captures: {
                1: { token: KeywordTokenType.Camera },
                2: { token: KeywordTokenType.Image },
                3: { token: KeywordTokenType.Label },
                4: { token: KeywordTokenType.LayeredImage },
                5: { token: KeywordTokenType.Menu },
                6: { token: KeywordTokenType.NVLClear },
                7: { token: KeywordTokenType.Play },
                8: { token: KeywordTokenType.Queue },
                9: { token: KeywordTokenType.Scene },
                10: { token: KeywordTokenType.Screen },
                11: { token: KeywordTokenType.Show },
                12: { token: KeywordTokenType.Transform },
                13: { token: KeywordTokenType.Translate },
                14: { token: KeywordTokenType.Voice },
                15: { token: KeywordTokenType.Window },
                16: { token: KeywordTokenType.Frame },
            },
        },
        {
            match: /^[ \t]+(pause)\b[ \t]*([^#]*?)$/dgm,
            captures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Pause },
                2: {
                    patterns: [numFloat, numInt, invalidToken],
                },
            },
        },
        {
            // [TODO: Should probably only be a keyword in the expression]Renpy sub expression keywords
            match: /\b(?:(set)|(expression)|(at)|(with)|(from))\b/dg,
            captures: {
                1: {
                    token: KeywordTokenType.Set,
                },
                2: {
                    token: KeywordTokenType.Expression,
                },
                3: {
                    token: KeywordTokenType.At,
                },
                4: {
                    token: KeywordTokenType.With,
                },
                5: {
                    token: KeywordTokenType.From,
                },
            },
        },
    ],
};

const transform: TokenPattern = {
    debugName: "transform",

    begin: /^([ \t]+)?(transform)\b[ \t]*(.*)?(:)/dgm,
    beginCaptures: {
        1: { token: CharacterTokenType.WhiteSpace },
        2: { token: KeywordTokenType.Transform },
        3: {
            patterns: [
                {
                    token: EntityTokenType.VariableName,
                    match: /\b([[:alpha:]_]\w*)\b/g,
                },
            ],
        },
        4: { token: CharacterTokenType.Colon },
    },
    end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
    patterns: [atl],
};

const withStatement: TokenPattern = {
    debugName: "withStatement",

    token: MetaTokenType.CodeBlock,
    match: /\b(with)\b[ \t]*(.+)?/dg,
    captures: {
        1: { token: KeywordTokenType.With },
        2: {
            token: MetaTokenType.Arguments,
            patterns: [expressions],
        },
    },
};
const at: TokenPattern = {
    debugName: "at",

    token: MetaTokenType.CodeBlock,
    match: /\b(at)\b[ \t]*(.+)?/dg,
    captures: {
        1: { token: KeywordTokenType.At },
        2: {
            token: MetaTokenType.Arguments,
            patterns: [statements],
        },
    },
};
const as: TokenPattern = {
    debugName: "as",

    token: MetaTokenType.CodeBlock,
    match: /\b(as)\b[ \t]*(.+)?/dg,
    captures: {
        1: { token: KeywordTokenType.As },
        2: {
            token: MetaTokenType.Arguments,
            patterns: [statements],
        },
    },
};
const behind: TokenPattern = {
    debugName: "behind",

    token: MetaTokenType.CodeBlock,
    match: /\b(behind)\b[ \t]*(.+)?/dg,
    captures: {
        1: { token: KeywordTokenType.Behind },
        2: {
            token: MetaTokenType.Arguments,
            patterns: [statements],
        },
    },
};
const onlayer: TokenPattern = {
    debugName: "onlayer",

    token: MetaTokenType.CodeBlock,
    match: /\b(onlayer)\b[ \t]*(.+)?/dg,
    captures: {
        1: { token: KeywordTokenType.OnLayer },
        2: {
            token: MetaTokenType.Arguments,
            patterns: [statements],
        },
    },
};
const zorder: TokenPattern = {
    debugName: "zorder",

    token: MetaTokenType.CodeBlock,
    match: /\b(zorder)\b[ \t]*(.+)?/dg,
    captures: {
        1: { token: KeywordTokenType.ZOrder },
        2: {
            token: MetaTokenType.Arguments,
            patterns: [statements],
        },
    },
};

const image: TokenPattern = {
    debugName: "image",

    patterns: [
        {
            token: MetaTokenType.ImageStatement,
            contentToken: MetaTokenType.ATLBlock,
            begin: /^([ \t]+)?(image)\b[ \t]*([a-zA-Z_0-9 ]*?)[ \t]*(:)/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: {}, // required for end match, but is already named by capture[0]
                2: { token: KeywordTokenType.Image },
                3: { token: EntityTokenType.VariableName },
                4: { token: CharacterTokenType.Colon },
            },
            end: lineContinuationPattern,
            patterns: [atl],
        },
        {
            debugName: "imageStatement",
            token: MetaTokenType.ImageStatement,
            begin: /^[ \t]*(image)\b[ \t]*/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Image },
            },
            end: /(?!\G)(?=\b(at)\b|#|=)|$/gm,
            patterns: [
                strings,
                {
                    match: /\b([a-zA-Z_0-9]+)\b([ \t]+)?/dg,
                    captures: {
                        1: { token: EntityTokenType.VariableName },
                        2: { token: CharacterTokenType.WhiteSpace },
                    },
                },
            ],
        },
        at,
        withStatement,
    ],
};
const show: TokenPattern = {
    debugName: "show",

    patterns: [
        {
            token: MetaTokenType.ShowStatement,
            contentToken: MetaTokenType.ATLBlock,
            begin: /^([ \t]+)?(show)\b[ \t]*([a-zA-Z_0-9 ]*?)[ \t]*(:)/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: {}, // required for end match, but is already named by capture[0]
                2: { token: KeywordTokenType.Show },
                3: { token: EntityTokenType.VariableName },
                4: { token: CharacterTokenType.Colon },
            },
            end: lineContinuationPattern,
            patterns: [atl],
        },
        {
            token: MetaTokenType.ShowStatement,
            begin: /^[ \t]*(show)\b[ \t]*/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Show },
            },
            end: /(?=\b(at|as|behind|onlayer|expression|with|zorder)\b|#)|$/gm,
            patterns: [
                strings,
                {
                    match: /\b([a-zA-Z_0-9]+)\b([ \t]+)?/dg,
                    captures: {
                        1: { token: EntityTokenType.VariableName },
                        2: { token: CharacterTokenType.WhiteSpace },
                    },
                },
                invalidToken,
            ],
        },
        at,
        as,
        withStatement,
        behind,
        onlayer,
        zorder,
    ],
};
const scene: TokenPattern = {
    debugName: "scene",

    patterns: [
        {
            token: MetaTokenType.SceneStatement,
            contentToken: MetaTokenType.ATLBlock,
            begin: /^([ \t]+)?(scene)\b[ \t]*([a-zA-Z_0-9 ]*?)[ \t]*(:)/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: {}, // required for end match, but is already named by capture[0]
                2: { token: KeywordTokenType.Scene },
                3: { token: EntityTokenType.VariableName },
                4: { token: CharacterTokenType.Colon },
            },
            end: lineContinuationPattern,
            patterns: [atl],
        },
        {
            token: MetaTokenType.SceneStatement,
            begin: /^[ \t]*(scene)\b[ \t]*/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Scene },
            },
            end: /(?=\b(at|as|behind|onlayer|expression|with|zorder)\b|#)|$/gm,
            patterns: [
                strings,
                {
                    match: /\b([a-zA-Z_0-9]+)\b([ \t]+)?/dg,
                    captures: {
                        1: { token: EntityTokenType.VariableName },
                        2: { token: CharacterTokenType.WhiteSpace },
                    },
                },
            ],
        },
        at,
        as,
        withStatement,
        behind,
        onlayer,
        zorder,
    ],
};
const camera: TokenPattern = {
    debugName: "camera",

    patterns: [
        {
            token: MetaTokenType.CameraStatement,
            contentToken: MetaTokenType.ATLBlock,
            begin: /^([ \t]+)?(camera)\b[ \t]*(:)/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: {}, // required for end match, but is already named by capture[0]
                2: { token: KeywordTokenType.Camera },
                3: { token: EntityTokenType.VariableName },
                4: { token: CharacterTokenType.Colon },
            },
            end: lineContinuationPattern,
            patterns: [atl],
        },
        {
            token: MetaTokenType.CameraStatement,
            begin: /^[ \t]*(camera)\b[ \t]*/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Camera },
            },
            end: /(?=\b(at|with)\b|#)|$/gm,
            patterns: [
                {
                    match: /\b([a-zA-Z_0-9]+)\b([ \t]+)?/dg,
                    captures: {
                        1: { token: EntityTokenType.VariableName },
                        2: { token: CharacterTokenType.WhiteSpace },
                    },
                },
            ],
        },
        at,
        withStatement,
    ],
};

const builtinLabels: TokenPattern = {
    debugName: "builtinLabels",

    token: EntityTokenType.FunctionName,
    match: /(?<!\.)\b(?:start|quit|after_load|splashscreen|before_main_menu|main_menu|after_warp|hide_windows)\b/g,
};
const labelName: TokenPattern = {
    debugName: "labelName",

    patterns: [
        pythonBuiltinPossibleCallables,
        builtinLabels,
        {
            token: EntityTokenType.FunctionName,
            match: /\b(?:[a-zA-Z_]\w*)\b/g,
        },
    ],
};
const labelCall: TokenPattern = {
    debugName: "labelCall",

    // Note: label params are only allowed at the end of the access expression,
    token: MetaTokenType.LabelCall,
    begin: /\b(?=([a-zA-Z_]\w*)\s*(\())/g,
    end: /(\))/dg,
    endCaptures: {
        1: { token: CharacterTokenType.CloseParentheses },
    },
    patterns: [pythonSpecialVariables, labelName, pythonFunctionArguments],
};
const labelAccess: TokenPattern = {
    debugName: "labelAccess",

    // Note: Labels can't be nested twice in a row!,
    token: MetaTokenType.LabelAccess,
    begin: /(\.)\s*(?!\.)/dg,
    beginCaptures: {
        1: { token: CharacterTokenType.Period },
    },
    end: /(?<=\S)(?=\W)|(^|(?<=\s))(?=[^\\\w\s])|$/gm,
    patterns: [labelCall, labelName],
};
const labelDefName: TokenPattern = {
    debugName: "labelDefName",

    // Note: Labels can't be nested twice in a row!,
    patterns: [
        pythonBuiltinPossibleCallables,
        builtinLabels,
        {
            match: /(?<=^|[ \t])(\b(?:[a-zA-Z_]\w*)\b)?(\.)?(\b(?:[a-zA-Z_]\w*)\b)/dgm,
            captures: {
                1: { token: EntityTokenType.FunctionName },
                2: { token: CharacterTokenType.Period },
                3: { token: EntityTokenType.FunctionName },
            },
        },
    ],
};
const label: TokenPattern = {
    debugName: "label",

    token: MetaTokenType.LabelStatement,
    match: /^[ \t]*(label)\b[ \t]*(.*?)([ \t]*hide)?(:)/dgm,
    captures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Label },
        2: {
            patterns: [labelDefName, pythonParameters, invalidToken],
        },
        3: { token: KeywordTokenType.Hide },
        4: { token: CharacterTokenType.Colon },
    },
};

const callJumpExpression: TokenPattern = {
    debugName: "callJumpExpression",

    begin: /\b(?<!\.)(expression)\b/dg,
    beginCaptures: {
        1: { token: KeywordTokenType.Expression },
    },
    end: /(?=\b(?<!\.)(?:pass|from)\b)|$/gm,
    patterns: [expressions, pythonExpression],
};
const callPass: TokenPattern = {
    debugName: "callPass",

    begin: /\b(?<!\.)(pass)\b[ \t]*(?=\()/dg,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Pass },
    },
    end: /(\))/dg,
    endCaptures: {
        1: { token: CharacterTokenType.CloseParentheses },
    },
    patterns: [pythonFunctionArguments],
};
const callFrom: TokenPattern = {
    debugName: "callFrom",

    begin: /\b(?<!\.)(from)\b[ \t]*/dg,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.From },
    },
    end: /(?=\W|$)/gm,
    patterns: [labelName],
};
const call: TokenPattern = {
    debugName: "call",

    token: MetaTokenType.CallStatement,
    begin: /^[ \t]+(call)\b[ \t]*/dgm,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Call },
    },
    end: /(?=#|$)/dgm,
    endCaptures: {
        1: { token: MetaTokenType.Invalid },
    },
    patterns: [
        callJumpExpression,
        callPass,
        {
            // Label expression,
            begin: /\G/g,
            end: /(?!\G)(?![ \t]*\.[ \t]*)/g,
            patterns: [labelCall, labelAccess, labelName],
        },
        callFrom,
    ],
};
const jump: TokenPattern = {
    debugName: "jump",

    token: MetaTokenType.JumpStatement,
    begin: /^[ \t]+(jump)\b[ \t]*/dgm,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Jump },
    },
    end: /(?!\G)[ \t]*(.*?)?(?=#|$)/dgm,
    endCaptures: {
        0: { patterns: [whiteSpace] },
        1: { token: MetaTokenType.Invalid },
    },
    patterns: [
        callJumpExpression,
        {
            // Label expression,
            begin: /\G/g,
            end: /(?!\G)(?![ \t]*\.[ \t]*)/g,
            patterns: [labelAccess, labelName],
        },
    ],
};
const returnStatements: TokenPattern = {
    debugName: "returnStatements",

    begin: /^[ \t]+(return)\b[ \t]*/dgm,
    beginCaptures: {
        0: { patterns: [whiteSpace] },
        1: { token: KeywordTokenType.Return },
    },
    end: /$/gm,
    patterns: [expressions, pythonExpression],
};

const builtinAudioChannels: TokenPattern = {
    debugName: "builtinAudioChannels",

    token: EntityTokenType.PropertyName,
    match: /(?<!\.)\b(?:music|sound|voice|audio)\b/g,
};
const audioParams: TokenPattern = {
    debugName: "audioParams",

    patterns: [
        {
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:fadeout|fadein|volume|loop|noloop)\b/g,
        },
        pythonNumber,
    ],
};
const play: TokenPattern = {
    debugName: "play",

    patterns: [
        {
            token: MetaTokenType.PlayAudioStatement,
            begin: /^[ \t]*(play|queue)\b[ \t]+\b([a-zA-Z_0-9]*)\b[ \t]*/dgm,
            beginCaptures: {
                0: { patterns: [whiteSpace] },
                1: { token: KeywordTokenType.Play },
                2: {
                    patterns: [
                        builtinAudioChannels,
                        {
                            match: /.*/g,
                            token: EntityTokenType.VariableName,
                        },
                    ],
                },
            },
            end: /(?=[ \t]*#)|$/gm,
            patterns: [strings, audioParams, pythonExpression],
        },
    ],
};
const stop: TokenPattern = {
    debugName: "stop",

    patterns: [
        {
            token: MetaTokenType.StopAudioStatement,
            begin: /^[ \t]*(stop)\b[ \t]+\b([a-zA-Z_0-9]*)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Stop },
                2: {
                    patterns: [
                        builtinAudioChannels,
                        {
                            match: /.*/g,
                            token: EntityTokenType.VariableName,
                        },
                    ],
                },
            },
            end: /(?=[ \t]*#)|$/gm,
            patterns: [
                {
                    match: /\b(?<!\.)(?:fadeout)\b/g,
                    token: KeywordTokenType.Fadeout,
                },
                pythonNumber,
            ],
        },
    ],
};
const audio: TokenPattern = {
    debugName: "audio",

    patterns: [play, stop],
};

const renpyStatements: TokenPattern = {
    debugName: "renpyStatements",

    patterns: [label, menu, image, audio, transform, scene, camera, show, withStatement, returnStatements, jump, call],
};

statements.patterns!.push(renpyStatements, pythonStatements, keywords, sayStatements);
expressions.patterns!.push(comments, strings, literal, charactersPatten);
