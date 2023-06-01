/* eslint-disable no-useless-escape */
/* eslint-disable no-useless-backreference */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR
// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.
// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.
// Last generated: 01/06/2023 14:57:48 (UTC+0)

import { KeywordTokenType, EntityTokenType, MetaTokenType, CharacterTokenType } from "./renpy-tokens";
import { TokenPattern } from "./token-pattern-types";

export const atl: TokenPattern = {
    // https://www.renpy.org/doc/html/atl.html#atl-syntax-and-semantics
    patterns: [
    ]
};

export const atlBuildInProperties: TokenPattern = {
    // https://www.renpy.org/doc/html/atl.html#list-of-transform-properties
    patterns: [
        {
            debugName: "atlBuildInProperties.patterns![0]",

            // Special manipulation keywords
            match: /\b(?<!\.)(?:(warp)|(circles)|(clockwise)|(counterclockwise))\b/dg,
            captures: {
                1: { token: KeywordTokenType.Warp, /*keyword.warp.renpy*/ },
                2: { token: KeywordTokenType.Circles, /*keyword.circles.renpy*/ },
                3: { token: KeywordTokenType.Clockwise, /*keyword.clockwise.renpy*/ },
                4: { token: KeywordTokenType.Counterclockwise, /*keyword.counterclockwise.renpy*/ },
            },
        },
        {
            debugName: "atlBuildInProperties.patterns![1]",

            // position props (int, absolute, or a float)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:xpos|ypos|xanchor|yanchor|xcenter|ycenter|radius)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![2]",

            // position pair props
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:pos|anchor|xycenter|around|alignaround|matrixanchor)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![3]",

            // float props
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:xalign|yalign|zoom|xzoom|yzoom|alpha|additive|angle|delay|events|zpos)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![4]",

            // float pair props
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:align|knot)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![5]",

            // int props
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:xoffset|yoffset|xtile|ytile)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![6]",

            // int pair props
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:offset)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![7]",

            // boolean props
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:rotate_pad|transform_anchor|nearest|crop_relative|subpixel|zzoom)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![8]",

            // ('#float' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:rotate|xpan|ypan|blur)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![9]",

            // ('#position' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:xsize|ysize)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![10]",

            // ('\(int, int, int, int\)' | '\(float, float, float, float\)' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:crop)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![11]",

            // ('\(int, int\)' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:corner1|corner2)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![12]",

            // ('\(position, position\)' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:xysize)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![13]",

            // ('#string' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:fit)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![14]",

            // ('\(int, int\)' | None)
            token: MetaTokenType.Deprecated, /*invalid.deprecated.renpy*/
            match: /\b(?<!\.)(?:size|maxsize)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![15]",

            // ('#Matrix' | '#MatrixColor' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:matrixcolor)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![16]",

            // ('#Matrix' | '#TransformMatrix' | None)
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:matrixtransform)\b/g,
        },
        {
            debugName: "atlBuildInProperties.patterns![17]",

            // ('#bool' | '#float' | '\(float, float, float\)')
            token: EntityTokenType.PropertyName, /*support.type.property-name.transform.renpy*/
            match: /\b(?<!\.)(?:perspective)\b/g,
        },
    ]
};

export const atlSimpleExpression: TokenPattern = {
    patterns: [atlBuildInProperties]
};

export const atlExpression: TokenPattern = {
    // https://www.renpy.org/doc/html/atl.html#expression-statement
    patterns: [
        atlSimpleExpression,
        {
            debugName: "atlExpression.patterns![1]",

            begin: /\b(with)\b[ \t]*/dg,
            beginCaptures: {
                1: { token: KeywordTokenType.With, /*keyword.with.renpy*/ },
            },
            end: /$/gm,
            patterns: [atlSimpleExpression]
        },
    ]
};

