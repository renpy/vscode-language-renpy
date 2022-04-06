# Changelog

## 2.0.8 (2022/04/07)

Fixes a error in our publishing workflow.

## 2.0.7 (2022/04/07)

### Changes and improvements

* Improved detection of `label`, `transform`, `screen`, `def` and `class` in some special cases.
* Updated dev dependencies.
* Updated README.md

### Fixes

* Fix `Visual Studio Code.edit.py` opening files containing spaces in the path [#79](https://github.com/LuqueDaniel/vscode-language-renpy/issues/79)

## 2.0.6 (2022/02/22)

### Changes and improvements

* Allow extension to run in an untrusted workspace [#70](https://github.com/LuqueDaniel/vscode-language-renpy/pull/70).
* Remove folding provider. More information [#69](https://github.com/LuqueDaniel/vscode-language-renpy/issues/69).

### Fixes

* Fix folding class at the end of init python block [#68](https://github.com/LuqueDaniel/vscode-language-renpy/pull/68).
* Other issues related to folding: [#66](https://github.com/LuqueDaniel/vscode-language-renpy/issues/66) and [#65](https://github.com/LuqueDaniel/vscode-language-renpy/issues/65).

## 2.0.5 (2021/12/24)

### Fixes

* Fix semantic exception when position is negative [#62](https://github.com/LuqueDaniel/vscode-language-renpy/issues/62)
* Fix (Uncompiled Game) status bar text when editing a non-Renpy workspace/file

## 2.0.4 (2021/11/14)

### Changes and improvements

* Ren'Py default transforms are now included in the 'at' autocomplete list [#51](https://github.com/LuqueDaniel/vscode-language-renpy/issues/51)
* Doc strings are no longer parsed for semantic tokens [#44](https://github.com/LuqueDaniel/vscode-language-renpy/issues/44)

### Fixes

* Fix folding for label starting with a dot [#52](https://github.com/LuqueDaniel/vscode-language-renpy/issues/52)
* Fix undefined store warnings for Classes and Callables [#56](https://github.com/LuqueDaniel/vscode-language-renpy/issues/56)

## 2.0.3 (2021/10/31)

### Changes and improvements

* Add support for named stores [#38](https://github.com/LuqueDaniel/vscode-language-renpy/issues/38)
* Add highlighting for `extend` keyword [#41](https://github.com/LuqueDaniel/vscode-language-renpy/pull/41)
* Change highlighting for label names [#41](https://github.com/LuqueDaniel/vscode-language-renpy/pull/41)

### Fixes

* Fix class variables not highlighting or showing in completion list [#46](https://github.com/LuqueDaniel/vscode-language-renpy/issues/46)
* Fix inherited classes not showing completion parameters [#45](https://github.com/LuqueDaniel/vscode-language-renpy/issues/45)
* Fix syntax highlighting for `self/cls` so they are tokenized as keywords [#47](https://github.com/LuqueDaniel/vscode-language-renpy/issues/47)

## 2.0.2 (2021/10/25)

### Changes and improvements

* Improve folding function and grammar by [@joe69-96](https://github.com/joe69-96) in [#32](https://github.com/LuqueDaniel/vscode-language-renpy/pull/32).
* Add settings for diagnostic warnings by [@rdurfee](https://github.com/rdurfee) in [#35](https://github.com/LuqueDaniel/vscode-language-renpy/pull/35)
  * Diagnostic warnings can now be disabled for reserved variable names, invalid variable names, or invalid filenames.
  * Reserved Ren'Py variables such as `_window_subtitle` no longer flag an error or warning
  * Variable names with numbers now highlight properly in Python functions
* Defined variables and persistents are now recognized without a compile by [@rdurfee](https://github.com/rdurfee) in [#37](https://github.com/LuqueDaniel/vscode-language-renpy/pull/37)
  * Adding default/define variables and persistents are now recognized without a compile [#27](https://github.com/LuqueDaniel/vscode-language-renpy/issues/27)
  * Auto-complete now functions correctly for internal classes such as `iap` and `updater` [#36](https://github.com/LuqueDaniel/vscode-language-renpy/issues/36)
  * Documentation for reserved Ren'Py variables such as `_window_subtitle` now displays correctly [#36](https://github.com/LuqueDaniel/vscode-language-renpy/issues/36)

## 2.0.1 (2021/10/19)

### Fixes

* Providers fixes by [@rdurfee](https://github.com/rdurfee) in [#26](https://github.com/LuqueDaniel/vscode-language-renpy/pull/26)
  * The extension now works with most features even when navigation.json is not found
  * Fixed missing command errors when navigation.json is not found
  * Warnings for undefined store variables can now be disabled
  * Hover documentation displays properly for python function defs spanning multiple lines
  * Completion now works properly with user-defined stores
  * Document Symbols (Outline) for Classes now display properties, fields, and methods
* Fix variable parsing ending prematurely by [@joe69-96](https://github.com/joe69-96) in [#29](https://github.com/LuqueDaniel/vscode-language-renpy/pull/29).

## 2.0.0 (2021/10/16)

### Features

These features have been added by [@rdurfee](https://github.com/rdurfee) - PR [#21](https://github.com/LuqueDaniel/vscode-language-renpy/pull/21).

* Extension Settings - Allows you to enable/disable certain new functionality
* Hover - Hovering over a keyword will display the selected item's source file/location as well as documentation if available
* Definition - Adds support for right-click Go To Definition (F12), which will jump to the selected keyword's source
* Document Symbols - Document Symbols are displayed in the Outline window in the sidebar
* Signature Help - Shows the documentation pop-up as you enter a function's arguments
* Completion - Displays a pop-up auto-complete menu with appropriate choices as you type your script
* Document Color - Displays a color block next to detected colors in your script and allows you to pick new colors with a click
* Reference - Adds support for Go To Reference, which searches your documents for the selected keyword
* Folding - Adds folding support to collapse logical sections of your script in the editor
* Semantic Tokens - Detects parameters and variables in screens and functions and colorizes them correctly
* Diagnostics - Adds support for detection of issues with indentation or invalid filenames/variable names and marks them as errors or warnings in the editor

## 1.1.0 (2021/08/13)

### Features

* Update syntax to Ren'Py 7.4.6 [[#18](https://github.com/LuqueDaniel/vscode-language-renpy/pull/18)] ([01f12fa](https://github.com/LuqueDaniel/vscode-language-renpy/commit/01f12fa43913d4c5ea14d738bfa69c4f5fcb2dcf))

### Fixes

* fixed keyword highlighted when using snake case  [[#19](https://github.com/LuqueDaniel/vscode-language-renpy/pull/19)] ([65dc0f3](https://github.com/LuqueDaniel/vscode-language-renpy/commit/65dc0f3cd15dd3922de8ef4fc8a59f0f40304eed))

## 1.0.8 (2021/08/12)

### Fixes

* Fixed extension's icon [[#17](https://github.com/LuqueDaniel/vscode-language-renpy/pull/17)]

### Dependencies

* Bump `path-parse` from `1.0.6` to `1.0.7` [[#16](https://github.com/LuqueDaniel/vscode-language-renpy/pull/16)]

## 1.0.7 (2021/03/29)

* Add Python-like custom folding markers [[#12](https://github.com/LuqueDaniel/vscode-language-renpy/pull/12)]
* Migrate from node to node-test
* Fix npm errors and vulnerabilities
* Upgrade packages.

## 1.0.0 (2019/08/17)

* Update Ren'Py syntax
* Adds new `surroundingPairs`, `autoClosingPairs` elements

## 0.0.5 (2019/03/15)

* Update for Ren'Py 7.1.4

## 0.0.1 (2018/05/15)

First release! :tada:

* Adds syntax highlight
* Adds snippets
