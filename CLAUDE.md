# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the official VS Code extension for the Ren'Py visual novel engine (`renpy.language-renpy`). The extension's
major/minor version tracks the Ren'Py release it supports (e.g. 8.5.x supports Ren'Py 8.5+). Fixes target the `fix`
branch; features target `master`.

## Commands

```sh
npm ci                      # install dependencies
npm run build               # dev build into dist/ (also regenerates grammars and token patterns, see below)
npm run watch               # rebuild on change
npm run lint                # eslint
npm run format:check        # prettier check (npm run format to fix); printWidth 150, 4-space indent, double quotes
npm test                    # builds (pretest), then runs tests/**/*.test.ts inside a downloaded VS Code instance
npx vscode-test --grep "HashSet"   # run tests whose names match a pattern
npm run vsce:package        # build language-renpy.vsix
./release.sh --dry-run      # check a release; drop --dry-run to publish (see Contributing.md)
```

- Tests run in a real VS Code (`@vscode/test-cli`, Mocha BDD, config in [.vscode-test.mjs](.vscode-test.mjs)). On a
  headless Linux machine, prefix with `xvfb-run -a` as CI does. The `test:ui` script mentioned in README.md does not
  exist.
- CI ([.github/workflows/pr-check.yml](.github/workflows/pr-check.yml)) runs lint, format check, vsix packaging, and
  tests with coverage. The husky pre-commit hook runs lint-staged (eslint --fix + prettier).
- The build shells out to `npx @manzt/uv run --directory scripts generate.py`, so Python (>=3.13, via uv) is required
  for any build.

## Generated files: edit the source, not the output

| Edit this | Generates (git-ignored) |
| --- | --- |
| `syntaxes/*.tmLanguage.yaml` | `syntaxes/*.tmLanguage.json` (what VS Code loads; listed in `package.json` `contributes.grammars`) |
| the generated `.tmLanguage.json` grammars | `src/tokenizer/generated/*.g.ts` (TypeScript `TokenPattern` objects) |

[scripts/generate.py](scripts/generate.py) does both steps on every webpack build. While converting YAML it substitutes
placeholders with regexes from [scripts/keywords.py](scripts/keywords.py): `(?:STYLE_PROPERTIES)`,
`(?:ATL_PROPERTIES)`, and the `SCREEN_AUTOMATIC_PROPERTIES` pattern list.
[scripts/syntax_to_token_pattern.py](scripts/syntax_to_token_pattern.py) then turns each grammar's `repository` into
TypeScript. Exception: `syntaxes/renpy.python.tmLanguage.json` is hand-maintained JSON, not generated.

Files copied from a Ren'Py checkout by [scripts/update_from_renpy.sh](scripts/update_from_renpy.sh) `[path-to-renpy]`
(requires Ren'Py's Sphinx docs to have been built): `src/renpy.json` (Ren'Py API: `renpy.*`, `config.*`, internal/gui
names with signatures and docs) and `scripts/keywords.py` (from `tutorial/game/keywords.py`). Do not hand-edit them.

## Architecture

The extension is bundled by webpack from [src/extension.ts](src/extension.ts) into `dist/extension.js`, for both Node
([webpack.config.ts](webpack.config.ts)) and the web worker host ([browser.webpack.config.ts](browser.webpack.config.ts),
`process.platform === "web"`). Imports use the `src/...` path alias (tsconfig `paths`, webpack alias). `activate()`
registers one provider per language feature, each in its own module (`hover.ts`, `definition.ts`, `completion.ts`,
`signature.ts`, `outline.ts`, `references.ts`, `color.ts`, `semantics.ts`, `diagnostics.ts`), plus a debug adapter
(`debugger.ts`, launches Ren'Py) and a task provider.

Two independent analysis systems back those providers:

1. **NavigationData** ([src/navigation-data.ts](src/navigation-data.ts)) — a static, global index used by most
   providers. It combines:
   - `src/renpy.json` and `src/renpyauto.json` (bundled API metadata and keyword completions);
   - `saves/navigation.json` in the user's game folder, produced by running the Ren'Py executable as
     `<project> compile --json-dump <file>` (`ExecuteRenpyCompile` in extension.ts; see `examples/game/saves/` for a
     sample). It provides locations of labels, screens, defines, transforms, and callables;
   - regex scans of open `.rpy` files for classes, characters, displayables, persistent variables, stores, etc.
     (`scanDocumentForClasses`), plus scans of the images/audio/fonts folders.

   `refresh()` rebuilds it; file saves trigger recompilation/rescans. Running Ren'Py requires a trusted workspace and
   the `renpy.renpyExecutableLocation` setting; in Restricted Mode the extension never runs Ren'Py.
2. **Tokenizer** ([src/tokenizer/](src/tokenizer/)) — a TypeScript reimplementation of TextMate grammar matching that
   runs the generated token patterns over a document and produces a typed token tree with a per-document cache. It is
   used by semantic tokens, color detection, and the token debug view (`renpy.toggleTokenDebugView`,
   `debug-decorator.ts`). `renpy-tokens.ts` defines the token type enums and `token-definitions.ts` their names; the
   mapping from TextMate scope names to token types is hard-coded in `syntax_to_token_pattern.py`, so a new scope in
   the grammar YAML may need a new token type in both places. `src/types/` holds the custom collection types
   (`Vector`, `Stack`, `HashSet`, `ValueEqualsSet`) it relies on.

Syntax highlighting itself is purely declarative: the TextMate grammars plus injections in `syntaxes/*.json`
(Markdown code blocks, log files). [grammars/](grammars/) holds EBNF reference grammars for Ren'Py, ATL, screen
language, and Python; they are documentation, not build inputs. [examples/](examples/) contains `.rpy` files for
manually checking highlighting (`tokenizer_tests.rpy`, `unit_test.rpy`, ...).

When working on grammars, Ctrl+Alt+Shift+I shows VS Code's token inspector, and coloring the scope
`debug.invalid.illegal.unmatched.renpy` red (via `editor.tokenColorCustomizations`) reveals unmatched tokens.
