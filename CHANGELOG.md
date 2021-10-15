# Changelog

## 2.0.0 (2021/09/01)

### Features

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