export const atlKeywords: TokenPattern = {
    patterns: [
        {
            debugName: "atlKeywords.patterns![0]",

            // https://www.renpy.org/doc/html/atl.html#animation-statement
            match: /^[ \t]*(animation)\b/dgm,
            captures: {
                1: { token: KeywordTokenType.Animation, /*keyword.animation.renpy*/ },
            },
        },
        {
            debugName: "atlKeywords.patterns![1]",

            // https://www.renpy.org/doc/html/atl.html#pass-statement
            match: /^[ \t]*(pass)\b/dgm,
            captures: {
                1: { token: KeywordTokenType.Pass, /*keyword.control.flow.pass.renpy*/ },
            },
        },
        {
            debugName: "atlKeywords.patterns![2]",

            // https://www.renpy.org/doc/html/atl.html#repeat-statement and https://www.renpy.org/doc/html/atl.html#time-statement
            begin: /^[ \t]*(?:(repeat)|(time)|(pause))\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Repeat, /*keyword.control.flow.repeat.renpy*/ },
                2: { token: KeywordTokenType.Time, /*keyword.control.flow.time.renpy*/ },
                3: { token: KeywordTokenType.Pause, /*keyword.control.flow.pause.renpy*/ },
            },
            end: /$/gm,
            patterns: [atlSimpleExpression]
        },
        {
            debugName: "atlKeywords.patterns![3]",

            // https://www.renpy.org/doc/html/atl.html#expression-statement
            contentToken: MetaTokenType.ATLWith, /*meta.atl.with.renpy*/
            begin: /^[ \t]*(with)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.With, /*keyword.with.renpy*/ },
            },
            end: /$/gm,
            patterns: [atlSimpleExpression]
        },
        {
            debugName: "atlKeywords.patterns![4]",

            // https://www.renpy.org/doc/html/atl.html#contains-statement
            contentToken: MetaTokenType.ATLContains, /*meta.atl.contains.renpy*/
            begin: /^[ \t]*(contains)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Contains, /*keyword.control.flow.contains.renpy*/ },
            },
            end: /$/gm,
            patterns: [atlExpression]
        },
    ]
};

export const atlBlocks: TokenPattern = {
    patterns: [
        {
            debugName: "atlBlocks.patterns![0]",

            // See https://www.renpy.org/doc/html/atl.html
            contentToken: MetaTokenType.ATLBlock, /*meta.atl.block.renpy*/
            begin: /^([ \t]+)?(?:(block)|(parallel)|(contains))\b[ \t]*(:)/dgm,
            beginCaptures: {
                1: { token: CharacterTokenType.Whitespace, /*punctuation.whitespace.leading.block.renpy*/ },
                2: { token: KeywordTokenType.Block, /*keyword.block.renpy*/ },
                3: { token: KeywordTokenType.Parallel, /*keyword.parallel.renpy*/ },
                4: { token: KeywordTokenType.Contains, /*keyword.contains.renpy*/ },
                5: { token: CharacterTokenType.Colon, /*punctuation.section.block.begin.renpy*/ },
            },
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: [atl]
        },
        {
            debugName: "atlBlocks.patterns![1]",

            // https://www.renpy.org/doc/html/atl.html#choice-statement
            contentToken: MetaTokenType.ATLChoiceBlock, /*meta.atl.choice.block.renpy*/
            begin: /^([ \t]+)?(choice)\b[ \t]*(.+)?(:)/dgm,
            beginCaptures: {
                1: { token: CharacterTokenType.Whitespace, /*punctuation.whitespace.leading.block.renpy*/ },
                2: { token: KeywordTokenType.Choice, /*keyword.choice.renpy*/ },
                3: { patterns: [atlSimpleExpression] },
                4: { token: CharacterTokenType.Colon, /*punctuation.section.block.begin.renpy*/ },
            },
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: [atl]
        },
    ]
};

export const atlBuildInEvents: TokenPattern = {
    debugName: "atlBuildInEvents",

    // Pre-defined events (https://www.renpy.org/doc/html/atl.html#external-events)
    token: EntityTokenType.EventName, /*support.function.event.renpy*/
    match: /\b(?<!\.)(?:start|show|replace|hide|replaced|update|hover|idle|selected_hover|selected_idle)\b/g,
};

export const atlEventName: TokenPattern = {
    patterns: [
        atlBuildInEvents,
        {
            debugName: "atlEventName.patterns![2]",

            token: MetaTokenType.FunctionCall, /*entity.name.function.renpy meta.function-call.generic.renpy*/
            match: /\b([a-zA-Z_]\w*)\b/g,
        },
    ]
};

export const atlEventDefName: TokenPattern = {
    patterns: [
        atlBuildInEvents,
        {
            debugName: "atlEventDefName.patterns![2]",

            token: EntityTokenType.FunctionName, /*entity.name.function.renpy*/
            match: /\b([a-zA-Z_]\w*)\b/g,
        },
    ]
};

