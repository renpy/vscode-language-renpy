/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-useless-backreference */

import { CharacterTokenType, EntityTokenType, KeywordTokenType, MetaTokenType } from "./renpy-tokens";
import {
    pythonBuiltinExceptions,
    pythonBuiltinFunctions,
    pythonBuiltinPossibleCallables,
    pythonBuiltinTypes,
    pythonCurlyBraces,
    pythonEllipsis,
    pythonExpression,
    pythonFunctionCall,
    pythonIllegalNames,
    pythonIllegalOperator,
    pythonItemAccess,
    pythonLineContinuation,
    pythonList,
    pythonLiteral,
    pythonMagicNames,
    pythonMemberAccess,
    pythonOddFunctionCall,
    pythonOperator,
    pythonPunctuation,
    pythonRoundBraces,
    pythonSpecialNames,
    pythonSpecialVariables,
} from "./python-token-patterns";
import { TokenPattern } from "./token-pattern-types";
import { comments, expressions } from "./common-token-patterns";

// https://www.renpy.org/doc/html/atl.html#atl-syntax-and-semantics
export const atl: TokenPattern = {
    debugName: "atl",
    patterns: [
        /* Items included at the bottom of the file*/
    ],
};

export const atlBuildInProperties: TokenPattern = {
    debugName: "atlBuildInProperties",

    // https://www.renpy.org/doc/html/atl.html#list-of-transform-properties,
    patterns: [
        {
            // Special manipulation keywords,
            match: /\b(?<!\.)(?:(warp)|(circles)|(clockwise)|(counterclockwise))\b/dg,
            captures: {
                1: { token: KeywordTokenType.Warp },
                2: { token: KeywordTokenType.Circles },
                3: { token: KeywordTokenType.Clockwise },
                4: { token: KeywordTokenType.Counterclockwise },
            },
        },
        {
            // position props (int, absolute, or a float),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:xpos|ypos|xanchor|yanchor|xcenter|ycenter|radius)\b/g,
        },
        {
            // position pair props,
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:pos|anchor|xycenter|around|alignaround|matrixanchor)\b/g,
        },
        {
            // float props,
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:xalign|yalign|zoom|xzoom|yzoom|alpha|additive|angle|delay|events|zpos)\b/g,
        },
        {
            // float pair props,
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:align|knot)\b/g,
        },
        {
            // int props,
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:xoffset|yoffset|xtile|ytile)\b/g,
        },
        {
            // int pair props,
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:offset)\b/g,
        },
        {
            // boolean props,
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:rotate_pad|transform_anchor|nearest|crop_relative|subpixel|zzoom)\b/g,
        },
        {
            // ('#float' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:rotate|xpan|ypan|blur)\b/g,
        },
        {
            // ('#position' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:xsize|ysize)\b/g,
        },
        {
            // ('\\(int, int, int, int\\)' | '\\(float, float, float, float\\)' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:crop)\b/g,
        },
        {
            // ('\\(int, int\\)' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:corner1|corner2)\b/g,
        },
        {
            // ('\\(position, position\\)' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:xysize)\b/g,
        },
        {
            // ('#string' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:fit)\b/g,
        },
        {
            // ('\\(int, int\\)' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:size|maxsize)\b/g,
        },
        {
            // ('#Matrix' | '#MatrixColor' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:matrixcolor)\b/g,
        },
        {
            // ('#Matrix' | '#TransformMatrix' | None),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:matrixtransform)\b/g,
        },
        {
            // ('#bool' | '#float' | '\\(float, float, float\\)'),
            token: EntityTokenType.PropertyName,
            match: /\b(?<!\.)(?:perspective)\b/g,
        },
    ],
};

