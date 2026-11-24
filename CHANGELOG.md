# Changelog

## 806.2.0

* Security: in Restricted Mode (an untrusted workspace), the extension no longer
  runs Ren'Py: not when compiling on save, and not from the run, compile, or
  debug commands. `renpy.renpyExecutableLocation` is also now a restricted
  configuration, so a workspace's settings can't choose the program that runs.
  Thanks to Jorian Woltjer for reporting this.
* Tasks now quote the Ren'Py executable path, so they work when it contains
  spaces or other characters that are special to the shell.
* Ren'Py tasks work without `renpy.renpyExecutableLocation` set: running one
  explains that the setting is missing, instead of an error being logged every
  time VS Code lists tasks. Changing the setting takes effect without
  reloading.
* Ren'Py 8.6 support. The version is now 806.0.0.
* Test language: highlight the new `while`, `for`, `break`, and `continue`
  statements, the `text` selector (and its `expression` alias), `label`
  conditions, and `repeat`.
* F-strings follow PEP 701 (Python 3.12, used by Ren'Py 8.6): a format spec may
  contain any fill character, including a quote (`f"{x:'>10}"`), a replacement
  field may span lines and contain comments, and a bad format spec no longer
  breaks highlighting on the following lines.
* Python highlighting is updated through Python 3.15: `lazy import` and
  `lazy from`, template strings (`t"..."`), `type` aliases, type parameter
  lists on `def` and `class` (with bounds and defaults), `except*`, and
  decorators that are any expression.
* Text interpolation accepts the `!f` flag, as in `[name!f]`.
* ATL and transform properties: `gl_texture_scaling_tex0` to `tex3`, and any
  property starting with `u_`, `gl_texture_wrap_`, or `gl_texture_scaling_`.
* Updated the Ren'Py API data and keyword lists from Ren'Py 8.6.

## 805.1.0

* Stable release.
* New versioning scheme. 805 means it's for Ren'Py 8.5.

## 8.6.0

* Mistakenly published stable release.
* Arguments passed to the shell by tasks are now quoted by VS Code, allowing the
  commands to work even if spaces are in the directory names.

## 8.5.0

* Prerelease.
* Update to match Ren'Py 8.5. This includes screen properties, ATL properties, and
  the API.
* Syntax highlighting for the test sub-language.
* Ren'Py injection for _ren.py and markdown files.
* Use Child process for debugging instead of a terminal.

## 2.4.x

* The first stable release targeting Ren'Py 8.3.

## 2.3.x

* Development of Ren'Py language has moved to the Ren'Py project.
* Updated the Ren'Py API to match the in-development version of Ren'Py 8.3.
