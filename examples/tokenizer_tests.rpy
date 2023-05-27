# This file is used to test the tokenizer. Comments should be a MatchPattern

"" "Renpy say statements should be a range pattern"
"" "Inside of that, we should be able to match string internals like {color=#f00}this{/color} and {b}this{/b}"

# Following code is taken from https://www.renpy.org/doc/html/
# The purpose of this code is purely to test the syntax highlighter

#region Getting Started
    #region Quick start
        # see https://www.renpy.org/doc/html/quickstart.html

        define s = Character('Sylvie', color="#dcdcaa")
        define s = Character('Sylvie', color="#4ec9b0")
        define s = Character('Sylvie', color="#c586c0")
        define s = Character('Sylvie', color="#9cdcfe")
        define s = Character('Sylvie', color="#4fc1ff")
        define s = Character('Sylvie', color="#ce9178")
        define s = Character('Sylvie', color="#d16969")
        define s = Character('Sylvie', color="#d7ba7d")
        define s = Character('Sylvie', color="#569cd6")
        define s = Character('Sylvie', color="#c8c8c8")
        define s = Character('Sylvie', color="#d4d4d4")
        define s = Character('Sylvie', color="#000080")
        define s = Character('Sylvie', color="#6a9955")
        define s = Character('Sylvie', color="#b5cea8")
        define s = Character('Sylvie', color="#646695")
        define s = Character('Sylvie', color="#f44747")
        define s = Character('Sylvie', color="#808080")

        define m = Character('Me', color="#c8c8ff")

        image logo = "renpy logo.png"
        image eileen happy = "eileen_happy_blue_dress.png"

        default book = False

        define gui.about = _("""\
        Created by PyTom.

        High school backgrounds by Mugenjohncel.""")

        label start:
            play music "audio/illurock.ogg"
            play music "audio/illurock.ogg" fadeout 1.0 fadein 1.0

            queue music "audio/next_track.opus"

            play sound "audio/effect.ogg"

            play music illurock

            stop music

            scene bg meadow
            with fade

            "Sylvie" "Hi there! How was class?"

            "Me" "Good..."
            pause

            m "Hey... Umm..."