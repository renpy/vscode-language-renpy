/* eslint-disable no-useless-escape */
/* eslint-disable no-useless-backreference */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR
// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.
// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.
// Last generated: 14/07/2024 12:28:58 (UTC+0)

import { EntityTokenType, CharacterTokenType, KeywordTokenType, MetaTokenType } from "./renpy-tokens";
import { TokenPattern } from "./token-pattern-types";

export const builtinScreens: TokenPattern = {
    debugName: "builtinScreens",

    token: EntityTokenType.FunctionName, /*support.function.builtin.screen.renpy*/
    match: /(?<!\.)\b(?:start|quit|after_load|splashscreen|before_main_menu|main_menu|after_warp|hide_windows)\b/g,
};

export const screenDefName: TokenPattern = {
    // TODO: Should combine this with label-def-name
    patterns: [
        builtinScreens,
        {
            debugName: "screenDefName.patterns![2]",

            match: /(?<=^|[ \t])(\b(?:[a-zA-Z_]\w*)\b)?(\.)?(\b(?:[a-zA-Z_]\w*)\b)/dgm,
            captures: {
                1: { token: EntityTokenType.FunctionName, /*entity.name.function.renpy*/ },
                2: { token: CharacterTokenType.Dot, /*punctuation.separator.dot.renpy*/ },
                3: { token: EntityTokenType.FunctionName, /*entity.name.function.renpy*/ },
            },
        },
    ]
};

export const screenBuildInProperties: TokenPattern = {
    // These are the ATL keywords, will need to fix this later
    patterns: [
        {
            debugName: "screenBuildInProperties.patterns![0]",

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
            debugName: "screenBuildInProperties.patterns![1]",

            // Special manipulation keywords
            match: /\b(?<!\.)(key|input|(?:text|image)?button|grid|auto|mousearea|side|timer|[vh]?bar|action|viewport|scrollbars|mousewheel|vpgrid|imagemap)\b/dg,
            captures: {
                1: { token: KeywordTokenType.Other, /*keyword.other.renpy*/ },
            },
        },
        {
            debugName: "screenBuildInProperties.patterns![2]",

            // Random props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:[xy]padding|area|(un)?hovered|draggable|cols|spacing|side_[xy]align)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![3]",

            // position props (int, absolute, or a float)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:xpos|ypos|xanchor|yanchor|xcenter|ycenter|radius)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![4]",

            // position pair props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:pos|anchor|xycenter|around|alignaround|matrixanchor)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![5]",

            // float props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:xalign|yalign|zoom|xzoom|yzoom|alpha|additive|angle|delay|events|zpos)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![6]",

            // float pair props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:align|knot)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![7]",

            // int props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:xoffset|yoffset|xtile|ytile|size)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![8]",

            // int pair props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:offset)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![9]",

            // boolean props
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:rotate_pad|transform_anchor|nearest|crop_relative|subpixel|zzoom)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![10]",

            // ('#float' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:rotate|xpan|ypan|blur)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![11]",

            // ('#position' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:xsize|ysize)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![12]",

            // ('\(int, int, int, int\)' | '\(float, float, float, float\)' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:crop)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![13]",

            // ('\(int, int\)' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:corner1|corner2)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![14]",

            // ('\(position, position\)' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:xysize)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![15]",

            // ('#string' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:fit)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![16]",

            // ('\(int, int\)' | None)
            token: MetaTokenType.Deprecated, /*invalid.deprecated.renpy*/
            match: /\b(?<!\.)(?:size|maxsize)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![17]",

            // ('#Matrix' | '#MatrixColor' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:matrixcolor)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![18]",

            // ('#Matrix' | '#TransformMatrix' | None)
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:matrixtransform)\b/g,
        },
        {
            debugName: "screenBuildInProperties.patterns![19]",

            // ('#bool' | '#float' | '\(float, float, float\)')
            token: EntityTokenType.TagName, /*entity.name.tag.css.transform.renpy*/
            match: /\b(?<!\.)(?:perspective)\b/g,
        },
    ]
};

export const screenSimpleExpression: TokenPattern = {
    patterns: [
        screenBuildInProperties,
        {
            debugName: "screenSimpleExpression.patterns![21]",

            // Tokenize identifiers
            token: EntityTokenType.Identifier, /*variable.name.python*/
            match: /\b([a-zA-Z_]\w*)\b/g,
        },
    ]
};

export const screenKeywords: TokenPattern = {
    // https://www.renpy.org/doc/html/screens.html#screen-statement
    patterns: [
        {
            debugName: "screenKeywords.patterns![0]",

            contentToken: MetaTokenType.ScreenSensitive, /*meta.screen.sensitive.renpy*/
            begin: /(?<=^[ \t]*)(sensitive)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Sensitive, /*keyword.sensitive.renpy*/ },
            },
            end: /$/gm,
            patterns: [screenSimpleExpression]
        },
        {
            debugName: "screenKeywords.patterns![1]",

            token: KeywordTokenType.Other, /*keyword.other.renpy*/
            match: /\b(?<!\.)(?:modal|sensitive|tag|at|use|zorder|variant|layer|roll_forward|text)\b/g,
        },
        {
            debugName: "screenKeywords.patterns![2]",

            token: KeywordTokenType.Other, /*keyword.other.renpy*/
            match: /\b(?<!\.)(?:style|style_group|style_prefix)\b/g,
        },
        {
            debugName: "screenKeywords.patterns![3]",

            token: KeywordTokenType.Other, /*keyword.other.renpy*/
            match: /\b(?<!\.)(?:has|vbox|hbox|label|add|xfill)\b/g,
        },
    ]
};

