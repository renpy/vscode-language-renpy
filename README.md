
# Ren'Py Language for Visual Studio Code

An extension that adds rich support for the [Ren'Py](https://www.renpy.org/) programming language to [Visual Studio Code](https://code.visualstudio.com/).

Snippets converted from [Ren'Py language support in Atom](https://github.com/renpy/language-renpy)

Feel free to [contribute](https://github.com/renpy/vscode-language-renpy/blob/master/Contributing.md), fork this and send a pull request. :smile:

## Building

To build and run the extension locally, see [this section](https://github.com/renpy/vscode-language-renpy/blob/master/Contributing.md#how-to-contribute) on the contributing page.

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

## Testing

### Test Framework

The tests use **VS Code Test CLI** (`@vscode/test-cli`) which provides:

- Real VS Code API access during testing
- Automatic VS Code instance management
- Built-in coverage reporting
- Mocha test runner in VS Code environment
- Extension testing capabilities

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (interactive)
npm run test:ui

# Run specific test pattern
npx vscode-test --grep "HashSet"

# Run with watch mode
npx vscode-test --watch
```

## Thanks To

- [language-renpy](https://github.com/renpy/language-renpy). All contributors
- [Koroshiya](https://github.com/koroshiya) ([Sublime-Renpy](https://github.com/koroshiya/Sublime-Renpy))
