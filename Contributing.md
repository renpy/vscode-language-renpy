# Contributing

:sparkles: Welcome, and thank you for your interest in contributing! :sparkles:

## Reporting bugs or proposing features

Open a new issue for each bug or feature you want to propose.

1. Before reporting a bug :mag: **[check](https://github.com/renpy/vscode-language-renpy/issues)** if it has
   already been reported.
2. Specify steps to reproduce.

## Pull Request Process

If you want to add new features, please make sure to discuss it in an issue.

## How to contribute

1. Clone the project
2. Start VSCode and select `Open Folder...`
3. Now select the folder of your newly cloned project. (Eg. `../vscode-language-renpy/`)
4. Choose the correct target branch to base your work off of. That should be `master` for new features, and
   `fix` for changes to the current version.

<details><summary>If done correctly your folder view should look like this.</summary>

![image](https://user-images.githubusercontent.com/60387522/176013833-e5d39ebc-0b13-4a6f-b10c-c2e3b4f68f67.png)

</details>

4. Install the recommended extensions (A popup should appear). This will make sure you get the best developer experience in our workflow and it will format the code as intended.
5. Make your changes and submit a pull request with the appropriate target branch ('master' and 'fix').
6. Happy coding! 🚀

## Code Formatting

This project uses [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) for linting. Please ensure your code is properly formatted before submitting a pull request.

### Available Scripts

- `npm run format` - Format all files using Prettier
- `npm run format:check` - Check if files are formatted correctly
- `npm run lint` - Run ESLint to check for code quality issues

### Editor Integration

If you're using VS Code (recommended), Prettier is already configured as the default formatter for TypeScript files. The workspace settings enable "format on save", so your code will be automatically formatted when you save files.

For other editors, install the Prettier extension/plugin and configure it to use the project's `.prettierrc.json` configuration file.

### Before Submitting

Before submitting a pull request, please run:

```bash
npm run format        # Format your code
npm run format:check  # Verify formatting is correct
npm run lint          # Check for linting issues
```

Tips:

If you're working on syntax features, add the following textmate rule to your vscode `settings.json` file:

```json
"editor.tokenColorCustomizations": {
   "textMateRules": [
   {
      "scope": "debug.invalid.illegal.unmatched.renpy",
      "settings": {
         "foreground": "#f00"
      }
   },
}
```

This will make any unmatched tokens red.

Use ctrl+alt+shift+i to display the vscode build-in token debug information.

https://regexr.com will be your new best friend.

## Additional Information

### Extension Versions

The version of the extensions matches the major release of Ren'Py that the extension contains support for. For
example, version 8.5.x is intended to support Ren'Py 8.5 and later releases.
