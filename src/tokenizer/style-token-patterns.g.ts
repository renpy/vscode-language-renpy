/* eslint-disable no-useless-escape */
/* eslint-disable no-useless-backreference */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR
// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.
// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.
// Last generated: 17/03/2025 16:10:23 (UTC+0)

import { MetaTokenType, CharacterTokenType, EntityTokenType, KeywordTokenType } from "./renpy-tokens";
import { placeholderPattern, TokenPattern } from "./token-pattern-types";

export const builtinStyles: TokenPattern = {
    patterns: [
        {
            debugName: "builtinStyles.patterns![0]",

            token: MetaTokenType.BuiltinType, /*support.type.builtin.style.renpy*/
            match: /\b(?<!\.)(?:(alt)?ruby_style)\b/g,
        },
    ]
};

export const styleBlockTester: TokenPattern = {
    patterns: [
        {
            debugName: "styleBlockTester.patterns![0]",

            contentToken: MetaTokenType.StyleBlock, /*meta.style-block.renpy*/
            begin: /(?<=(^[ \t]*)(?:style)\b.*?)(:)/dgm,
            beginCaptures: {
                2: { token: CharacterTokenType.Colon, /*punctuation.section.style.begin.renpy*/ },
            },
            // @ts-ignore: Back references in end patterns are replaced by begin matches at runtime
            end: /^(?=(?!\1)[ \t]*[^\s#]|\1[^\s#])/gm,
            patterns: [
                placeholderPattern, // Placeholder for styleClause
                placeholderPattern, // Placeholder for source.renpy#fallback-patterns
            ]
        },
    ]
};

export const styleProperty: TokenPattern = {
    patterns: [
        {
            debugName: "styleProperty.patterns![0]",

            // ON EDIT: If you update this list, also update it in style-clause
            token: EntityTokenType.TagName, /*support.constant.property-key.test.renpy entity.name.tag.css.style.renpy*/
            match: /\b(?<!\.)(?:(?:selected_)?(?:hover_|idle_|insensitive_|activate_)?(?:activate_sound|adjust_spacing|aft_bar|aft_gutter|alt|antialias|axis|background|bar_invert|bar_resizing|unscrollable|bar_vertical|black_color|bold|bottom_margin|bottom_padding|box_layout|box_reverse|box_wrap|box_wrap_spacing|caret|child|clipping|color|debug|drop_shadow|drop_shadow_color|emoji_font|extra_alt|first_indent|first_spacing|fit_first|focus_mask|focus_rect|font|fore_bar|fore_gutter|foreground|group_alt|hinting|hover_sound|hyperlink_functions|italic|instance|justify|kerning|key_events|keyboard_focus|language|layout|line_leading|left_margin|line_overlap_split|left_padding|line_spacing|mouse|modal|min_width|mipmap|newline_indent|order_reverse|outlines|outline_scaling|prefer_emoji|rest_indent|right_margin|right_padding|ruby_line_leading|shaper|size|size_group|slow_abortable|slow_cps|slow_cps_multiplier|spacing|strikethrough|subtitle_width|subpixel|text_y_fudge|text_align|thumb|thumb_offset|thumb_shadow|time_policy|top_margin|top_padding|underline|vertical|xanchor|xfill|xfit|xmaximum|xminimum|xoffset|xpos|xspacing|yanchor|yfill|yfit|ymaximum|yminimum|yoffset|ypos|yspacing|margin|xmargin|ymargin|xalign|yalign|padding|xpadding|ypadding|minwidth|textalign|slow_speed|enable_hover|left_gutter|right_gutter|top_gutter|bottom_gutter|left_bar|right_bar|top_bar|bottom_bar|base_bar|box_spacing|box_first_spacing|pos|anchor|offset|align|maximum|minimum|xsize|ysize|xysize|area|xcenter|ycenter|xycenter))\b/g,
        },
        {
            debugName: "styleProperty.patterns![1]",

            token: MetaTokenType.BuiltinType, /*support.type.builtin.style.renpy*/
            match: /\b(?<!\.)(?:(alt)?ruby_style)\b/g,
        },
        {
            debugName: "styleProperty.patterns![2]",

            token: EntityTokenType.TagName, /*support.constant.property-key.renpy entity.name.tag.css.style.renpy*/
            match: /\b(?<!\.)(?:properties)\b/g,
        },
        {
            debugName: "styleProperty.patterns![3]",

            // Any other tokens are invalid
            token: MetaTokenType.Invalid, /*invalid.illegal.style-property.name.renpy*/
            match: /.+/g,
        },
    ]
};

export const styleClause: TokenPattern = {
    patterns: [
        {
            debugName: "styleClause.patterns![0]",

            // is statement
            begin: /\b(?<!\.)(is)\b/dg,
            beginCaptures: {
                1: { token: MetaTokenType.LogicalOperatorKeyword, /*keyword.operator.logical.python*/ },
            },
            end: /(?!\G)(?<=[^ \t])|$/gm,
            patterns: [
                {
                    debugName: "styleClause.patterns![0].patterns![0]",

                    token: EntityTokenType.StyleName, /*entity.name.type.style.base.renpy*/
                    match: /\b[\p{XID_Start}_]\p{XID_Continue}*\b/gu,
                },
                placeholderPattern, // Placeholder for source.renpy#fallback-patterns
            ]
        },
        {
            debugName: "styleClause.patterns![1]",

            token: KeywordTokenType.Clear, /*keyword.clear.renpy*/
            match: /\b(?<!\.)clear\b/g,
        },
        {
            debugName: "styleClause.patterns![2]",

            begin: /\b(?<!\.)(take)\b/dg,
            beginCaptures: {
                1: { token: KeywordTokenType.Take, /*keyword.take.renpy*/ },
            },
            end: /(?!\G)(?<=[^ \t])|$/gm,
            patterns: [
                placeholderPattern, // Placeholder for source.renpy#name
                placeholderPattern, // Placeholder for source.renpy#fallback-patterns
            ]
        },
        {
            debugName: "styleClause.patterns![3]",

            match: /\b(?<!\.)(del)\b[ \t]*(\w*)/dg,
            captures: {
                1: { token: KeywordTokenType.Del, /*keyword.del.renpy*/ },
                2: { patterns: [styleProperty] },
            },
        },
        {
            debugName: "styleClause.patterns![4]",

            begin: /\b(?<!\.)(variant)\b/dg,
            beginCaptures: {
                1: { token: KeywordTokenType.Variant, /*keyword.variant.renpy*/ },
            },
            end: /(?!\G)/g,
            patterns: [
                placeholderPattern, // Placeholder for source.renpy#simple-expression
            ]
        },
        {
            debugName: "styleClause.patterns![5]",

            // ON EDIT: If you update this list, also update it in style-property
            begin: /\b(?<!\.)(properties|(?:(?:selected_)?(?:hover_|idle_|insensitive_|activate_)?(?:activate_sound|adjust_spacing|aft_bar|aft_gutter|alt|altruby_style|antialias|axis|background|bar_invert|bar_resizing|unscrollable|bar_vertical|black_color|bold|bottom_margin|bottom_padding|box_layout|box_reverse|box_wrap|box_wrap_spacing|caret|child|clipping|color|debug|drop_shadow|drop_shadow_color|emoji_font|extra_alt|first_indent|first_spacing|fit_first|focus_mask|focus_rect|font|fore_bar|fore_gutter|foreground|group_alt|hinting|hover_sound|hyperlink_functions|italic|instance|justify|kerning|key_events|keyboard_focus|language|layout|line_leading|left_margin|line_overlap_split|left_padding|line_spacing|mouse|modal|min_width|mipmap|newline_indent|order_reverse|outlines|outline_scaling|prefer_emoji|rest_indent|right_margin|right_padding|ruby_line_leading|ruby_style|shaper|size|size_group|slow_abortable|slow_cps|slow_cps_multiplier|spacing|strikethrough|subtitle_width|subpixel|text_y_fudge|text_align|thumb|thumb_offset|thumb_shadow|time_policy|top_margin|top_padding|underline|vertical|xanchor|xfill|xfit|xmaximum|xminimum|xoffset|xpos|xspacing|yanchor|yfill|yfit|ymaximum|yminimum|yoffset|ypos|yspacing|margin|xmargin|ymargin|xalign|yalign|padding|xpadding|ypadding|minwidth|textalign|slow_speed|enable_hover|left_gutter|right_gutter|top_gutter|bottom_gutter|left_bar|right_bar|top_bar|bottom_bar|base_bar|box_spacing|box_first_spacing|pos|anchor|offset|align|maximum|minimum|xsize|ysize|xysize|area|xcenter|ycenter|xycenter)))\b/dg,
            beginCaptures: {
                1: { token: EntityTokenType.TagName, /*support.constant.property-key.renpy entity.name.tag.css.style.renpy*/ },
            },
            end: /(?!\G)|$/gm,
            patterns: [
                placeholderPattern, // Placeholder for source.renpy#simple-expression
            ]
        },
    ]
};

export const style: TokenPattern = {
    debugName: "style",

    // See https://www.renpy.org/doc/html/styles.html
    token: MetaTokenType.StyleStatement, /*meta.style.statement.renpy*/
    contentToken: MetaTokenType.StyleParameters, /*meta.style.parameters.renpy*/
    begin: /(?<=^[ \t]*)(style)\b/dgm,
    beginCaptures: {
        1: { token: KeywordTokenType.Style, /*storage.type.style.renpy*/ },
    },
    end: /$|^/gm,
    patterns: [
        builtinStyles,
        {
            debugName: "style.patterns![1]",

            // Only the first identifier is a style name
            token: EntityTokenType.StyleName, /*entity.name.type.style.renpy*/
            match: /(?<=\bstyle[ \t]*)\b[\p{XID_Start}_]\p{XID_Continue}*\b/gu,
        },
        styleClause,
        styleBlockTester,
        placeholderPattern, // Placeholder for source.renpy#fallback-patterns
    ]
};

// Push pattern references that were not defined on include
styleBlockTester.patterns![0].patterns!.splice(0, 1, styleClause);