export const screenBlockTester: TokenPattern = {
    patterns: [
        {
            debugName: "screenBlockTester.patterns![0]",

            contentToken: MetaTokenType.ScreenBlock, /*meta.screen-block.renpy*/
            begin: /(?<=(^[ \t]*)(?:screen|frame|window|text|vbox|hbox)\b.*?)(:)/dgm,
            beginCaptures: {
                2: { token: CharacterTokenType.Colon, /*punctuation.section.screen.begin.renpy*/ },
            },
            // @ts-ignore: Back references in end patterns are replaced by begin matches at runtime
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: []
        }]
};

export const screenFrame: TokenPattern = {
    debugName: "screenFrame",

    token: MetaTokenType.ScreenFrameStatement, /*meta.screen.frame.statement.renpy*/
    match: /(?<=^[ \t]*)(frame)\b/dgm,
    captures: {
        1: { token: KeywordTokenType.Frame, /*keyword.frame.renpy*/ },
    },
};

export const screenWindow: TokenPattern = {
    debugName: "screenWindow",

    token: MetaTokenType.ScreenWindowStatement, /*meta.screen.window.statement.renpy*/
    match: /(?<=^[ \t]*)(window)\b/dgm,
    captures: {
        1: { token: KeywordTokenType.Window, /*keyword.window.renpy*/ },
    },
};

export const screenText: TokenPattern = {
    debugName: "screenText",

    contentToken: MetaTokenType.ScreenText, /*meta.screen.text.renpy*/
    begin: /^([ \t]+)?(text)\b[ \t]*(:)/dgm,
    beginCaptures: {
        1: { token: CharacterTokenType.Whitespace, /*punctuation.whitespace.leading.block.renpy*/ },
        2: { token: KeywordTokenType.Text, /*keyword.text.renpy*/ },
        3: { token: CharacterTokenType.Colon, /*punctuation.section.block.begin.renpy*/ },
    },
    // @ts-ignore: Back references in end patterns are replaced by begin matches at runtime
    end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
    patterns: [
        {
            debugName: "screenText.patterns![0]",

            token: MetaTokenType.ScreenText, /*meta.screen.text.renpy*/
            contentToken: MetaTokenType.ATLBlock, /*meta.atl-block.renpy*/
            begin: /^([ \t]+)?(text)\b[ \t]*([a-zA-Z_0-9 ]*)(:)/dgm,
            beginCaptures: {
                1: { token: CharacterTokenType.Whitespace, /*punctuation.whitespace.leading.renpy*/ },
                2: { token: KeywordTokenType.Text, /*keyword.text.renpy*/ },
                3: { token: EntityTokenType.TextName, /*entity.name.type.text.renpy*/ },
                4: { token: CharacterTokenType.Colon, /*punctuation.section.atl.begin.renpy*/ },
            },
            // @ts-ignore: Back references in end patterns are replaced by begin matches at runtime
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: [
            ]
        },
        {
            debugName: "screenText.patterns![1]",

            token: MetaTokenType.ScreenText, /*meta.screen.text.renpy*/
            begin: /(?<=^[ \t]*)(text)\b[ \t]*/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Text, /*keyword.text.renpy*/ },
            },
            end: /(?=\b(at)\b|#|=)|$/gm,
            patterns: [
                {
                    debugName: "screenText.patterns![1].patterns![1]",

                    token: EntityTokenType.TextName, /*entity.name.type.text.renpy*/
                    match: /\b(?:[a-zA-Z_0-9]+)\b[ \t]*/g,
                },
            ]
        },
    ]
};

export const screenBox: TokenPattern = {
    patterns: [
        {
            debugName: "screenBox.patterns![0]",

            token: MetaTokenType.ScreenVboxStatement, /*meta.screen.vbox.statement.renpy*/
            match: /(?<=^[ \t]*)(vbox)\b/dgm,
            captures: {
                1: { token: KeywordTokenType.Vbox, /*keyword.vbox.renpy*/ },
            },
        },
        {
            debugName: "screenBox.patterns![1]",

            token: MetaTokenType.ScreenHboxStatement, /*meta.screen.hbox.statement.renpy*/
            match: /(?<=^[ \t]*)(hbox)\b/dgm,
            captures: {
                1: { token: KeywordTokenType.Hbox, /*keyword.hbox.renpy*/ },
            },
        },
    ]
};

export const screen: TokenPattern = {
    patterns: [
        {
            debugName: "screen.patterns![0]",

            // See https://www.renpy.org/doc/html/screens.html
            contentToken: MetaTokenType.ScreenBlock, /*meta.screen.block.renpy*/
            begin: /(?<=^[ \t]*)(screen)\b/dgm,
            beginCaptures: {
                1: { token: KeywordTokenType.Screen, /*storage.type.screen.renpy*/ },
            },
            end: /$|^/gm,
            patterns: [
                screenDefName,
                screenBlockTester,
            ]
        },
    ]
};

export const screenFallback: TokenPattern = {
    // TODO: This is a temp fix for missing pattern references
    patterns: [
    ]
};

export const screenLanguage: TokenPattern = {
    // https://www.renpy.org/doc/html/screens.html#screen-language
    patterns: [
        screenFrame,
        screenWindow,
        screenBox,
        screenText,
        screenKeywords,
        screenSimpleExpression,
        screenFallback,
    ]
};

// Push pattern references that were not defined on include
screenBlockTester.patterns![0].patterns!.push(screenLanguage);