export const atlSimpleExpression: TokenPattern = {
    debugName: "atlSimpleExpression",

    patterns: [
        expressions,
        atlBuildInProperties,
        pythonLiteral,
        pythonMemberAccess,
        pythonIllegalOperator,
        pythonOperator,
        pythonCurlyBraces,
        pythonItemAccess,
        pythonList,
        pythonOddFunctionCall,
        pythonRoundBraces,
        pythonFunctionCall,
        pythonBuiltinFunctions,
        pythonBuiltinTypes,
        pythonBuiltinExceptions,
        pythonMagicNames,
        pythonSpecialNames,
        pythonIllegalNames,
        pythonSpecialVariables,
        pythonEllipsis,
        pythonPunctuation,
        pythonLineContinuation,
    ],
};

// https://www.renpy.org/doc/html/atl.html#expression-statement
export const atlExpression: TokenPattern = {
    debugName: "atlExpression",

    patterns: [
        atlSimpleExpression,
        {
            begin: /\b(with)\b[ \t]*/dg,
            beginCaptures: {
                1: { token: KeywordTokenType.With },
            },
            end: /$/gm,
            patterns: [atlSimpleExpression],
        },
        pythonExpression,
    ],
};

export const atlKeywords: TokenPattern = {
    debugName: "atlKeywords",

    patterns: [
        {
            // https://www.renpy.org/doc/html/atl.html#animation-statement
            match: /^[ \t]*(animation)\b/dgm,
            captures: {
                1: { token: KeywordTokenType.Animation },
            },
        },
        {
            // https://www.renpy.org/doc/html/atl.html#pass-statement
            match: /^[ \t]*(pass)\b/dgm,
            captures: {
                1: { token: KeywordTokenType.Pass },
            },
        },
        {
            // https://www.renpy.org/doc/html/atl.html#repeat-statement and https://www.renpy.org/doc/html/atl.html#time-statement
            begin: /^[ \t]*(?:(repeat)|(time)|(pause))\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Repeat },
                2: { token: KeywordTokenType.Time },
                3: { token: KeywordTokenType.Pause },
            },
            end: /$/gm,
            patterns: [atlSimpleExpression],
        },
        {
            // https://www.renpy.org/doc/html/atl.html#expression-statement
            contentToken: MetaTokenType.ATLWith,
            begin: /^[ \t]*(with)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.With },
            },
            end: /$/gm,
            patterns: [atlSimpleExpression],
        },
        {
            // https://www.renpy.org/doc/html/atl.html#contains-statement
            contentToken: MetaTokenType.ATLContains,
            begin: /^[ \t]*(contains)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Contains },
            },
            end: /$/gm,
            patterns: [atlExpression],
        },
    ],
};

export const atlBlocks: TokenPattern = {
    debugName: "atlBlocks",

    patterns: [
        {
            // See https://www.renpy.org/doc/html/atl.html
            contentToken: MetaTokenType.ATLBlock,
            begin: /^([ \t]+)?(?:(block)|(parallel)|(contains))\b[ \t]*(:)/dgm,
            beginCaptures: {
                1: { token: CharacterTokenType.WhiteSpace },
                2: { token: KeywordTokenType.Block },
                3: { token: KeywordTokenType.Parallel },
                4: { token: KeywordTokenType.Contains },
                5: { token: CharacterTokenType.Colon },
            },
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: [atl],
        },
        {
            // https://www.renpy.org/doc/html/atl.html#choice-statement
            contentToken: MetaTokenType.ATLChoiceBlock,
            begin: /^([ \t]+)?(choice)\\b[ \t]*(.+)?(:)/dgm,
            beginCaptures: {
                1: { token: CharacterTokenType.WhiteSpace },
                2: { token: KeywordTokenType.Choice },
                3: { patterns: [atlSimpleExpression] },
                4: { token: CharacterTokenType.Colon },
            },
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: [atl],
        },
    ],
};

// Pre-defined events (https://www.renpy.org/doc/html/atl.html#external-events)
export const atlBuildInEvents: TokenPattern = {
    debugName: "atlBuildInEvents",

    token: EntityTokenType.EventName,
    match: /\b(?<!\.)(?:start|show|replace|hide|replaced|update|hover|idle|selected_hover|selected_idle)\b/g,
};

