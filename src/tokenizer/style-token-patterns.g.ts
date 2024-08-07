/* eslint-disable no-useless-escape */
/* eslint-disable no-useless-backreference */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR
// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.
// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.
// Last generated: 14/07/2024 12:28:58 (UTC+0)

import { MetaTokenType, CharacterTokenType, EntityTokenType, KeywordTokenType } from "./renpy-tokens";
import { TokenPattern } from "./token-pattern-types";

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
            patterns: []
        }]
};

export const styleProperty: TokenPattern = {
    patterns: [
        {
            debugName: "styleProperty.patterns![0]",

            // ON EDIT: If you update this list, also update it in style-clause
            token: EntityTokenType.TagName, /*support.constant.property-key.test.renpy entity.name.tag.css.style.renpy*/
            match: /\b(?<!\.)(?:(?:selected_)?(?:hover_|idle_|insensitive_|activate_)?(?:activate_sound|adjust_spacing|aft_bar|aft_gutter|align|alt|altruby_style|anchor|antialias|area|background|bar_invert|bar_resizing|bar_vertical|base_bar|black_color|bold|bottom_bar|bottom_gutter|bottom_margin|bottom_padding|box_first_spacing|box_layout|box_reverse|box_spacing|box_wrap|box_wrap_spacing|caret|child|clipping|color|debug|drop_shadow|drop_shadow_color|enable_hover|first_indent|first_spacing|fit_first|focus_mask|focus_rect|font|fore_bar|fore_gutter|foreground|hinting|hover_sound|hyperlink_functions|italic|justify|kerning|key_events|keyboard_focus|language|layout|left_bar|left_gutter|left_margin|left_padding|line_leading|line_overlap_split|line_spacing|margin|maximum|min_width|minimum|minwidth|mipmap|modal|mouse|newline_indent|offset|order_reverse|outline_scaling|outlines|padding|pos|rest_indent|right_bar|right_gutter|right_margin|right_padding|ruby_style|size|size_group|slow_abortable|slow_cps|slow_cps_multiplier|slow_speed|sound|spacing|strikethrough|subpixel|subtitle_width|text_align|text_y_fudge|textalign|thumb|thumb_offset|thumb_shadow|time_policy|top_bar|top_gutter|top_margin|top_padding|underline|unscrollable|vertical|xalign|xanchor|xcenter|xfill|xfit|xmargin|xmaximum|xminimum|xoffset|xpadding|xpos|xsize|xspacing|xysize|yalign|yanchor|ycenter|yfill|yfit|ymargin|ymaximum|yminimum|yoffset|ypadding|ypos|ysize|yspacing))\b/g,
        },
        {
            debugName: "styleProperty.patterns![1]",

            token: EntityTokenType.TagName, /*support.constant.property-key.renpy entity.name.tag.css.style.renpy*/
            match: /\b(?<!\.)(?:properties)\b/g,
        },
        {
            debugName: "styleProperty.patterns![2]",

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
            ]
        },
        {
            debugName: "styleClause.patterns![5]",

            // ON EDIT: If you update this list, also update it in style-property
            begin: /\b(?<!\.)(properties|(?:(?:selected_)?(?:hover_|idle_|insensitive_|activate_)?(?:activate_sound|adjust_spacing|aft_bar|aft_gutter|align|alt|altruby_style|anchor|antialias|area|background|bar_invert|bar_resizing|bar_vertical|base_bar|black_color|bold|bottom_bar|bottom_gutter|bottom_margin|bottom_padding|box_first_spacing|box_layout|box_reverse|box_spacing|box_wrap|box_wrap_spacing|caret|child|clipping|color|debug|drop_shadow|drop_shadow_color|enable_hover|first_indent|first_spacing|fit_first|focus_mask|focus_rect|font|fore_bar|fore_gutter|foreground|hinting|hover_sound|hyperlink_functions|italic|justify|kerning|key_events|keyboard_focus|language|layout|left_bar|left_gutter|left_margin|left_padding|line_leading|line_overlap_split|line_spacing|margin|maximum|min_width|minimum|minwidth|mipmap|modal|mouse|newline_indent|offset|order_reverse|outline_scaling|outlines|padding|pos|rest_indent|right_bar|right_gutter|right_margin|right_padding|ruby_style|size|size_group|slow_abortable|slow_cps|slow_cps_multiplier|slow_speed|sound|spacing|strikethrough|subpixel|subtitle_width|text_align|text_y_fudge|textalign|thumb|thumb_offset|thumb_shadow|time_policy|top_bar|top_gutter|top_margin|top_padding|underline|unscrollable|vertical|xalign|xanchor|xcenter|xfill|xfit|xmargin|xmaximum|xminimum|xoffset|xpadding|xpos|xsize|xspacing|xysize|yalign|yanchor|ycenter|yfill|yfit|ymargin|ymaximum|yminimum|yoffset|ypadding|ypos|ysize|yspacing)))\b/dg,
            beginCaptures: {
                1: { token: EntityTokenType.TagName, /*support.constant.property-key.renpy entity.name.tag.css.style.renpy*/ },
            },
            end: /(?!\G)/g,
            patterns: []
        }]
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
        styleClause,
        {
            debugName: "style.patterns![1]",

            token: EntityTokenType.StyleName, /*entity.name.type.style.renpy*/
            match: /\b[\p{XID_Start}_]\p{XID_Continue}*\b/gu,
        },
        styleBlockTester,
    ]
};

// Push pattern references that were not defined on include
styleBlockTester.patterns![0].patterns!.push(styleClause);