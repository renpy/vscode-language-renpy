# Contributing

:sparkles: Welcome, and thank you for your interest in contributing! :sparkles:

Please note we have a [code of conduct](https://github.com/renpy/vscode-language-renpy/blob/master/CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

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

<details><summary>If done correctly your folder view should look like this.</summary>

![image](https://user-images.githubusercontent.com/60387522/176013833-e5d39ebc-0b13-4a6f-b10c-c2e3b4f68f67.png)

</details>

4. Install the recommended extensions (A popup should appear). This will make sure you get the best developer experience in our workflow and it will format the code as intended.
5. Make your changes and submit a pull request with `develop` as your target branch
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

There are two versions: **release** and **pre-release**. Because [VS Code only supports](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions) `major.minor.patch` and not the additional [semver](https://semver.org/) labels for pre-releases, to know if a version is a pre-release or final release, check its `minor` number:

* `major.EVEN_NUMBER.patch` for final releases.
* `major.ODD_NUMBER.patch` for pre-releases.
