
# Ren'Py Language for Visual Studio Code

Adds syntax highlight and snippets for [Ren'Py](https://www.renpy.org/) to [Visual Studio Code](https://code.visualstudio.com/)

- [![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/luquedaniel.languague-renpy?label=Visual%20Studio%20Marketplace&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=LuqueDaniel.languague-renpy)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/luquedaniel.languague-renpy?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=LuqueDaniel.languague-renpy&ssr=false#review-details)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/luquedaniel.languague-renpy?style=flat-square)
- [![Open VSX Version](https://img.shields.io/open-vsx/v/LuqueDaniel/languague-renpy?label=Open%20VSX&style=flat-square)](https://open-vsx.org/extension/LuqueDaniel/languague-renpy)
[![Open VSX Rating](https://img.shields.io/open-vsx/rating/LuqueDaniel/languague-renpy?style=flat-square)](https://open-vsx.org/extension/LuqueDaniel/languague-renpy)
![Open VSX Downloads](https://img.shields.io/open-vsx/dt/LuqueDaniel/languague-renpy?style=flat-square)

**Converted from** [Ren'Py language support in Atom](https://github.com/renpy/language-renpy)

Feel free to [contribute](https://github.com/LuqueDaniel/vscode-language-renpy/blob/master/Contributing.md), fork this and send a pull request. :smile:

## Features

### Syntax Highlighting

![syntax](https://user-images.githubusercontent.com/1286535/40073232-9509274a-5876-11e8-98ff-e14b46bfab8a.gif)

> The syntax highlight depending on the syntax theme used. In this case [One Dark Pro](https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.Material-theme).

### Snippets

![snippets](https://user-images.githubusercontent.com/1286535/40073650-b999c5dc-5877-11e8-8910-596f9e94b281.gif)

### Completion

![completion](https://user-images.githubusercontent.com/12246002/137429951-63043065-57c7-4fb2-8bc3-27f69616f439.gif)

> Displays a pop-up auto-complete menu with context-appropriate choices as you type your script or enter screen properties.

### Document Color

![colors](https://user-images.githubusercontent.com/12246002/137429939-a813bc82-e067-4306-9d4b-9d3fa064b1b6.gif)

> Displays a color block next to detected colors in your script and allows you to pick new colors with a click.

### Hover

![hover](https://user-images.githubusercontent.com/12246002/137430452-3ae9e16a-6bd9-474b-837c-f19040a92766.gif)

> Hovering over a Ren'Py or user-defined keyword will display the selected item's source file/location as well as documentation if available. Clicking the filename location will jump to that document and position.

### Go To Definition

> Adds support for right-click Go To Definition (F12), which will jump to the selected keyword's source.

### Signature Help

> Shows the documentation pop-up as you enter a function's arguments.

### Diagnostics

![diagnostics](https://user-images.githubusercontent.com/12246002/137431018-978530fd-4af4-4d10-b72a-fe852a5ddffd.gif)

> Adds support for detection of issues with indentation or invalid filenames/variable names and marks them as errors or warnings in the editor.

### Document Symbols

> Document Symbols are displayed in the Outline window in the sidebar.

## Integrate VSCode as code editor in Ren'Py

You can copy the [`Visual Studio Code.edit.py`](https://raw.githubusercontent.com/LuqueDaniel/vscode-language-renpy/master/Visual%20Studio%20Code.edit.py) file that is available at the root of this repository to the root of your project directory. This will add VSCode (or VSCodium) to the list of text editors in Ren'Py.

## Thanks To

- [language-renpy](https://github.com/renpy/language-renpy). All contributors
- [Koroshiya](https://github.com/koroshiya) ([Sublime-Renpy](https://github.com/koroshiya/Sublime-Renpy))
