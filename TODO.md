Renpy Features List

- Support launching the project through VSCode

- Bugs to fix:
  * Show color editor in tags (also check https://www.renpy.org/doc/html/color_class.html)
  * % can be escaped in strings
  * if line contains unclosed ( [ or { line is continued (see https://www.renpy.org/doc/html/language_basics.html#logical-lines)
  * Inside python blocks, triple quotes should be comments
  * Obsolete functions should be strike through (Semantic token marked with type.deprecated modifier, see https://github.com/microsoft/vscode-extension-samples/tree/116b0aa1ade25bfd3c6f3df0847200089b82b72f/semantic-tokens-sample)

  * String tags
    - Properly support 'a' tag https://www.renpy.org/doc/html/text.html#text-tag-a

  * Allow hide clause in labels (https://www.renpy.org/doc/html/translation.html#tips)


- Semantics to support:
  * Default store (https://www.renpy.org/doc/html/python.html#names-in-the-store)
  * Named stores (https://www.renpy.org/doc/html/python.html#other-named-stores)
  * call/jump statement should search for valid labels
  * Colorize known variables
  * Return and pass keywords should highlight the block they belong to
  * elif/else should come after if

  * characters are in default store or 'characters' namespace
  * audio is in default store or 'audio' namespace

  * String tags (https://www.renpy.org/doc/html/text.html)
  * Custom String tags (https://www.renpy.org/doc/html/custom_text_tags.html)

  * Character callbacks (https://www.renpy.org/doc/html/character_callbacks.html)


- Renpy statements to support:
  * image statement 
    - https://www.renpy.org/doc/html/side_image.html
    - https://www.renpy.org/doc/html/displaying_images.html#image-statement
    - https://www.renpy.org/doc/html/displayables.html#images
    - https://www.renpy.org/doc/html/displayables.html#layout-boxes-and-grids

    - Support ATL block
      * https://www.renpy.org/doc/html/atl.html#image-statement-with-atl-block
      * https://www.renpy.org/doc/html/atl.html#choice-statement
      * https://www.renpy.org/doc/html/atl.html#contains-statement

  * layered image statement (https://www.renpy.org/doc/html/layeredimage.html)

  * show statement
    - at clause
    - expression clause
    - https://www.renpy.org/doc/html/atl.html#replacing-transforms
    - https://www.renpy.org/doc/html/displaying_images.html#show-statement
    - https://www.renpy.org/doc/html/text.html#text-displayables
    - https://www.renpy.org/doc/html/transforms.html
    - https://www.renpy.org/doc/html/transitions.html

    - Support ATL block
      * https://www.renpy.org/doc/html/atl.html#scene-and-show-statements-with-atl-block
      * https://www.renpy.org/doc/html/atl.html#parallel-statement
      * https://www.renpy.org/doc/html/atl.html#event-statement

  * with statement 
    - https://www.renpy.org/doc/html/displaying_images.html#with-statement
    - https://www.renpy.org/doc/html/transitions.html

  * hide statement (https://www.renpy.org/doc/html/displaying_images.html#hide-statement)

  * scene statement
    - https://www.renpy.org/doc/html/displaying_images.html#scene-statement
    - https://www.renpy.org/doc/html/atl.html#scene-and-show-statements-with-atl-block

  * screen statement
    - Special Screen Names https://www.renpy.org/doc/html/screen_special.html
    - https://www.renpy.org/doc/html/screens.html
    - https://www.renpy.org/doc/html/style.html#using-styles-and-style-inheritance
    - https://www.renpy.org/doc/html/mouse.html#using-mouse-cursors
    - https://www.renpy.org/doc/html/screen_python.html#creator-defined-screen-language-statements
    - drag and drop (https://www.renpy.org/doc/html/drag_drop.html#examples)
    - hbox/vbox (https://www.renpy.org/doc/html/screens.html#hbox)
    - imagebutton (https://www.renpy.org/doc/html/screens.html#imagebutton)
    - textbutton (https://www.renpy.org/doc/html/style.html#renpy.set_style_preference)
    - fixed (https://www.renpy.org/doc/html/screens.html#fixed)
    - grid (https://www.renpy.org/doc/html/screens.html#grid)
    - and more

  * window statement
    - https://www.renpy.org/doc/html/dialogue.html#dialogue-window-management
    - https://www.renpy.org/doc/html/screens.html#screen-language
    - frame statement
      * https://www.renpy.org/doc/html/screens.html#frame
      * https://www.renpy.org/doc/html/screens.html#bar
      * https://www.renpy.org/doc/html/translation.html#translation-actions-functions-and-variables
  
  * camera statement
    - https://www.renpy.org/doc/html/displaying_images.html#camera-and-show-layer-statements
    - https://www.renpy.org/doc/html/3dstage.html#camera


  * default/define statements
    - https://www.renpy.org/doc/html/python.html#define-statement
    - Note: Variables that are defined using the define statement are treated as constant

  * init offset statement (https://www.renpy.org/doc/html/python.html#init-offset-statement)

  * Audio
    - Audio playback tags (https://www.renpy.org/doc/html/audio.html#partial-playback)
    - voice statement (https://www.renpy.org/doc/html/voice.html)

  * style statement
    - List of properties (https://www.renpy.org/doc/html/std-style-property-index.html)
    - https://www.renpy.org/doc/html/style.html#defining-styles-style-statement
    - https://www.renpy.org/doc/html/text.html#ruby-text
    - https://www.renpy.org/doc/html/text.html#font-groups

  * translate statement
    - https://www.renpy.org/doc/html/translation.html#translate-statement

  * transform statement
    - List of properties (https://www.renpy.org/doc/html/std-transform-property-index.html)
    - https://www.renpy.org/doc/html/3dstage.html#transform-properties
    - https://www.renpy.org/doc/html/displayables.html#applying-transforms-to-displayables
    - https://www.renpy.org/doc/html/model.html#transforms-and-model-based-rendering

  * ATL
    - https://www.renpy.org/doc/html/model.html#transforms-and-model-based-rendering
  
  * Creator-Defined Statements (https://www.renpy.org/doc/html/cds.html)
    - Probably very difficult if not impossible to support properly

- To highlight:
  * List of all variables (https://www.renpy.org/doc/html/std-var-index.html)
  * List of all functions and classes (https://www.renpy.org/doc/html/py-function-class-index.html)
  * Special variables:
    - _return
    - renpy
    - director (https://www.renpy.org/doc/html/director.html)
    - preferences (see https://www.renpy.org/doc/html/preferences.html)
    - achievement (see https://www.renpy.org/doc/html/achievement.html)
    - config (see https://www.renpy.org/doc/html/config.html)
    - define (see https://www.renpy.org/doc/html/transitions.html#transition-families)
    - layeredimage (see https://www.renpy.org/doc/html/layeredimage.html#python)
    - style (https://www.renpy.org/doc/html/style.html#defining-styles-style-statement)
    - gui (https://www.renpy.org/doc/html/gui_advanced.html)
    - ui -> deprecated (https://www.renpy.org/doc/html/screen_python.html#screens-and-python)
    - layout
    - build (https://www.renpy.org/doc/html/build.html)
    - updater (https://www.renpy.org/doc/html/updater.html)
    - iap (https://www.renpy.org/doc/html/iap.html)
  
- Reserved names (https://www.renpy.org/doc/html/reserved.html)

- Complete index (https://www.renpy.org/doc/html/genindex.html)