export const atlEvent: TokenPattern = {
    debugName: "atlEvent",

    // https://www.renpy.org/doc/html/atl.html#event-statement
    token: MetaTokenType.ATLEvent, /*meta.atl.event.renpy*/
    match: /^[ \t]*(event)\b[ \t]*\b([a-zA-Z_]\w*)\b/dgm,
    captures: {
        1: { token: KeywordTokenType.Event, /*keyword.event.renpy*/ },
        2: { patterns: [atlEventName] },
    },
};

export const atlOn: TokenPattern = {
    debugName: "atlOn",

    // https://www.renpy.org/doc/html/atl.html#on-statement
    contentToken: MetaTokenType.ATLOn, /*meta.atl.on.renpy*/
    begin: /^([ \t]+)?(on)\b[ \t]*(.+)?(:)/dgm,
    beginCaptures: {
        1: { token: CharacterTokenType.Whitespace, /*punctuation.whitespace.leading.block.renpy*/ },
        2: { token: KeywordTokenType.On, /*keyword.on.renpy*/ },
        3: {
            patterns: [
                atlEventName,
                {
                    debugName: "atlOn.beginCaptures![3].patterns![1]",

                    token: CharacterTokenType.Comma, /*punctuation.separator.parameters.renpy*/
                    match: /[ \t]*,[ \t]*/g,
                },
            ]
        },
        4: { token: CharacterTokenType.Colon, /*punctuation.section.block.begin.renpy*/ },
    },
    end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
    patterns: [atl]
};

export const atlFunction: TokenPattern = {
    debugName: "atlFunction",

    // https://www.renpy.org/doc/html/atl.html#function-statement
    token: MetaTokenType.ATLFunction, /*meta.atl.function.renpy*/
    match: /^[ \t]*(function)\b[ \t]*\b([a-zA-Z_]\w*)\b/dgm,
    captures: {
        1: { token: KeywordTokenType.Function, /*keyword.function.renpy*/ },
        2: {
            patterns: [
                {
                    debugName: "atlFunction.captures![2].patterns![1]",

                    token: MetaTokenType.FunctionCall, /*entity.name.function.renpy meta.function-call.generic.renpy*/
                    match: /\b([a-zA-Z_]\w*)\b/g,
                },
            ]
        },
    },
};

export const atlBuildInWarpers: TokenPattern = {
    debugName: "atlBuildInWarpers",

    // Pre-defined warpers (https://www.renpy.org/doc/html/atl.html#warpers)
    token: EntityTokenType.FunctionName, /*support.function.renpy*/
    match: /\b(?<!\.)(?:linear|ease|easein|easeout|ease_back|ease_bounce|ease_circ|ease_cubic|ease_elastic|ease_expo|ease_quad|ease_quart|ease_quint|easein_back|easein_bounce|easein_circ|easein_cubic|easein_elastic|easein_expo|easein_quad|easein_quart|easein_quint|easeout_back|easeout_bounce|easeout_circ|easeout_cubic|easeout_elastic|easeout_expo|easeout_quad|easeout_quart|easeout_quint)\b/g,
};

export const atlWarperName: TokenPattern = {
    patterns: [
        atlBuildInWarpers,
        atlBuildInProperties,
        {
            debugName: "atlWarperName.patterns![3]",

            token: MetaTokenType.FunctionCall, /*entity.name.function.renpy meta.function-call.generic.renpy*/
            match: /\b([a-zA-Z_]\w*)\b/g,
        },
    ]
};

export const atlWarper: TokenPattern = {
    debugName: "atlWarper",

    // https://www.renpy.org/doc/html/atl.html#warpers
    token: MetaTokenType.ATLWarper, /*meta.atl.warper.renpy*/
    begin: /\b(?<!\.)([a-zA-Z_]\w*)\b[ \t]*/dg,
    beginCaptures: {
        1: { patterns: [atlWarperName] },
    },
    end: /(?!\G)/g,
    patterns: [atlSimpleExpression]
};

// Push pattern references that were not defined on include
atl.patterns!.push(atlKeywords, atlBlocks, atlSimpleExpression, atlWarper, atlEvent, atlOn, atlFunction);