export const atlEventName: TokenPattern = {
    debugName: "atlEventName",

    patterns: [
        pythonBuiltinPossibleCallables,
        atlBuildInEvents,
        {
            token: EntityTokenType.FunctionName,
            match: /\b([[:alpha:]_]\w*)\b/g,
        },
    ],
};

export const atlEventDefName: TokenPattern = {
    debugName: "atlEventDefName",

    patterns: [
        pythonBuiltinPossibleCallables,
        atlBuildInEvents,
        {
            token: EntityTokenType.FunctionName,
            match: /\b([[:alpha:]_]\w*)\b/g,
        },
    ],
};

// https://www.renpy.org/doc/html/atl.html#event-statement
export const atlEvent: TokenPattern = {
    debugName: "atlEvent",

    token: MetaTokenType.ATLEvent,
    match: /^[ \t]*(event)\b[ \t]*\b([[:alpha:]_]\w*)\b/dgm,
    captures: {
        1: { token: KeywordTokenType.Event },
        2: { patterns: [atlEventName] },
    },
};

// https://www.renpy.org/doc/html/atl.html#on-statement
export const atlOn: TokenPattern = {
    debugName: "atlOn",

    contentToken: MetaTokenType.ATLOn,
    begin: /^([ \t]+)?(on)\b[ \t]*(.+)?(:)/dgm,
    beginCaptures: {
        1: { token: CharacterTokenType.WhiteSpace },
        2: { token: KeywordTokenType.On },
        3: {
            patterns: [
                atlEventName,
                {
                    match: /[ \t]*,[ \t]*/g,
                    token: CharacterTokenType.Comma,
                },
                comments,
            ],
        },
        4: { token: CharacterTokenType.Colon },
    },
    end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
    patterns: [atl],
};
export const atlFunction: TokenPattern = {
    debugName: "atlFunction",

    // https://www.renpy.org/doc/html/atl.html#function-statement,
    token: MetaTokenType.ATLFunction,
    match: /^[ \t]*(function)\b[ \t]*\b([[:alpha:]_]\w*)\b/dgm,
    captures: {
        1: { token: KeywordTokenType.Function },
        2: {
            patterns: [
                pythonBuiltinPossibleCallables,
                {
                    token: EntityTokenType.FunctionName,
                    match: /\b([[:alpha:]_]\w*)\b/g,
                },
            ],
        },
    },
};
export const atlBuildInWarpers: TokenPattern = {
    debugName: "atlBuildInWarpers",

    // Pre-defined warpers (https://www.renpy.org/doc/html/atl.html#warpers),
    token: EntityTokenType.FunctionName,
    match: /\b(?<!\.)(?:linear|ease|easein|easeout|ease_back|ease_bounce|ease_circ|ease_cubic|ease_elastic|ease_expo|ease_quad|ease_quart|ease_quint|easein_back|easein_bounce|easein_circ|easein_cubic|easein_elastic|easein_expo|easein_quad|easein_quart|easein_quint|easeout_back|easeout_bounce|easeout_circ|easeout_cubic|easeout_elastic|easeout_expo|easeout_quad|easeout_quart|easeout_quint)\b/g,
};
export const atlWarperName: TokenPattern = {
    debugName: "atlWarperName",

    patterns: [
        pythonBuiltinPossibleCallables,
        atlBuildInWarpers,
        atlBuildInProperties,
        {
            token: EntityTokenType.FunctionName,
            match: /\b([[:alpha:]_]\w*)\b/g,
        },
    ],
};
export const atlWarper: TokenPattern = {
    debugName: "atlWarper",

    // https://www.renpy.org/doc/html/atl.html#warpers,
    token: MetaTokenType.ATLWarper,
    begin: /\b(?<!\.)([[:alpha:]_]\w*)\b[ \t]*/dg,
    beginCaptures: {
        1: { patterns: [atlWarperName] },
    },
    end: /(?!\G)/g,
    patterns: [atlSimpleExpression],
};

atl.patterns!.push(atlKeywords, atlBlocks, atlSimpleExpression, atlWarper, atlEvent, atlOn, atlFunction);
