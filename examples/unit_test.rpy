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

            show sylvie green smile with dissolve

            "I can't bring myself to admit that it all went in one ear and out the other."

            pause 3.0

            "Me" "Are you going home now? Wanna walk back with me?"

            show sylvie green surprised
            "Sylvie" "Sure!"

            show sylvie green smile at right
            
            "Sylvie" "Did you ever hear Lincoln's famous saying, \"The problem with Internet quotations is that many of them are not genuine.\""

            scene bg meadow
            with None

            s "Sure, but what's a \"visual novel?\""

            menu:

                "It's a video game.":
                    jump game

                "It's an interactive book.":
                    jump book

        label game:
            m "It's a kind of video game you can play on your computer or a console."
            jump marry

        label book:
            $ book = True
            m "It's like an interactive book that you can read on a computer or a console."
            jump marry

        label marry:
            if book:
                "Our first game is based on one of Sylvie's ideas, but afterwards I get to come up with stories of my own, too."
            else:
                "Sylvie helped with the script on our first video game."

            "And so, we become a visual novel creating duo."

        label leaving:

            s "I'll get right on it!"

            hide sylvie

            "..."

            m "That wasn't what I meant!"
    #endregion

    #region GUI Customization Guide
        # see https://www.renpy.org/doc/html/gui.html
        define config.name = _('Old School High School')

        define gui.show_name = True

        define config.version = "1.0"

        define gui.about = _("Created by PyTom.\n\nHigh school backgrounds by Mugenjohncel.")

        define gui.about = _("""\
        Created by PyTom.

        High school backgrounds by Mugenjohncel.""")

        define gui.text_size = 22
        define gui.text_size = 20

        define e = Character("Eileen", who_color="#104010")

        define gui.name_xpos = 0.5
        define gui.name_xalign = 0.5

        define gui.dialogue_xpos = 0.5
        define gui.dialogue_text_xalign = 0.5

        define gui.namebox_width = 300
        define gui.name_ypos = -22
        define gui.namebox_borders = Borders(15, 7, 15, 7)
        define gui.namebox_tile = True

        define e = Character("Eileen", kind=nvl)
        define narrator = nvl_narrator
        define menu = nvl_menu

        define gui.dialogue_text_outlines = [ (0, "#00000080", 2, 2) ]

        translate japanese python:
            gui.text_font = "MTLc3m.ttf"
            gui.text_size = 24

        define gui.interface_text_font = "DejaVuSans.ttf"

        define gui.button_text_font = gui.interface_text_font

        translate japanese python::

            define gui.interface_text_font = "MTLc3m.ttf"
            define gui.button_text_font = "MTLc3m.ttf"

        style say_dialogue:
            outlines [ (1, "#f00", 0, 0 ) ]

        screen navigation():

            vbox:
                style_prefix "navigation"

                xpos gui.navigation_xpos
                yalign 0.5

                spacing gui.navigation_spacing

                if main_menu:

                    textbutton _("Start") action Start()

                    textbutton _("Prologue") action Start("prologue")

                else:

                    textbutton _("Codex") action ShowMenu("codex")

                    textbutton _("History") action ShowMenu("history")

                    textbutton _("Save") action ShowMenu("save")

                textbutton _("Load") action ShowMenu("load")

                textbutton _("Preferences") action ShowMenu("preferences")

                if _in_replay:

                    textbutton _("End Replay") action EndReplay(confirm=True)

                elif not main_menu:

                    textbutton _("Main Menu") action MainMenu()

                textbutton _("About") action ShowMenu("about")

                textbutton _("Extras") action ShowMenu("extras")

                if renpy.variant("pc"):

                    textbutton _("Help") action ShowMenu("help")

                    textbutton _("Quit") action Quit(confirm=not main_menu)

        screen codex():

            tag menu

            use game_menu(_("Codex"), scroll="viewport"):

                style_prefix "codex"

                has vbox:
                    spacing 20

                text _("{b}Mechanical Engineering:{/b} Where we learn to build things like missiles and bombs.")

                text _("{b}Civil Engineering:{/b} Where we learn to build targets.")

        screen ctc():

            frame:
                at ctc_appear
                xalign .99
                yalign .99

                text _("(click to continue)"):
                    size 18
        
        pause .0
        transform ctc_appear:
            alpha 0.0
            pause 5.0
            linear 0.5 alpha 1.0
    #endregion
#endregion

#region The Ren'Py Language

    #region Language Basics
        # see https://www.renpy.org/doc/html/language_basics.html

        # This is a comment.
        show black # this is also a comment.

        "# This isn't a comment, since it's part of a string."

        "This is one logical line"

        "Since this line contains a string, it continues 
        even when the line ends."

        $ a = [ "Because of parenthesis, this line also",
                "spans more than one line." ]

        "This statement, and the if statement that follows, is part of a block."

        if True:

            "But this statement is part of a new block."

            "This is also part of that new block."

        "This is part of the first block, again."

        'Strings can\'t contain their delimiter, unless you escape it.'
    #endregion

    #region Labels & Control Flow
        # see https://www.renpy.org/doc/html/label.html

        # Label Statement
        label sample1:
            "Here is 'sample1' label."

        label sample2(a="default"):
            "Here is 'sample2' label."
            "a = [a]"

        label global_label:
            "Inside a global label.."
            label .local_name:
                "..resides a local one."
                jump .local_name
            
            label local:
            label .local:
            label global_name.local:
            label global_label.local_name.error:
            label .global_label.local_name.error:
                pass
            

        label another_global:
            "Now lets jump inside local label located somewhere else."
            call global_label(bob()).local_name("a")
            call global_label.local_name("a")
            jump localA.localB(Invalid)
            jump localA.localB.localC

        # Jump Statement
        label loop_start:

            e "Oh no! It looks like we're trapped in an infinite loop."

            jump loop_start

        # Call Statement
        label start:
            label .start_local:
                pass

            e "First, we will call a subroutine."

            call subroutine#lol

            call subroutine from _lol_test #lol
            call .subroutine from _lol_test baddy #lol

            call subroutine(bob()) test #lol

            call .subroutine(2) from test #lol

            call expression "sub" + "routine" pass (count=3) #lol
            call expression "sub" + "routine" pass (count=3) from _class test #lol

            jump expression "sub" + "routine" #lol
            jump expression "sub" + "routine" pass (count=3) #lol

            return

        # ...

        label subroutine(count=1):

            e "I came here [count] time(s)."
            e "Next, we will return from the subroutine."

            return test #test
    #endregion

    #region Dialogue and Narration
        # see https://www.renpy.org/doc/html/dialogue.html
        define e = Character("Eileen", image="eileen"
                                who_color="#c8ffc8")

        label start:
            "This is narration."

            "Eileen" "This is dialogue, with an explicit character name."

            e "Hello, world."

            e "This is dialogue, using a character object instead."

            "Bam!!" with vpunch

            "I walked past a sign saying, \"Let's give it 100%!\""

            show eileen mad
            e "I'm a little upset at you."

            e happy "But it's just a passing thing."

        define e = Character("Eileen")

        label start:

            show eileen mad
            e "I'm a little upset at you."

            show eileen happy
            e "But it's just a passing thing."

        define e = Character("Eileen", image="eileen")

        label start:

            show eileen mad
            e "I'm a little upset at you."

            e @ happy "That's funny."

            e "But don't think it gets you out of hot water."

        define e = Character("Eileen")

        label start:

            show eileen mad
            e "I'm a little upset at you."

            show eileen happy
            e "That's funny."

            show eileen mad
            e "But don't think it gets you out of hot water."

            e happy @ vhappy "Really! That changes everything."

        # A character that has its dialogue enclosed in parenthesis.
        define e = Character("Eileen", what_prefix='(', what_suffix=')')

        # A character that pulls its name from a variable.
        define p = Character("player_name", dynamic=True)

        # Show the first line of dialogue, wait for a click, change expression, and show
        # the rest.
        label start:
            show eileen concerned
            e "Sometimes, I feel sad."
            show eileen happy
            extend " But I usually quickly get over it!"

            # Similar, but automatically changes the expression when the first line is finished
            # showing. This only makes sense when the user doesn't have text speed set all the
            # way up.

            show eileen concerned
            e "Sometimes, I feel sad.{nw}"
            show eileen happy
            extend " But I usually quickly get over it!"

            window show # shows the window with the default transition, if any.
            pause       # the window is shown during this pause.
            window hide # hides the window.
            pause       # the window is hidden during this pause.

            window show dissolve # shows the window with dissolve.
            pause                # the window is shown during this pause.
            window hide dissolve # hides the window with dissolve.
            pause                # the window is hidden during this pause.


            window auto

            "The window is automatically shown before this line of dialogue."
            pause                # the window is shown during this pause.

            scene bg washington  # the window is hidden before the scene change.
            with dissolve

            window auto show     # Shows the window before it normally would be shown.

            show eileen
            with dissolve

            "Without window auto show, the window would have been shown here."

        $ e("Hello, world.", interact=True)
        define character.e = Character("Eileen")
        label start:

            # This is a terrible variable name.
            $ e = 100

            e "Our starting energy is [e] units."

            e "Hello, world." (what_size=32)
            $ e("Hello, world.", interact=True, what_size=32)
            $ Character(kind=e, what_size=32)("Hello, world.", interact=True)

            e "Hello, world." (what_color="#8c8")

            """
            This is the first line of narration. It's longer than the other two
            lines, so it has to wrap.

            This is the second line of narration.

            This is the third line of narration.
            """

            e """
            This is the first line of dialogue. It's longer than the other two
            lines, so it has to wrap.

            This is the second line of dialogue.

            This is the third line of dialogue.
            """

            e "Hello, world."

    #endregion

    #region Displaying Images
        # see https://www.renpy.org/doc/html/displaying_images.html
        image eileen happy = "eileen_happy.png"
        image black = "#000"
        image bg tiled = Tile("tile.jpg")

        image eileen happy question = VBox(
            "question.png",
            "eileen_happy.png",
            )

        image eileen happy = "eileen/happy.png"

        image mary night happy = "mary_night_happy.png"
        image mary night sad = "mary_night_sad.png"
        image moon = "moon.png"

        # Basic show.
        show mary night sad

        # Since 'mary night sad' is showing, the following statement is
        # equivalent to:
        # show mary night happy
        show mary happy

        # Show an image on the right side of the screen.
        show mary night happy at right

        # Show the same image twice.
        show mary night sad as mary2 at left

        # Show an image behind another.
        show moon behind mary, mary2

        # Show an image on a user-defined layer.
        show moon onlayer user_layer

        show expression "moon.png" as moon

        scene bg beach

        e "I'm out of here."

        hide eileen

        hide eileen
        show eileen happy

        show bg washington
        with dissolve

        show eileen happy at left
        show lucy mad at right
        with dissolve

        show bg washington
        with None

        show eileen happy at left
        show lucy mad at right
        with dissolve

        show eileen happy at left with dissolve
        show lucy mad at right with dissolve

        with None
        show eileen happy at left
        with dissolve

        with None
        show lucy mad at right
        with dissolve


        camera at flip

        camera:
            xalign 0.5 yalign 0.5 rotate 180

        camera

        camera mylayer at flip

        show layer master:
            blur 10

        show bg washington
        show eileen happy
        with dissolve

        window show dissolve

        "I can say stuff..."

        show eileen happy at right
        with move

        "... and move, while keeping the window shown."

        window hide dissolve

    #endregion Displaying Images

    #region In-Game Menus
        # see https://www.renpy.org/doc/html/menus.html
        menu:
            "What should I do?"

            "Drink coffee.":
                "I drink the coffee, and it's good to the last drop."

            "Drink tea.":
                $ drank_tea = True
            # spaces test
            
                $ drank_tea.function(something)

                "I drink the tea, trying not to make a political statement as I do."

            "Genuflect.":
                jump genuflect_ending

        label after_menu:

            "After having my drink, I got on with my morning."

        menu drink_menu:
            pass

        menu:
            "Go left.":
                pass
            "Go right.":
                pass
            "Fly above." if drank_tea:
                pass

        default menuset = set()


        menu chapter_1_places:

            set menuset
            "Where should I go?"

            "Go to class.":
                jump go_to_class

            "Go to the bar.":
                jump go_to_bar

            "Go to jail.":
                jump go_to_jail

        label chapter_1_after_places:

            "Wow, that was one heck of a Tuesday."

        menu ("jfk", screen="airport"):

            "Chicago, IL" (200):
                jump chicago_trip

            "Dallas, TX" (150, sale=True):
                jump dallas_trip

            "Hot Springs, AR" (300) if secret_unlocked:
                jump hot_springs_trip

    #endregion In-Game Menus

    #region Python Statements
        # see https://www.renpy.org/doc/html/python.html
        python:
            flag = True

        python:
            player_health = max(player_health - damage, 0)
            if enemy_vampire:
                enemy_health = min(enemy_health + damage, enemy_max_health)

        # Set a flag.
        $ flag = True

        # Initialize a variable.
        $ romance_points = 0

        # Increment a variable.
        $ romance_points += 1

        # Call a function that exposes Ren'Py functionality.
        $ renpy.movie_cutscene("opening.ogv")

        init python:

            def auto_voice_function(ident):
                return "voice/" + ident + ".ogg"

            config.auto_voice = auto_voice_function

            if persistent.endings is None:
                persistent.endings = set()

        init 1 python:

            # The bad ending is always unlocked.
            persistent.endings.add("bad_ending")

        define e = Character("Eileen")
        init python:
            e = Character("Eileen")

        define character.e = Character("Eileen")
        define config.tag_layer["eileen"] = "master"

        define config.keymap["dismiss"] += [ "K_KP_PLUS" ]
        define endings |= { "best_ending" }

        default points = 0

        label start:
            $ points = 0

        label after_load:
            $ points = 0

        default schedule.day = 0

        init offset = 42

        init offset = 2
        define foo = 2

        init offset = 1
        define foo = 1

        init offset = 0

        define e = Character("Eileen")

        label start:

            $ e = 0

            e "Hello, world."

            $ e += 1
            e "You scored a point!"

        init python in mystore:

            serial_number = 0

            def serial():

                global serial_number
                serial_number += 1
                return serial_number

        label start:
            $ serial = mystore.serial()

    #endregion Python Statements

    #region Conditional Statements
        # see https://www.renpy.org/doc/html/conditional.html
        if flag:
            e "You've set the flag!"

        if points >= 10:
            jump best_ending
        elif points >= 5:
            jump good_ending
        elif points >= 1:
            jump bad_ending
        else:
            jump worst_ending

        if ( points >= 10 
            and points >= 5
        ):
            jump best_ending
        elif points >= 1:
            jump bad_ending
        else:
            jump worst_ending


        $ count = 10

        while count > 0:

            "T-minus [count]."

            $ count -= 1

        "Liftoff!"

        $ lines = ["sounds/three.mp3", "sounds/two.mp3", "sounds/one.mp3"]
        while lines: # evaluates to True as long as the list is not empty
            play sound lines.pop(0) # removes the first element
            pause

        while True:

            "This is the song that never terminates."
            "It goes on and on, my compatriots."

        if points >= 10:
            "You're doing great!"
        elif points >= 1:
            pass
        else:
            "Things aren't looking so good."

        # event.step() is a function that returns True while there are
        # still events that need to be executed.

        while event.step():
            pass
    #endregion Conditional Statements

    #region Audio
        # see https://www.renpy.org/doc/html/audio.html
        play music "mozart.ogg"
        play sound "woof.mp3"
        play myChannel "punch.wav" # 'myChannel' needs to be defined with renpy.music.register_channel().

        "We can also play a list of sounds, or music."
        play music [ "a.ogg", "b.ogg" ] fadeout 1.0 fadein 1.0

        play sound "woof.mp3" volume 0.5
        play audio "sfx1.opus"
        play audio "sfx2.opus"

        play music illurock

        stop sound
        stop music fadeout 1.0

        queue sound "woof.mp3"
        queue music [ "a.ogg", "b.ogg" ]

        play sound "woof.mp3" volume 0.25
        queue sound "woof.mp3" volume 0.5
        queue sound "woof.mp3" volume 0.75
        queue sound "woof.mp3" volume 1.0

        define audio.woof = "woof.mp3"

        # ...

        play sound woof

        play music "<from 5 to 15.5>waves.opus"
        play music "<loop 6.333>song.opus"

        play music_2 [ "<sync music_1>layer_2.opus", "layer_2.opus" ]

        play audio [ "<silence .5>", "boom.opus" ]

        define audio.sunflower = "music/sun-flower-slow-jam.ogg"
        play music sunflower
        play music opening_song

        define audio.easteregg = AudioData(b'...', 'sample.wav')
        play sound easteregg

    #endregion Audio

    #region Movie
        # see https://www.renpy.org/doc/html/movie.html
        $ renpy.movie_cutscene("On_Your_Mark.webm")

        image eileen movie = Movie(play="eileen_movie.webm", mask="eileen_mask.webm")

        show eileen movie

        e "I'm feeling quite animated today."

        hide eileen

        e "But there's no point on wasting energy when I'm not around."

        image main_menu = Movie(play="main_menu.ogv")

        screen main_menu:
            add "main_menu"
            textbutton "Start" action Start() xalign 0.5 yalign 0.5

        python:
            def play_callback(old, new):
                renpy.music.play(new._play, channel=new.channel, loop=new.loop, synchro_start=True)

                if new.mask:
                    renpy.music.play(new.mask, channel=new.mask_channel, loop=new.loop, synchro_start=True)

    #endregion Movie

    #region Voice
        # see https://www.renpy.org/doc/html/voice.html
        voice "line0001.ogg"
        "Welcome to Ren'Py"

        voice "line0001.ogg"
        "Welcome to Ren'Py..."

        voice sustain
        "... your digital storytelling engine."

        define e = Character("Eileen", voice_tag="eileen")
        define l = Character("Lucy", voice_tag="lucy")

        screen voice_toggle:
            vbox:
                textbutton "Mute Eileen" action ToggleVoiceMute("eileen")
                textbutton "Mute Lucy" action ToggleVoiceMute("lucy")

        label start:
            show screen voice_toggle

            voice "e01.ogg"
            e "You can turn a character's voice on and off."

            voice "l01.ogg"
            l "Yeah! Now I can finally shut you up!"

            voice "l02.ogg"
            l "Wait... that means they can mute me as well! Really?"

        config.auto_voice = "voice/{id}.ogg"
    #endregion Voice

#endregion

#region Text, Displayables, Transforms, and Transitions

    #region Text
        # see https://www.renpy.org/doc/html/text.html
        g "Welcome to the Nekomimi Institute, [playername]!"
        g "My first name is [player.names[0]]."

        $ percent = 100.0 * points / max_points
        g "I like you [percent:.2] percent!"

        g "Don't pull a fast one on me, [playername!q]."

        if points > 5:
            $ mood = _("happy")
        else:
            $ mood = _("annoyed")

        g "I'm [mood!t] to see you."

        define earned_points_info = _("[points]{image=points.png} earned points")
        g "I'm happy to see you you have [earned_points_info!ti]."

            # This line is correct.
            "Plain {b}Bold {i}Bold-Italic{/i} Bold{/b} Plain"

            # This line is incorrect, and will cause an error or incorrect
            # behavior.
            # "Plain {b}Bold {i}Bold-Italic{/b} Italic{/i} Plain"

        label test:

            e "Why don't you visit {a=https://renpy.org}Ren'Py's home page{/a}?"

            e "Or {a=jump:more_text}here for more info{/a}."

            return

        label more_text:

            e "In Hot Springs, Arkansas, there's a statue of Al Capone you can take a picture with."

            e "That's more info, but not the kind you wanted, is it?"

            return

            "{alpha=0.1}This text is barely readable!{/alpha}"
            "{alpha=-0.1}This text is 10 percent more transparent than the default.{/alpha}"
            "{alpha=*0.5}This text is half as opaque as the default.{/alpha}"

            g "Good to see you! {image=heart.png}{alt}heart{/alt}"

            "An example of {b}bold test{/b}."

            "{color=#f00}Red{/color}, {color=#00ff00}Green{/color}, {color=#0000ffff}Blue{/color}"
            "{cps=20}Fixed Speed{/cps} {cps=*2}Double Speed{/cps}"

            "Try out the {font=mikachan.ttf}mikachan font{/font}."

            "Visit the {i}leaning tower of Pisa{/i}."

            g "Good to see you! {image=heart.png}{alt}heart{/alt}"

            "{k=-.5}Negative{/k} Normal {k=.5}Positive{/k}"

            g "Good to see you! {noalt}<3{/noalt}{alt}heart{/alt}"

            "Let's have a {outlinecolor=#00ff00}Green{/outlinecolor} outline."

            "{b}This is bold. {plain}This is not.{/plain} This is bold.{/b}"

            g "It's good {s}to see you{/s}."

            "{size=+10}Bigger{/size} {size=-10}Smaller{/size} {size=24}24 px{/size}."

            "Before the space.{space=30}After the space."

            g "It's good to {u}see{/u} you."

            "Line 1{vspace=30}Line 2"

            "New{#playlist}"

            g "Looks like they're{nw}{done} playing with their trebuchet again."
            show trebuchet
            g "Looks like they're{fast} playing with their trebuchet again."

            g "Looks like they're{nw}"
            show trebuchet
            g "Looks like they're{fast} playing with their trebuchet again."

            g "Looks like they're{nw}"
            show trebuchet
            g "Looks like they're{fast} playing with their trebuchet again."

            "Line 1{p}Line 2{p=1.0}Line 3"

            "Line 1{w} Line 1{w=1.0} Line 1"

            """
            Block 1 on page 1.

            Block 2 on page 1.

            {clear}

            Block 1 on page 2.

            etc.
            """

        define gui.language = "korean-with-spaces"
        define gui.language = "japanese-loose"
        define gui.language = "greedy"

        style ruby_style is default:
            size 12
            yoffset -20

        style say_dialogue:
            line_leading 12
            ruby_style style.ruby_style

        e "Ruby can be used for furigana (東{rt}とう{/rt} 京{rt}きょう{/rt})."

        e "It's also used for translations ({rb}東京{/rb}{rt}Tokyo{/rt})."

        init python:
            config.font_replacement_map["DejaVuSans.ttf", False, True] = ("DejaVuSans-Oblique.ttf", False, False)

        init python:
            renpy.register_bmfont("bmfont", 22, filename="bmfont.fnt")

        define ebf = Character('Eileen', what_font="bmfont", what_size=22)

        label demo_bmfont:

            ebf "Finally, Ren'Py supports BMFonts."

            style default:
                font FontGroup().add("english.ttf", 0x0020, 0x007f).add("japanese.ttf", 0x0000, 0xffff)

            show text "Hello, World" at truecenter
            with dissolve
            pause 1
            hide text
            with dissolve

            image top_text = ParameterizedText(xalign=0.5, yalign=0.0)

        init python:
            def upper(s):
                return s.upper()

        $ upper_string = renpy.transform_text("{b}Not Upper{/b}", upper)

    #endregion Text

    #region Translation
        # see https://www.renpy.org/doc/html/translation.html
        label start:
            e "Thank you for taking a look at the Ren'Py translation framework."

            show eileen happy

            e "We aim to provide a comprehensive framework for translating dialogue, strings, images, and styles."

            e "Pretty much everything your game needs!"

            e "Thank you for taking a look at the Ren'Py translation framework."

            e "We aim to provide a comprehensive framework for translating dialogue, strings, images, and styles."

            e "Pretty much everything your game needs!"

        # game/script.rpy:95
        translate piglatin start_636ae3f5:

            # e "Thank you for taking a look at the Ren'Py translation framework."
            e ""

        # game/script.rpy:99
        translate piglatin start_bd1ad9e1:

            # e "We aim to provide a comprehensive framework for translating dialogue, strings, images, and styles."
            e ""

        # game/script.rpy:101
        translate piglatin start_9e949aac:

            # e "Pretty much everything your game needs!"
            e ""


        # game/script.rpy:95
        translate piglatin start_636ae3f5:
            # e "Thank you for taking a look at the Ren'Py translation framework."
            e "Ankthay ouyay orfay akingtay away ooklay atway ethay En'Pyray anslationtray ameworkfray."

        # game/script.rpy:99
        translate piglatin start_bd1ad9e1:

            # e "We aim to provide a comprehensive framework for translating dialogue, strings, images, and styles."
            e "Eway aimway otay ovidepray away omprehensivecay ameworkfray orfay anslatingtray ialogueday, ingsstray, imagesway, andway ylesstay."

        # game/script.rpy:101
        translate piglatin start_9e949aac:

            # e "Pretty much everything your game needs!"
            e "Ettypray uchmay everythingway ouryay amegay eedsnay!"

        # game/script.rpy:99
        translate piglatin start_bd1ad9e1:
            # e "We aim to provide a comprehensive framework for translating dialogue, strings, images, and styles."
            e "Eway aimway otay ovidepray away omprehensivecay ameworkfray..."
            e "...orfay anslatingtray ialogueday, ingsstray, imagesway, andway ylesstay."

        # game/script.rpy:101
        translate piglatin start_9e949aac:

            # e "Pretty much everything your game needs!"
            pass

        e "You scored [points] points!"

        # game/script.rpy:103
        translate piglatin start_36562aba:

            # e "You scored [points] points!"
            $ latin_points = to_roman_numerals(points)
            e "Ouyay oredscay [latin_points] ointspay!"

        translate None mylabel_03ac197e_1:
            "..."

        label ignored_by_translation hide:
            "..."

        define e = Character(_("Eileen"))

        menu:
            "Go West":
                # ...

            "Head East":
                # ...

        translate piglatin strings:

            old "Eileen"
            new "Eileenway"

            old "Go West"
            new "Ogay Estway"

            old "Head East"
            new "Eadhay Eastway"

        translate None strings:
            old "Start Game"
            new "Artstay Amegay"


        if mood_points > 5:
            $ mood = _("great")
        else:
            $ mood = _("awful")

        "I'm feeling [mood!t]."

        translate piglatin style default:
            font "stonecutter.ttf"

        translate piglatin python:
            style.default.font = "stonecutter.ttf"

            old "These two lines will be combined together to form a long line.\n\nThis line will be separate."
            new _p("""
                These two lines will be combined together
                to form a long line. Bork bork bork.

                This line will be separate. Bork bork bork.
                """)

        frame:
            style_prefix "pref"
            has vbox

            label _("Language")
            textbutton "English" action Language(None)
            textbutton "Igpay Atinlay" action Language("piglatin")

        define config.about = _p("""
            These two lines will be combined together
            to form a long line.

            This line will be separate.
            """)

        

    #endregion Translation

    #region Displayables
        # see https://www.renpy.org/doc/html/displayables.html

        # These two lines are equivalent.
        image logo = "logo.png"
        image logo = Image("logo.png")

        # Using Image allows us to specify a default position as part of
        # an image.
        image logo right = Image("logo.png", xalign=1.0)

        image eileen composite = Composite(
            (300, 600),
            (0, 0), "body.png",
            (0, 0), "clothes.png",
            (50, 50), "expression.png")

        image eileen cropped = Crop((0, 0, 300, 300), "eileen happy")

        # Resize the background of the text window if it's too small.
        init python:
            style.window.background = Frame("frame.png", 10, 10)

        image logo spaced = HBox("logo.png", Null(width=100), "logo.png")

        image white = Solid("#fff")

        image bg tile = Tile("bg.png")

        image jill = ConditionSwitch(
            "jill_beers > 4", "jill_drunk.png",
            "True", "jill_sober.png")

        image emotion_indicator = ShowingSwitch(
            "eileen concerned", "emotion_indicator concerned",
            "eileen vhappy", "emotion_indicator vhappy",
            None, "emotion_indicator happy")

        transform birds_transform:
            xpos -200
            linear 10 xpos 800
            pause 20
            repeat

        image birds = At("birds.png", birds_transform)

        # Display two logos, to the left and right of each other.
        image logo hbox = HBox("logo.png", "logo.png")

        # Display two logos, one on top of the other.
        image logo vbox = VBox("logo.png", "logo.png")

        # Display two logos. Since both default to the upper-left
        # corner of the screen, we need to use Image to place
        # those logos on the screen.
        image logo fixed = Fixed(
            Image("logo.png", xalign=0.0, yalign=0.0),
            Image("logo.png", xalign=1.0, yalign=1.0))

        # By default, the girl placeholder will be used.
        image sue = Placeholder("boy")

        label start:
            show sue angry
            "Sue" "How do you do? Now you gonna die!"

        init -10 python:
            def embiggen(s):
                return Transform(s, zoom=2)

            config.displayable_prefix["big"] = embiggen

        image eileen big = "big:eileen happy"
    #endregion Displayables

    #region Transforms
        # see https://www.renpy.org/doc/html/transforms.html
        show eileen happy at right
        show eileen happy at halfsize, right
    #endregion Transforms

    #region Transitions
        # see https://www.renpy.org/doc/html/transitions.html
        show bg washington
        with dissolve

        # A very long dissolve.
        with Dissolve(10.0)

        define annoytheuser = Dissolve(1.0)

        label start:
            show bg washington
            with annoytheuser

        # Move the images in and out while dissolving. (This is a fairly expensive transition.)
        define moveinoutdissolve = ComposeTransition(dissolve, before=moveoutleft, after=moveinright)

        define wiperight = CropMove(1.0, "wiperight")
        define wipeleft = CropMove(1.0, "wipeleft")
        define wipeup = CropMove(1.0, "wipeup")
        define wipedown = CropMove(1.0, "wipedown")

        define slideright = CropMove(1.0, "slideright")
        define slideleft = CropMove(1.0, "slideleft")
        define slideup = CropMove(1.0, "slideup")
        define slidedown = CropMove(1.0, "slidedown")

        define slideawayright = CropMove(1.0, "slideawayright")
        define slideawayleft = CropMove(1.0, "slideawayleft")
        define slideawayup = CropMove(1.0, "slideawayup")
        define slideawaydown = CropMove(1.0, "slideawaydown")

        define irisout = CropMove(1.0, "irisout")
        define irisin = CropMove(1.0, "irisin")

        # Fade to black and back.
        define fade = Fade(0.5, 0.0, 0.5)

        # Hold at black for a bit.
        define fadehold = Fade(0.5, 1.0, 0.5)

        # Camera flash - quickly fades to white, then back to the scene.
        define flash = Fade(0.1, 0.0, 0.5, color="#fff")

        define circirisout = ImageDissolve("circiris.png", 1.0)
        define circirisin = ImageDissolve("circiris.png", 1.0, reverse=True)
        define circiristbigramp = ImageDissolve("circiris.png", 1.0, ramplen=256)

        define logodissolve = MultipleTransition([
            False, Dissolve(0.5),
            "logo.jpg", Pause(1.0),
            "logo.jpg", dissolve,
            True])

        define pushright = PushMove(1.0, "pushright")
        define pushleft = PushMove(1.0, "pushleft")
        define pushup = PushMove(1.0, "pushup")
        define pushdown = PushMove(1.0, "pushdown")

        # This defines all of the pre-defined transitions beginning
        # with "move".
        init python:
            define.move_transitions("move", 0.5)

        define dis = { "master" : Dissolve(1.0) }

        show eileen happy
        with dis

        e "Hello, world."

        define config.window_show_transition = { "screens" : Dissolve(.25) }
        define config.window_hide_transition = { "screens" : Dissolve(.25) }
    #endregion Transitions

    #region ATL
        # see https://www.renpy.org/doc/html/atl.html
        label start:
            transform left_to_right:
                xalign 0.0
                linear 2.0 xalign 1.0
                repeat

            image eileen animated:
                "eileen_happy.png"
                pause 1.0
                "eileen_vhappy.png"
                pause 1.0
                repeat

            scene bg washington:
                zoom 2.0

            show eileen happy:
                xalign 1.0

            show logo base:
                # Show the logo at the upper right side of the screen.
                xalign 1.0 yalign 0.0

                # Take 1.0 seconds to move things back to the left.
                linear 1.0 xalign 0.0

                # Take 1.0 seconds to move things to the location specified in the
                # truecenter transform. Use the ease warper to do this.
                ease 1.0 truecenter

                # Just pause for a second.
                pause 1.0

                # Set the location to circle around.
                alignaround (.5, .5)

                # Use circular motion to bring us to spiral out to the top of
                # the screen. Take 2 seconds to do so.
                linear 2.0 yalign 0.0 clockwise circles 3

                # Use a spline motion to move us around the screen.
                linear 2.0 align (0.5, 1.0) knot (0.0, .33) knot (1.0, .66)

            image backgrounds:
                "bg band"
                time 2.0
                "bg whitehouse"
                time 4.0
                "bg washington"

            image atl example:
                # Display logo_base.png
                "logo_base.png"

                # Pause for 1.0 seconds.
                1.0

                # Show logo_bw.png, with a dissolve.
                "logo_bw.png" with Dissolve(0.5, alpha=True)

                # Run the move_right transform.
                move_right

            show logo base:
                xalign 0.0
                linear 1.0 xalign 1.0
                linear 1.0 xalign 0.0
                repeat

            show logo base:
                alpha 0.0 xalign 0.0 yalign 0.0
                linear 1.0 alpha 1.0

                block:
                    linear 1.0 xalign 1.0
                    linear 1.0 xalign 0.0
                    repeat

            image eileen random:
                choice:
                    "eileen happy"
                choice:
                    "eileen vhappy"
                choice:
                    "eileen concerned"

                pause 1.0
                repeat

            show logo base:
                parallel:
                    xalign 0.0
                    linear 1.3 xalign 1.0
                    linear 1.3 xalign 0.0
                    repeat
                parallel:
                    yalign 0.0
                    linear 1.6 yalign 1.0
                    linear 1.6 yalign 0.0
                    repeat

            show logo base:
                on show:
                    alpha 0.0
                    linear .5 alpha 1.0
                on hide:
                    linear .5 alpha 0.0

            transform pulse_button:
                on hover, idle:
                    linear .25 zoom 1.25
                    linear .25 zoom 1.0

            transform an_animation:
                "1.png"
                pause 2
                "2.png"
                pause 2
                repeat

            image move_an_animation:
                contains an_animation

                # If we didn't use contains, we'd still be looping and
                # would never reach here.
                xalign 0.0
                linear 1.0 yalign 1.0

            image test double:
                contains:
                    "logo.png"
                    xalign 0.0
                    linear 1.0 xalign 1.0
                    repeat

                contains:
                    "logo.png"
                    xalign 1.0
                    linear 1.0 xalign 0.0
                    repeat

            init python:
                def slide_function(trans, st, at):
                    if st > 1.0:
                        trans.xalign = 1.0
                        return None
                    else:
                        trans.xalign = st
                        return 0

        label start:
            show logo base:
                function slide_function
                pause 1.0
                repeat

            image eileen happy moving:
                animation
                "eileen happy"
                xalign 0.0
                linear 5.0 xalign 1.0
                repeat

            image eileen vhappy moving:
                animation
                "eileen vhappy"
                xalign 0.0
                linear 5.0 xalign 1.0
                repeat

        label start:

            show eileen happy moving
            pause
            show eileen vhappy moving
            pause

            python early hide:

                @renpy.atl_warper
                def linear(t):
                    return t

        label start:
            show eileen happy at a, b, c
            "Let's wait a bit."
            show eileen happy at d, e

            transform bounce:
                linear 3.0 xalign 1.0
                linear 3.0 xalign 0.0
                repeat

            transform headright:
                linear 15 xalign 1.0

        label example:
            show eileen happy at bounce
            pause
            show eileen happy at headright
            pause
            
    #endregion ATL

    #region Matrixcolor
        # see https://www.renpy.org/doc/html/matrixcolor.html

        define mymatrix = Matrix([ a, b, c, d,
                                e, f, g, h,
                                i, j, k, l,
                                m, n, o, p, ])

        transform swap_red_and green:
            matrixcolor Matrix([ 0.0, 1.0, 0.0, 0.0,
                                1.0, 0.0, 0.0, 0.0,
                                0.0, 0.0, 1.0, 0.0,
                                0.0, 0.0, 0.0, 1.0, ])

        transform red_blue_tint:
            matrixcolor TintMatrix("#f00")
            linear 3.0 matrixcolor TintMatrix("#00f")
            linear 3.0 matrixcolor TintMatrix("#f00")
            repeat

        python:
            class TintMatrix(ColorMatrix):
                def __init__(self, color):

                    # Store the color given as a parameter.
                    self.color = Color(color)

                def __call__(self, other, done):

                    if type(other) is not type(self):

                        # When not using an old color, we can take
                        # r, g, b, and a from self.color.
                        r, g, b = self.color.rgb
                        a = self.color.alpha

                    else:

                        # Otherwise, we have to extract from self.color
                        # and other.color, and interpolate the results.
                        oldr, oldg, oldb = other.color.rgb
                        olda = other.color.alpha
                        r, g, b = self.color.rgb
                        a = self.color.alpha

                        r = oldr + (r - oldr) * done
                        g = oldg + (g - oldg) * done
                        b = oldb + (b - oldb) * done
                        a = olda + (a - olda) * done

                    # To properly handle premultiplied alpha, the color channels
                    # have to be multiplied by the alpha channel.
                    r *= a
                    g *= a
                    b *= a

                    # Return a Matrix.
                    return Matrix([ r, 0, 0, 0,
                                    0, g, 0, 0,
                                    0, 0, b, 0,
                                    0, 0, 0, a ])
    #endregion Matrix Color

    #region Layered Images
        # see https://www.renpy.org/doc/html/layeredimage.html
        layeredimage augustina:
            always:
                "augustina_base"

            group outfit:

                attribute dress:
                    "augustina_outfit_dress"

                attribute jeans:
                    "augustina_outfit_jeans"

            group eyes:

                attribute open default:
                    "augustina_eyes_open"
                    default True

                attribute wink:
                    "augustina_eyes_wink"

            group eyebrows:

                attribute normal default:
                    "augustina_eyebrows_normal"

                attribute oneup:
                    "augustina_eyebrows_oneup"

            group mouth:

                pos (100, 100)

                attribute smile default:
                    "augustina_mouth_smile"

                attribute happy:
                    "augustina_mouth_happy"

            if evil:
                "augustina_glasses_evil"
            else:
                "augustina_glasses"

        default evil = True
        show augustina jeans
        show augustina wink
        show augustina open
        show augustina -wink

        layeredimage augustina:

            always:
                "augustina_base"

            group outfit:
                attribute dress
                attribute jeans

            group eyes:
                attribute open default
                attribute wink

            group eyebrows:
                attribute normal default
                attribute oneup

            group mouth:
                pos (100, 100)
                attribute smile default
                attribute happy

            if evil:
                "augustina_glasses_evil"
            else:
                "augustina_glasses"

        layeredimage augustina:

            always "augustina_base"

            group outfit auto

            group eyes auto:
                attribute open default

            group eyebrows auto:
                attribute normal default

            group mouth auto:
                pos (100, 100)
                attribute smile default

            if evil:
                "augustina_glasses_evil"
            else:
                "augustina_glasses"

        if glasses == "evil":
            "augustina_glasses_evil"
        elif glasses == "normal":
            "augustina_glasses"
        else:
            "augustina_nose_mark"

        layeredimage augustina sitting:
            pass

        layeredimage augustina standing:
            pass

        layeredimage side eileen:
            pass

        layeredimage side lucy:
            pass

        image dupe = LayeredImageProxy("augustina")
        image side augustina = LayeredImageProxy("augustina", Transform(crop=(0, 0, 362, 362), xoffset=-80))
    #endregion Layered Images

    #region 3D Stage
        # see https://www.renpy.org/doc/html/3dstage.html
        camera:
            perspective True

        scene bg washington

        show lucy mad at right

        show eileen happy

        scene bg washington:
            xalign 0.5 yalign 1.0 zpos -1000

        show lucy mad:
            xalign 1.0 yalign 1.0 zpos 100

        show eileen happy:
            xalign 0.5 yalign 1.0 zpos 200

        transform zbg:
            zpos -100

        transform z100:
            zpos 100

        transform z200:
            zpos 200

        scene bg washington at center, zbg

        show lucy mad at right, z100

        show eileen happy at center, z200

        transform zbg:
            zpos -100 zzoom False

        show eileen happy at center:
            zpos 0
            linear 4.0 zpos 200

        camera:
            perspective True
            xpos 0
            linear 3.0 xpos 500

        camera:
            perspective True
            rotate 45

        camera:
            perspective True
            gl_depth True

        show eileen happy at center:
            matrixtransform RotateMatrix(45, 0, 0)

        show eileen happy at center:
            matrixtransform RotateMatrix(45, 0, 0) * OffsetMatrix(0, -300, 0)

        transform xrotate:
            matrixtransform RotateMatrix(0.0, 0.0, 0.0)
            linear 4.0 matrixtransform RotateMatrix(360.0, 0.0, 0.0)
            repeat
    #endregion 3D Stage

#endregion

#region Customizing Ren'Py

    #region Styles
        # see https://www.renpy.org/doc/html/style.html
        image big hello world = Text("Hello, World", size=40)

        screen big_hello_world:
        text "Hello, World" size 40

        image big hello world = Text("Hello World", style="big")

        screen hello_world:
            text "Hello, World" style "big" at 0# Comment

        style my_text is text:
            size 40
            font "gentium.ttf"

        # Creates a new style, inheriting from default.
        style big_red:
            size 40

        # Updates the style.
        style big_red color "#f00"

        # Takes the properties of label_text from big_red, but only if we're
        # on a touch system.

        style label_text:
            variant "touch"
            take big_red

        style history_text:
            xpos gui.history_text_xpos
            ypos gui.history_text_ypos
            xanchor gui.history_text_xalign
            xsize gui.history_text_width
            min_width gui.history_text_width
            text_align gui.history_text_xalign
            layout ("subtitle" if gui.history_text_xalign else "tex")

        style history_label:
            xfill True

        style history_label_text:
            xalign 0.5

        init python:
            style.button['Foo'].background = "#f00"
            style.button['Bar'].background = "#00f"

        screen indexed_style_test:
            vbox:
                textbutton "Foo" style style.button["Foo"]
                textbutton "Bar" style style.button["Bar"]

        init python:
            renpy.register_style_preference("text", "decorated", style.say_dialogue, "outlines", [ (1, "#000", 0, 0) ])
            renpy.register_style_preference("text", "decorated", style.say_dialogue, "size", 22)

            renpy.register_style_preference("text", "large", style.say_dialogue, "outlines", [ ])
            renpy.register_style_preference("text", "large", style.say_dialogue, "size", 24)

        screen indexed_style_test:
            vbox:
                textbutton "Decorated" action StylePreference("text", "decorated")
                textbutton "Large" action StylePreference("text", "large")
    #endregion Styles

    #region Style Properties
        # see https://www.renpy.org/doc/html/style_properties.html

        # The button background is gray when insensitive, light
        # blue when hovered, and dark blue otherwise.
        style button:
            background "#006"
            insensitive_background "#444"
            hover_background "#00a"

        # The button text is yellow when selected, and white
        # otherwise.
        style button_text:
            color "#fff"
            selected_color "#ff0"

        style button:
            hover_background "[prefix_]background.png"

        style button:
            background "[prefix_]button.png"

        style button:
            idle_background "idle_button.png"
            hover_background "hover_button.png"
            insensitive_background "idle_button.png"

            selected_idle_background "idle_button.png"
            selected_hover_background "hover_button.png"
            selected_insensitive_background "idle_button.png"

        style default:
            outlines [ (absolute(1), "#000", absolute(0), absolute(0)) ]

    #endregion Style Properties

    #region Screens and Screen Language
        # see https://www.renpy.org/doc/html/screens.html
        screen say(who, what):
            window id "window":
                vbox:
                    spacing 10

                    text who id "who"
                    text what id "what"
            
        screen hello_world():
            tag example
            zorder 1
            modal False

            text "Hello, World."

        screen center_text(s, size=42):
            text s size size

        transform hello_t:
            align (0.7, 0.5) alpha 0.0
            linear 0.5 alpha 1.0

        screen hello_title():
            text "Hello." at hello_t
            text "Hello.":
                at transform:
                    align (0.2, 0.5) alpha 0.0
                    linear 0.5 alpha 1.0

        screen volume_controls():
            frame:
                has vbox

                bar value Preference("sound volume") released Play("sound", "audio/sample_sound.ogg")
                bar value Preference("music volume")
                bar value Preference("voice volume")

        screen ask_are_you_sure:
            fixed:
                text "Are you sure?" xalign 0.5 yalign 0.3
                textbutton "Yes" xalign 0.33 yalign 0.5 action Return(True)
                textbutton "No" xalign 0.66 yalign 0.5 action Return(False)

        screen test_frame():
            frame:
                xpadding 10
                ypadding 10
                xalign 0.5
                yalign 0.5

                vbox:
                    text "Display"
                    null height 10
                    textbutton "Fullscreen" action Preference("display", "fullscreen")
                    textbutton "Window" action Preference("display", "window")

        screen grid_test:
            grid 2 3:
                text "Top-Left"
                text "Top-Right"

                text "Center-Left"
                text "Center-Right"

                text "Bottom-Left"
                text "Bottom-Right"

        screen hbox_text():
            hbox:
                text "Left"
                text "Right"

        screen gui_game_menu():
            vbox xalign 1.0 yalign 1.0:
                imagebutton auto "save_%s.png" action ShowMenu('save')
                imagebutton auto "prefs_%s.png" action ShowMenu('preferences')
                imagebutton auto "skip_%s.png" action Skip()
                imagebutton auto "afm_%s.png" action Preference("auto-forward mode", "toggle")

        screen input_screen():
            window:
                has vbox

                text "Enter your name."
                input default "Joseph P. Blow, ESQ."

        screen keymap_screen():
            key "game_menu" action ShowMenu('save')
            key "p" action ShowMenu('preferences')
            key ["s", "w"] action Screenshot()

        screen display_preference():
            frame:
                has vbox

                label "Display"
                textbutton "Fullscreen" action Preference("display", "fullscreen")
                textbutton "Window" action Preference("display", "window")

        screen button_overlay():
            mousearea:
                area (0, 0, 1.0, 100)
                hovered Show("buttons", transition=dissolve)
                unhovered Hide("buttons", transition=dissolve)

        screen buttons():
            hbox:
                textbutton "Save" action ShowMenu("save")
                textbutton "Prefs" action ShowMenu("preferences")
                textbutton "Skip" action Skip()
                textbutton "Auto" action Preference("auto-forward", "toggle")

        label start:
            show screen button_overlay

        screen text_box():
            vbox:
                text "The title."
                null height 20
                text "This body text."

        screen side_test():
            side "c tl br":
                text "Center"
                text "Top-Left"
                text "Bottom-Right"

        screen hello_world():
            text "Hello, World." size 40

        screen textbutton_screen():
            vbox:
                textbutton "Wine" action Jump("wine")
                textbutton "Women" action Jump("women")
                textbutton "Song" action Jump("song")

        screen timer_test():
            vbox:
                textbutton "Yes." action Jump("yes")
                textbutton "No." action Jump("no")

            timer 3.0 action Jump("too_slow")

        screen volume_controls():
            frame:
                has hbox

                vbar value Preference("sound volume")
                vbar value Preference("music volume")
                vbar value Preference("voice volume")

        screen vbox_test():
            vbox:
                text "Top."
                text "Bottom."

        screen viewport_example():
            side "c b r":
                area (100, 100, 600, 400)

                viewport id "vp":
                    draggable True

                    add "washington.jpg"

                bar value XScrollValue("vp")
                vbar value YScrollValue("vp")

        screen vpgrid_test():
            vpgrid:

                cols 2
                spacing 5
                draggable True
                mousewheel True

                scrollbars "vertical"

                # Since we have scrollbars, we have to position the side, rather
                # than the vpgrid proper.
                side_xalign 0.5

                for i in range(1, 100):

                    textbutton "Button [i]":
                        xysize (200, 50)
                        action Return(i)

        screen say(who, what):
            window id "window"
                vbox:
                    spacing 10

                    text who id "who"
                    text what id "what"

        screen preferences():

            tag menu
            use navigation

            imagemap:
                auto "gui_set/gui_prefs_%s.png"

                hotspot (740, 232, 75, 73) action Preference("display", "fullscreen") alt _("Display Fullscreen")
                hotspot (832, 232, 75, 73) action Preference("display", "window") alt _("Display Window")
                hotspot (1074, 232, 75, 73) action Preference("transitions", "all") alt _("Transitions All")
                hotspot (1166, 232, 75, 73) action  Preference("transitions", "none") alt _("Transitions None")

                hotbar (736, 415, 161, 20) value Preference("music volume") alt _("Music Volume")
                hotbar (1070, 415, 161, 20) value Preference("sound volume") alt _("Sound Volume")
                hotbar (667, 535, 161, 20) value Preference("voice volume") alt _("Voice Volume")
                hotbar (1001, 535, 161, 20) value Preference("text speed") alt _("Text Speed")

        screen add_test():
            add "logo.png" xalign 1.0 yalign 0.0

        screen volume_controls():
            frame:
                has vbox

                bar value Preference("sound volume")
                bar value Preference("music volume")
                bar value Preference("voice volume")

        screen scheduler():
            default club = None
            vbox:
                text "What would you like to do?"
                textbutton "Art Club" action SetScreenVariable("club", "art")
                textbutton "Writing Club" action SetScreenVariable("club", "writing")

                if club:
                    textbutton "Select" action Return(club)

        $ numerals = [ 'I', 'II', 'III', 'IV', 'V' ]

        screen five_buttons():
            vbox:
                for i, numeral in enumerate(numerals):
                    textbutton numeral action Return(i + 1)

        screen five_buttons():
            vbox:
                for i, numeral index numeral in enumerate(numerals):
                    textbutton numeral action Return(i + 1)

        screen skipping_indicator():
            if config.skipping:
                text "Skipping."
            else:
                text "Not Skipping."

        screen preferences():
            frame:
                has hbox

                text "Display"
                textbutton "Fullscreen" action Preferences("display", "fullscreen")
                textbutton "Window" action Preferences("display", "window")

            on "show" action Show("navigation")
            on "hide" action Hide("navigation")

        screen file_slot(slot):
            button:
                action FileAction(slot)

                has hbox

                add FileScreenshot(slot)
                vbox:
                    text FileTime(slot, empty="Empty Slot.")
                    text FileSaveName(slot)


        screen save():
            grid 2 5:
                for i in range(1, 11):
                    use file_slot(i)

        transform t1():
            xpos 150
            linear 1.0 xpos 0

        screen common():
            text "Test" at t1

        screen s1():
            tag s
            use common id "common"
            text "s1" ypos 100

        screen s2():
            tag s
            use common id "common"
            text "s2" ypos 100

        label start:
            show screen s1
            pause
            show screen s2
            pause
            return

        screen ed(num):
            text "Ed"
            text "Captain"

        screen kelly(num):
            text "Kelly"
            text "First Officer"

        screen bortus(num):
            text "Bortus"
            text "Second Officer"

        screen crew():
            hbox:
                for i, member in enumerate(party):
                    vbox:
                        use expression member.screen pass (i + 1)

        screen movable_frame(pos):
            drag:
                pos pos

                frame:
                    background Frame("movable_frame.png", 10, 10)
                    top_padding 20

                    transclude

        screen test:
            use movable_frame((0, 0)):
                text "You can drag me."

            use movable_frame((0, 100)):
                vbox:
                    text "You can drag me too."
                    textbutton "Got it!" action Return(True)

        screen python_screen:
            python:
                test_name = "Test %d" % test_number

            text test_name

            $ test_label = "test_%d" % test_label

            textbutton "Run Test" action Jump(test_label)

        transform cd_transform:
            # This is run before appear, show, or hide.
            xalign 0.5 yalign 0.5 alpha 0.0

            on appear:
                alpha 1.0
            on show:
                zoom .75
                linear .25 zoom 1.0 alpha 1.0
            on hide:
                linear .25 zoom 1.25 alpha 0.0

        screen countdown():
            default n = 3

            vbox:
                textbutton "3" action SetScreenVariable("n", 3)
                textbutton "2" action SetScreenVariable("n", 2)
                textbutton "1" action SetScreenVariable("n", 1)
                textbutton "0" action SetScreenVariable("n", 0)

            showif n == 3:
                text "Three" size 100 at cd_transform
            elif n == 2:
                text "Two" size 100 at cd_transform
            elif n == 1:
                text "One" size 100 at cd_transform
            else:
                text "Liftoff!" size 100 at cd_transform

        label start:
            call screen countdown

        show screen overlay_screen
        show screen clock_screen(hour=11, minute=30)

        if rare_case:
            show rare_screen nopredict

        show screen clock_screen with dissolve

        hide screen rare_screen
        hide screen clock_screen with dissolve
        hide screen overlay_screen

        call screen my_imagemap

        call screen my_screen(side_effect_function()) nopredict

        # Shows the screen with dissolve
        call screen my_other_screen with dissolve
        # The screens instantly hides with None, then the pixellate transition executes
        with pixellate

        # Shows the screen with dissolve and hides it with pixellate.
        call screen my_other_screen(_with_none=False) with dissolve
        with pixellate

        # A variant hello_world screen, used on small touch-based
        # devices.
        screen hello_world():
            tag example
            zorder 1
            modal False
            variant "small"

            text "Hello, World." size 30
    #endregion Screens and Screen Language

    #region Screen Actions, Values, and Functions
        # see https://www.renpy.org/doc/html/screen_actions.html

        screen hello_world():
            # The button is selected only if mars_flag is True
            textbutton "Marsopolis":
                action [ SelectedIf(SetVariable("mars_flag", True)), SetVariable("on_mars", True) ]

            # The button is sensitive only if mars_flag is True
            textbutton "Marsopolis":
                action [ SensitiveIf(SetVariable("mars_flag", True)), SetVariable("on_mars", True) ]

        screen tooltip_example():
            vbox:
                textbutton "North":
                    action Return("n")
                    tooltip "To meet a polar bear."

                textbutton "South":
                    action Return("s")
                    tooltip "All the way to the tropics."

                textbutton "East":
                    action Return("e")
                    tooltip "So we can embrace the dawn."

                textbutton "West":
                    action Return("w")
                    tooltip "Where to go to see the best sunsets."

                $ tooltip = GetTooltip()

                if tooltip:
                    text "[tooltip]"

        screen tooltip_test:

            default tt = Tooltip("No button selected.")

            frame:
                xfill True

                has vbox

                textbutton "One.":
                    action Return(1)
                    hovered tt.Action("The loneliest number.")

                textbutton "Two.":
                    action Return(2)
                    hovered tt.Action("Is what it takes.")

                textbutton "Three.":
                    action Return(3)
                    hovered tt.Action("A crowd.")

                text tt.value
    #endregion Screen Actions, Values, and Functions

    #region Special Screen Names
        # see https://www.renpy.org/doc/html/screen_special.html

        screen say(who, what):

            window id "window":
                has vbox

                if who:
                    text who id "who"

                text what id "what"

        screen choice(items):

            window:
                style "menu_window"

                vbox:
                    style "menu"

                    for i in items:

                        if i.action:

                            button:
                                action i.action
                                style "menu_choice_button"

                                text i.caption style "menu_choice"

                        else:
                            text i.caption style "menu_caption"

        screen input(prompt):

            window:
                has vbox

                text prompt
                input id "input"

        screen nvl(dialogue, items=None):

            window:
                style "nvl_window"

                has vbox:
                    style "nvl_vbox"

                # Display dialogue.
                for d in dialogue:
                    window:
                        id d.window_id

                        has hbox:
                            spacing 10

                        if d.who is not None:
                            text d.who id d.who_id

                        text d.what id d.what_id

                # Display a menu, if given.
                if items:

                    vbox:
                        id "menu"

                        for i in items:

                            if action:

                                button:
                                    style "nvl_menu_choice_button"
                                    action i.action

                                    text i.caption style "nvl_menu_choice"

                            else:

                                text i.caption style "nvl_dialogue"

        screen notify(message):
            zorder 100

            text message at _notify_transform

            # This controls how long it takes between when the screen is
            # first shown, and when it begins hiding.
            timer 3.25 action Hide('notify')

        transform _notify_transform:
            # These control the position.
            xalign .02 yalign .015

            # These control the actions on show and hide.
            on show:
                alpha 0
                linear .25 alpha 1.0
            on hide:
                linear .5 alpha 0.0

        screen skip_indicator():

            zorder 100

            text _("Skipping")

        screen ctc(arg=None):

            zorder 100

            text _("Click to Continue"):
                size 12
                xalign 0.98
                yalign 0.98

        screen main_menu():

            # This ensures that any other menu screen is replaced.
            tag menu

            # The background of the main menu.
            window:
                style "mm_root"

            # The main menu buttons.
            frame:
                style_prefix "mm"
                xalign .98
                yalign .98

                has vbox

                textbutton _("Start Game") action Start()
                textbutton _("Load Game") action ShowMenu("load")
                textbutton _("Preferences") action ShowMenu("preferences")
                textbutton _("Help") action Help()
                textbutton _("Quit") action Quit(confirm=False)

        style mm_button:
            size_group "mm"

        screen navigation():

            # The background of the game menu.
            window:
                style "gm_root"

            # The various buttons.
            frame:
                style_prefix "gm_nav"
                xalign .98
                yalign .98

                has vbox

                textbutton _("Return") action Return()
                textbutton _("Preferences") action ShowMenu("preferences")
                textbutton _("Save Game") action ShowMenu("save")
                textbutton _("Load Game") action ShowMenu("load")
                textbutton _("Main Menu") action MainMenu()
                textbutton _("Help") action Help()
                textbutton _("Quit") action Quit()

        style gm_nav_button:
            size_group "gm_nav"

        screen save():

            # This ensures that any other menu screen is replaced.
            tag menu

            use navigation

            frame:
                has vbox

                # The buttons at the top allow the user to pick a
                # page of files.
                hbox:
                    textbutton _("Previous") action FilePagePrevious()
                    textbutton _("Auto") action FilePage("auto")

                    for i in range(1, 9):
                        textbutton str(i) action FilePage(i)

                    textbutton _("Next") action FilePageNext()

                # Display a grid of file slots.
                grid 2 5:
                    transpose True
                    xfill True

                    # Display ten file slots, numbered 1 - 10.
                    for i in range(1, 11):

                        # Each file slot is a button.
                        button:
                            action FileAction(i)
                            xfill True
                            style "large_button"

                            has hbox

                            # Add the screenshot and the description to the
                            # button.
                            add FileScreenshot(i)
                            text ( " %2d. " % i
                                + FileTime(i, empty=_("Empty Slot."))
                                + "\n"
                                + FileSaveName(i)) style "large_button_text"

        screen load():

            # This ensures that any other menu screen is replaced.
            tag menu

            use navigation

            frame:
                has vbox

                # The buttons at the top allow the user to pick a
                # page of files.
                hbox:
                    textbutton _("Previous") action FilePagePrevious()
                    textbutton _("Auto") action FilePage("auto")

                    for i in range(1, 9):
                        textbutton str(i) action FilePage(i)

                    textbutton _("Next") action FilePageNext()

                # Display a grid of file slots.
                grid 2 5:
                    transpose True
                    xfill True

                    # Display ten file slots, numbered 1 - 10.
                    for i in range(1, 11):

                        # Each file slot is a button.
                        button:
                            action FileAction(i)
                            xfill True
                            style "large_button"

                            has hbox

                            # Add the screenshot and the description to the
                            # button.
                            add FileScreenshot(i)
                            text ( " %2d. " % i
                                + FileTime(i, empty=_("Empty Slot."))
                                + "\n"
                                + FileSaveName(i)) style "large_button_text"

        screen preferences():

            tag menu

            # Include the navigation.
            use navigation

            # Put the navigation columns in a three-wide grid.
            grid 3 1:
                style_prefix "prefs"
                xfill True

                # The left column.
                vbox:
                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Display")
                        textbutton _("Window") action Preference("display", "window")
                        textbutton _("Fullscreen") action Preference("display", "fullscreen")

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Transitions")
                        textbutton _("All") action Preference("transitions", "all")
                        textbutton _("None") action Preference("transitions", "none")

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Text Speed")
                        bar value Preference("text speed")

                    frame:
                        style_prefix "pref"
                        has vbox

                        textbutton _("Joystick...") action ShowMenu("joystick_preferences")

                vbox:

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Skip")
                        textbutton _("Seen Messages") action Preference("skip", "seen")
                        textbutton _("All Messages") action Preference("skip", "all")

                    frame:
                        style_prefix "pref"
                        has vbox

                        textbutton _("Begin Skipping") action Skip()

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("After Choices")
                        textbutton _("Stop Skipping") action Preference("after choices", "stop")
                        textbutton _("Keep Skipping") action Preference("after choices", "skip")

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Auto-Forward Time")
                        bar value Preference("auto-forward time")

                vbox:

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Music Volume")
                        bar value Preference("music volume")

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Sound Volume")
                        bar value Preference("sound volume")
                        textbutton "Test" action Play("sound", "sound_test.ogg") style "soundtest_button"

                    frame:
                        style_prefix "pref"
                        has vbox

                        label _("Voice Volume")
                        bar value Preference("voice volume")
                        textbutton "Test" action Play("voice", "voice_test.ogg") style "soundtest_button"

        style pref_frame:
            xfill True
            xmargin 5
            top_margin 5

        style pref_vbox:
            xfill True

        style pref_button:
            size_group "pref"
            xalign 1.0

        style pref_slider:
            xmaximum 192
            xalign 1.0

        style soundtest_button:
            xalign 1.0

        screen confirm(message, yes_action, no_action):

            modal True

            window:
                style "gm_root"

            frame:
                style_prefix "confirm"

                xfill True
                xmargin 50
                ypadding 25
                yalign .25

                vbox:
                    xfill True
                    spacing 25

                    text _(message):
                        text_align 0.5
                        xalign 0.5

                    hbox:
                        spacing 100
                        xalign .5
                        textbutton _("Yes") action yes_action
                        textbutton _("No") action no_action
    #endregion Special Screen Names

    #region Screen Language Optimization
        # see https://www.renpy.org/doc/html/screen_optimization.html

        screen test():
            vbox:
                for i in range(10):
                    text "[i]"
            
        screen test:
            vbox:
                for i in range(10):
                    text "[i]"

        python:
            class TargetShip(Action):
                def __init__(self, ship):
                    self.ship = ship

                def __eq__(self, other):
                    if not isinstance(other, TargetShip):
                        return False

                    return self.ship is other.ship

                def __call__(self):
                    global target
                    target = self.ship

        define GRID_WIDTH = 20
        define GRID_HEIGHT = 10

        screen mood_picker():
            hbox:
                xalign 1.0
                yalign 0.0

                textbutton "Happy" action SetVariable("mood", "happy")
                textbutton "Sad" action SetVariable("mood", "sad")
                textbutton "Angry" action SetVariable("mood", "angry")

            $ t = "Hello, world."
            text "[t]"

            $ t = "Hello, world."
            text t

            $ t = "Hello, world."
            text "%s" % t
            text _("Your score is: [score]")

            $ who = "Jane"
            $ t = "Hello, [who]!"
            text 'Then I told her, "[t!i]"'
    #endregion Screen Language Optimization

    #region Configuration Variables
        # see https://www.renpy.org/doc/html/config.html

        init python:

            # Use a widescreen resolution.
            config.screen_width = 1024
            config.screen_height = 600

        init python:
            config.font_replacement_map["Vera.ttf", False, True] = ("VeraIt.ttf", False, False)

            def replace_text(s):
                s = s.replace("'", u'\u2019') # apostrophe
                s = s.replace('--', u'\u2014') # em dash
                s = s.replace('...', u'\u2026') # ellipsis
                return s
            config.replace_text = replace_text

            def say_arguments_callback(who, interact=True, color="#fff"):
                return (), { "interact" : interact, "what_color" : color }

            config.say_arguments_callback = say_arguments_callback

        init python:

            def force_integer_multiplier(width, height):
                multiplier = min(width / config.screen_width, height / config.screen_height)
                multiplier = max(int(multiplier), 1)
                return (multiplier * config.screen_width, multiplier * config.screen_height)

            config.adjust_view_size = force_integer_multiplier

    #endregion Configuration Variables

    #region Preference Variables
        # see https://www.renpy.org/doc/html/preferences.html

        default preferences.text_cps = 142

    #endregion Preference Variables

    #region Store Variables
        # see https://www.renpy.org/doc/html/store_variables.html
        "Eileen" "Hello, world."

        $ temp_char = Character("Eileen", kind=name_only)
        temp_char "Hello, world."

        "Hello, world."
        narrator "Hello, world."

    #endregion Store Variables

    #region Custom Mouse Cursors
        # see https://www.renpy.org/doc/html/mouse.html

        define config.mouse = { }
        define config.mouse['default'] = [ ( "gui/arrow.png", 0, 0) ]
        define config.mouse['spin' ] = [
            ( "gui/spin0.png", 7, 7 ),
            ( "gui/spin1.png", 7, 7 ),
            ( "gui/spin2.png", 7, 7 ),
            ( "gui/spin3.png", 7, 7 ),
            ( "gui/spin4.png", 7, 7 ),
            ( "gui/spin5.png", 7, 7 ),
            ( "gui/spin6.png", 7, 7 ),
            ( "gui/spin7.png", 7, 7 ),
        ]

        image "mouse spin":
            "gui/spin0.png"
            rotate 0.0
            linear 1.0 rotate 360.0

            # Pause so image prediction can happen.
            pause 1.0

            repeat

        define config.mouse_displayable = MouseDisplayable(
            "gui/arrow.png", 0, 0).add("spin", "spin mouse", 9.9, 9.9)

        screen test():
            textbutton "Mouse Test" action NullAction() mouse "spin"

        $ default_mouse = "spin"

    #endregion Custom Mouse Cursors

#endregion Customizing Ren'Py

#region Tools

    # see https://www.renpy.org/doc/html/developer_tools.html

    #region Interactive Director
        # see https://www.renpy.org/doc/html/director.html

        define config.voice_filename_format = "v/{filename}.ogg"

        init python in director:

            def audio_code_to_filename(channel, code):
                """
                This converts the name of an audio filename as seen in the code,
                to the filename as seen on disk.
                """

                if channel == "voice":
                    return "v/" + code + ".ogg"

                return code

            def audio_filename_to_code(channel, fn):
                """
                This converts the name of an audio filename on disk to the filename
                as seen in code.
                """

                if channel == "voice":
                    return fn.replace("v/", "").replace(".ogg", "")

                return fn

            def audio_filename_to_display(channel, fn):
                """
                This converts the audio filename as seen on disk so it can be
                presented to the creator.
                """

                if channel == "voice":
                    return fn.replace("v/", "").replace(".ogg", "")

                return fn

    #endregion Interactive Director

#endregion Tools

#region Other Functionality

    #region NVL-Mode Tutorial
        # see https://www.renpy.org/doc/html/nvl_mode.html
        define s = Character('Sylvie', kind=nvl, color="#c8ffc8")
        define m = Character('Me', kind=nvl, color="#c8c8ff")
        define narrator = nvl_narrator
        label start:
            "I'll ask her..."

            m "Um... will you..."
            m "Will you be my artist for a visual novel?"

            nvl clear

            "Silence."
            "She is shocked, and then..."

            s "Sure, but what is a \"visual novel?\""

            nvl clear

            s """
            This is one block of text in monologue mode.

            This is a second block, on the same page as the first.

            {clear}

            The page just cleared!
            """

        # To access this alternate menu presentation, write:
        define menu = nvl_menu

        menu (nvl=True):
            "I prefer NVL-mode.":
                pass

            "ADV-mode is more for me.":
                pass

        init python:
            config.empty_window = nvl_show_core
            config.window_hide_transition = dissolve
            config.window_show_transition = dissolve

        label meadow:

            nvl clear

            window hide
            scene bg meadow
            with fade
            window show

            "We reached the meadows just outside our hometown. Autumn was so 
            beautiful here."
            "When we were children, we often played here."

            m "Hey... ummm..."

            window hide
            show sylvie smile
            with dissolve
            window show

            "She turned to me and smiled."
            "I'll ask her..."
            m "Ummm... will you..."
            m "Will you be my artist for a visual novel?"
    #endregion

    #region Text Input
        # see https://www.renpy.org/doc/html/input.html
        define pov = Character("[povname]")

        python:
            povname = renpy.input("What is your name?", length=32)
            povname = povname.strip()

            if not povname:
                povname = "Pat Smith"

        pov "My name is [povname]!"
    #endregion Text Input

    #region Side Images
        # see https://www.renpy.org/doc/html/side_image.html
        define e = Character("Eileen", image="eileen")

        define e = Character("Eileen", image="eileen")

        image eileen happy = "eileen_happy.png"
        image eileen concerned = "eileen_concerned.png"

        image side eileen happy = "side_eileen_happy.png"
        image side eileen = "side_eileen.png"

        label start:

            show eileen happy

            e "Let's call this line Point A."

            e concerned "And this one is point B."

        define p = Character("Player", image="player")

        image side player happy = "side_player_happy.png"
        image side player concerned = "side_player_concerned.png"

        label start:

            p happy "This is shown with the 'side player happy' image."

            p "This is also shown with 'side player happy'."

            p concerned "This is shown with 'side player concerned'."

        define e = Character("Eileen", image="eileen")

        init python:
            config.side_image_tag = "eileen"

        transform change_transform(old, new):
            contains:
                old
                yalign 1.0
                xpos 0.0 xanchor 0.0
                linear 0.2 xanchor 1.0
            contains:
                new
                yalign 1.0
                xpos 0.0 xanchor 1.0
                linear 0.2 xanchor 0.0

        define config.side_image_change_transform = change_transform

        transform same_transform(old, new):
            old
            new with Dissolve(0.2, alpha=True)

        define config.side_image_same_transform = same_transform

        style window:
            left_padding 150

        $ renpy.set_tag_attributes("lucy mad")
        $ renpy.say(l, "I'm rather cross.")

        l mad "I'm rather cross."
    #endregion Side Images

    #region Image Gallery, Music Room, and Replay Actions
        # see https://www.renpy.org/doc/html/rooms.html

        init python:

            # Step 1. Create the gallery object.
            g = Gallery()

            # Step 2. Add buttons and images to the gallery.

            # A button with an image that is always unlocked.
            g.button("title")
            g.image("title")

            # A button that contains an image that automatically unlocks.
            g.button("dawn")
            g.image("dawn1")
            g.unlock("dawn1")

            # This button has multiple images assocated with it. We use unlock_image
            # so we don't have to call both .image and .unlock. We also apply a
            # transform to the first image.
            g.button("dark")
            g.unlock_image("bigbeach1")
            g.transform(slowpan)
            g.unlock_image("beach1 mary")
            g.unlock_image("beach2")
            g.unlock_image("beach3")

            # This button has a condition associated with it, allowing the game
            # to choose which images unlock.
            g.button("end1")
            g.condition("persistent.unlock_1")
            g.image("transfer")
            g.image("moonpic")
            g.image("girlpic")
            g.image("nogirlpic")
            g.image("bad_ending")

            g.button("end2")
            g.condition("persistent.unlock_2")
            g.image("library")
            g.image("beach1 nomoon")
            g.image("bad_ending")

            # The last image in this button has an condition associated with it,
            # so it will only unlock if the user gets both endings.
            g.button("end3")
            g.condition("persistent.unlock_3")
            g.image("littlemary2")
            g.image("littlemary")
            g.image("good_ending")
            g.condition("persistent.unlock_3 and persistent.unlock_4")

            g.button("end4")
            g.condition("persistent.unlock_4")
            g.image("hospital1")
            g.image("hospital2")
            g.image("hospital3")
            g.image("heaven")
            g.image("white")
            g.image("good_ending")
            g.condition("persistent.unlock_3 and persistent.unlock_4")

            # The final two buttons contain images that show multiple pictures
            # at the same time. This can be used to compose character art onto
            # a background.
            g.button("dawn mary")
            g.unlock_image("dawn1", "mary dawn wistful")
            g.unlock_image("dawn1", "mary dawn smiling")
            g.unlock_image("dawn1", "mary dawn vhappy")

            g.button("dark mary")
            g.unlock_image("beach2", "mary dark wistful")
            g.unlock_image("beach2", "mary dark smiling")
            g.unlock_image("beach2", "mary dark vhappy")

            # The transition used when switching images.
            g.transition = dissolve

        # Step 3. The gallery screen we use.
        screen gallery:

            # Ensure this replaces the main menu.
            tag menu

            # The background.
            add "beach2"

            # A grid of buttons.
            grid 3 3:

                xfill True
                yfill True

                # Call make_button to show a particular button.
                add g.make_button("dark", "gal-dark.png", xalign=0.5, yalign=0.5)
                add g.make_button("dawn", "gal-dawn.png", xalign=0.5, yalign=0.5)
                add g.make_button("end1", "gal-end1.png", xalign=0.5, yalign=0.5)

                add g.make_button("end2", "gal-end2.png", xalign=0.5, yalign=0.5)
                add g.make_button("end3", "gal-end3.png", xalign=0.5, yalign=0.5)
                add g.make_button("end4", "gal-end4.png", xalign=0.5, yalign=0.5)

                add g.make_button("dark mary", "gal-dark_mary.png", xalign=0.5, yalign=0.5)
                add g.make_button("dawn mary", "gal-dawn_mary.png", xalign=0.5, yalign=0.5)
                add g.make_button("title", "title.png", xalign=0.5, yalign=0.5)


                # The screen is responsible for returning to the main menu. It could also
                # navigate to other gallery screens.
                textbutton "Return" action Return() xalign 0.5 yalign 0.5

                textbutton "Gallery" action ShowMenu("gallery")

        init python:

            # Step 1. Create a MusicRoom instance.
            mr = MusicRoom(fadeout=1.0)

            # Step 2. Add music files.
            mr.add("track1.ogg", always_unlocked=True)
            mr.add("track2.ogg")
            mr.add("track3.ogg")


        # Step 3. Create the music room screen.
        screen music_room:

            tag menu

            frame:
                has vbox

                # The buttons that play each track.
                textbutton "Track 1" action mr.Play("track1.ogg")
                textbutton "Track 2" action mr.Play("track2.ogg")
                textbutton "Track 3" action mr.Play("track3.ogg")

                null height 20

                # Buttons that let us advance tracks.
                textbutton "Next" action mr.Next()
                textbutton "Previous" action mr.Previous()

                null height 20

                # The button that lets the user exit the music room.
                textbutton "Main Menu" action ShowMenu("main_menu")

            # Start the music playing on entry to the music room.
            on "replace" action mr.Play()

            # Restore the main menu music upon leaving.
            on "replaced" action Play("music", "track1.ogg")
            textbutton "Music Room" action ShowMenu("music_room")

        "And finally, I met the wizard himself."

        label meaning_of_life:

            scene

            "Mage" "What is the meaning of life, you say?"

            "Mage" "I've thought about it long and hard. A long time, I've
                    spent pondering that very thing."

            "Mage" "And I'll say - the answer - the meaning of life
                    itself..."

            "Mage" "Is forty-three."

            $ renpy.end_replay()

            "Mage" "Something like that, anyway."

        textbutton "The meaning of life" action Replay("meaning_of_life")

    #endregion Image Gallery, Music Room, and Replay Actions

    #region Drag and Drop
        # see https://www.renpy.org/doc/html/drag_drop.html

        screen say:

            drag:
                drag_name "say"
                yalign 1.0
                drag_handle (0, 0, 1.0, 30)

                xalign 0.5

                window id "window":
                    # Ensure that the window is smaller than the screen.
                    xmaximum 600

                    has vbox

                    if who:
                        text who id "who"

                    text what id "what"

        init python:

            def detective_dragged(drags, drop):

                if not drop:
                    return

                store.detective = drags[0].drag_name
                store.city = drop.drag_name

                return True

        screen send_detective_screen:

            # A map as background.
            add "europe.jpg"

            # A drag group ensures that the detectives and the cities can be
            # dragged to each other.
            draggroup:

                # Our detectives.
                drag:
                    drag_name "Ivy"
                    child "ivy.png"
                    droppable False
                    dragged detective_dragged
                    xpos 100 ypos 100
                drag:
                    drag_name "Zack"
                    child "zack.png"
                    droppable False
                    dragged detective_dragged
                    xpos 150 ypos 100

                # The cities they can go to.
                drag:
                    drag_name "London"
                    child "london.png"
                    draggable False
                    xpos 450 ypos 140
                drag:
                    drag_name "Paris"
                    draggable False
                    child "paris.png"
                    xpos 500 ypos 280

        label send_detective:
            "We need to investigate! Who should we send, and where should they go?"

            call screen send_detective_screen

            "Okay, we'll send [detective] to [city]."

        screen snap():

            drag:
                as carmen
                draggable True
                xpos 100 ypos 100
                frame:
                    style "empty"
                    background "carmen.png"
                    xysize (100, 100)

                    vbox:
                        textbutton "London" action Function(carmen.snap, 450, 140, 1.0)
                        textbutton "Paris" action Function(carmen.snap, 500, 280, 1.0)

    #endregion Drag and Drop

    #region Sprites
        # see https://www.renpy.org/doc/html/sprites.html

        image snow = SnowBlossom("snow.png", count=100)

        init python:
            import math

            def repulsor_update(st):

                # If we don't know where the mouse is, give up.
                if repulsor_pos is None:
                    return .01

                px, py = repulsor_pos

                # For each sprite...
                for i in repulsor_sprites:

                    # Compute the vector between it and the mouse.
                    vx = i.x - px
                    vy = i.y - py

                    # Get the vector length, normalize the vector.
                    vl = math.hypot(vx, vy)
                    if vl >= 150:
                        continue

                    # Compute the distance to move.
                    distance = 3.0 * (150 - vl) / 150

                    # Move
                    i.x += distance * vx / vl
                    i.y += distance * vy / vl

                    # Ensure we stay on the screen.
                    if i.x < 2:
                        i.x = 2

                    if i.x > repulsor.width - 2:
                        i.x = repulsor.width - 2

                    if i.y < 2:
                        i.y = 2

                    if i.y > repulsor.height - 2:
                        i.y = repulsor.height - 2

                return .01

            # On an event, record the mouse position.
            def repulsor_event(ev, x, y, st):
                store.repulsor_pos = (x, y)


        label repulsor_demo:

            python:
                # Create a sprite manager.
                repulsor = SpriteManager(update=repulsor_update, event=repulsor_event)
                repulsor_sprites = [ ]
                repulsor_pos = None

                # Ensure we only have one smile displayable.
                smile = Image("smile.png")

                # Add 400 sprites.
                for i in range(400):
                    repulsor_sprites.append(repulsor.create(smile))

                # Position the 400 sprites.
                for i in repulsor_sprites:
                    i.x = renpy.random.randint(2, 798)
                    i.y = renpy.random.randint(2, 598)

                del smile
                del i

            # Add the repulsor to the screen.
            show expression repulsor as repulsor

            "..."

            hide repulsor

            # Clean up.
            python:
                del repulsor
                del repulsor_sprites
                del repulsor_pos

    #endregion Sprites

    #region Customizing the Keymap
        # see https://www.renpy.org/doc/html/keymap.html
        
        init python:
            config.keymap['dismiss'].append('t')
            config.keymap['dismiss'].remove('K_SPACE')

            config.keymap = dict(

                # Bindings present almost everywhere, unless explicitly
                # disabled.
                rollback = [ 'K_PAGEUP', 'repeat_K_PAGEUP', 'K_AC_BACK', 'mousedown_4' ],
                screenshot = [ 's', 'alt_K_s', 'alt_shift_K_s', 'noshift_K_s' ],
                toggle_afm = [ ],
                toggle_fullscreen = [ 'f', 'alt_K_RETURN', 'alt_K_KP_ENTER', 'K_F11', 'noshift_K_f' ],
                game_menu = [ 'K_ESCAPE', 'K_MENU', 'K_PAUSE', 'mouseup_3' ],
                hide_windows = [ 'mouseup_2', 'h', 'noshift_K_h' ],
                launch_editor = [ 'E', 'shift_K_e' ],
                dump_styles = [ ],
                reload_game = [ 'R', 'alt_shift_K_r', 'shift_K_r' ],
                inspector = [ 'I', 'shift_K_i' ],
                full_inspector = [ 'alt_shift_K_i' ],
                developer = [ 'shift_K_d', 'alt_shift_K_d' ],
                quit = [ ],
                iconify = [ ],
                help = [ 'K_F1', 'meta_shift_/' ],
                choose_renderer = [ 'G', 'alt_shift_K_g', 'shift_K_g' ],
                progress_screen = [ 'alt_shift_K_p', 'meta_shift_K_p', 'K_F2' ],
                accessibility = [ "K_a" ],

                # Accessibility.
                self_voicing = [ 'v', 'V', 'alt_K_v', 'K_v' ],
                clipboard_voicing = [ 'C', 'alt_shift_K_c', 'shift_K_c' ],
                debug_voicing = [ 'alt_shift_K_v', 'meta_shift_K_v' ],

                # Say.
                rollforward = [ 'mousedown_5', 'K_PAGEDOWN', 'repeat_K_PAGEDOWN' ],
                dismiss = [ 'mouseup_1', 'K_RETURN', 'K_SPACE', 'K_KP_ENTER', 'K_SELECT' ],
                dismiss_unfocused = [ ],

                # Pause.
                dismiss_hard_pause = [ ],

                # Focus.
                focus_left = [ 'K_LEFT', 'repeat_K_LEFT' ],
                focus_right = [ 'K_RIGHT', 'repeat_K_RIGHT' ],
                focus_up = [ 'K_UP', 'repeat_K_UP' ],
                focus_down = [ 'K_DOWN', 'repeat_K_DOWN' ],

                # Button.
                button_ignore = [ 'mousedown_1' ],
                button_select = [ 'mouseup_1', 'K_RETURN', 'K_KP_ENTER', 'K_SELECT' ],
                button_alternate = [ 'mouseup_3' ],
                button_alternate_ignore = [ 'mousedown_3' ],

                # Input.
                input_backspace = [ 'K_BACKSPACE', 'repeat_K_BACKSPACE' ],
                input_enter = [ 'K_RETURN', 'K_KP_ENTER' ],
                input_left = [ 'K_LEFT', 'repeat_K_LEFT' ],
                input_right = [ 'K_RIGHT', 'repeat_K_RIGHT' ],
                input_up = [ 'K_UP', 'repeat_K_UP' ],
                input_down = [ 'K_DOWN', 'repeat_K_DOWN' ],
                input_delete = [ 'K_DELETE', 'repeat_K_DELETE' ],
                input_home = [ 'K_HOME', 'meta_K_LEFT' ],
                input_end = [ 'K_END', 'meta_K_RIGHT' ],
                input_copy = [ 'ctrl_noshift_K_INSERT', 'ctrl_noshift_K_c' ],
                input_paste = [ 'shift_K_INSERT', 'ctrl_noshift_K_v' ],
                input_jump_word_left = [ 'osctrl_K_LEFT' ],
                input_jump_word_right = [ 'osctrl_K_RIGHT' ],
                input_delete_word = [ 'osctrl_K_BACKSPACE' ],
                input_delete_full = [ 'meta_K_BACKSPACE' ],

                # Viewport.
                viewport_leftarrow = [ 'K_LEFT', 'repeat_K_LEFT' ],
                viewport_rightarrow = [ 'K_RIGHT', 'repeat_K_RIGHT' ],
                viewport_uparrow = [ 'K_UP', 'repeat_K_UP' ],
                viewport_downarrow = [ 'K_DOWN', 'repeat_K_DOWN' ],
                viewport_wheelup = [ 'mousedown_4' ],
                viewport_wheeldown = [ 'mousedown_5' ],
                viewport_drag_start = [ 'mousedown_1' ],
                viewport_drag_end = [ 'mouseup_1' ],
                viewport_pageup = [ 'K_PAGEUP', 'repeat_K_PAGEUP' ],
                viewport_pagedown = [ 'K_PAGEDOWN', 'repeat_K_PAGEDOWN' ],

                # These keys control skipping.
                skip = [ 'K_LCTRL', 'K_RCTRL' ],
                stop_skipping = [ ],
                toggle_skip = [ 'K_TAB' ],
                fast_skip = [ '>', 'shift_K_PERIOD' ],

                # Bar.
                bar_activate = [ 'mousedown_1', 'K_RETURN', 'K_KP_ENTER', 'K_SELECT' ],
                bar_deactivate = [ 'mouseup_1', 'K_RETURN', 'K_KP_ENTER', 'K_SELECT' ],
                bar_left = [ 'K_LEFT', 'repeat_K_LEFT' ],
                bar_right = [ 'K_RIGHT', 'repeat_K_RIGHT' ],
                bar_up = [ 'K_UP', 'repeat_K_UP' ],
                bar_down = [ 'K_DOWN', 'repeat_K_DOWN' ],

                # Delete a save.
                save_delete = [ 'K_DELETE' ],

                # Draggable.
                drag_activate = [ 'mousedown_1' ],
                drag_deactivate = [ 'mouseup_1' ],

                # Debug console.
                console = [ 'shift_K_o', 'alt_shift_K_o' ],
                console_older = [ 'K_UP', 'repeat_K_UP' ],
                console_newer = [ 'K_DOWN', 'repeat_K_DOWN'],

                # Director
                director = [ 'noshift_K_d' ],

                # Ignored (kept for backwards compatibility).
                toggle_music = [ 'm' ],
                viewport_up = [ 'mousedown_4' ],
                viewport_down = [ 'mousedown_5' ],

                # Profile commands.
                performance = [ 'K_F3' ],
                image_load_log = [ 'K_F4' ],
                profile_once = [ 'K_F8' ],
                memory_profile = [ 'K_F7' ],

            )

            config.pad_bindings = {
                "pad_leftshoulder_press" : [ "rollback", ],
                "pad_lefttrigger_pos" : [ "rollback", ],
                "pad_back_press" : [ "rollback", ],

                "repeat_pad_leftshoulder_press" : [ "rollback", ],
                "repeat_pad_lefttrigger_pos" : [ "rollback", ],
                "repeat_pad_back_press" : [ "rollback", ],

                "pad_guide_press" : [ "game_menu", ],
                "pad_start_press" : [ "game_menu", ],

                "pad_y_press" : [ "hide_windows", ],

                "pad_rightshoulder_press" : [ "rollforward", ],
                "repeat_pad_rightshoulder_press" : [ "rollforward", ],

                "pad_righttrigger_pos" : [ "dismiss", "button_select", "bar_activate", "bar_deactivate" ],
                "pad_a_press" : [ "dismiss", "button_select", "bar_activate", "bar_deactivate"],
                "pad_b_press" : [ "button_alternate" ],

                "pad_dpleft_press" : [ "focus_left", "bar_left", "viewport_leftarrow" ],
                "pad_leftx_neg" : [ "focus_left", "bar_left", "viewport_leftarrow" ],
                "pad_rightx_neg" : [ "focus_left", "bar_left", "viewport_leftarrow" ],

                "pad_dpright_press" : [ "focus_right", "bar_right", "viewport_rightarrow" ],
                "pad_leftx_pos" : [ "focus_right", "bar_right", "viewport_rightarrow" ],
                "pad_rightx_pos" : [ "focus_right", "bar_right", "viewport_rightarrow" ],

                "pad_dpup_press" : [ "focus_up", "bar_up", "viewport_uparrow" ],
                "pad_lefty_neg" : [ "focus_up", "bar_up", "viewport_uparrow" ],
                "pad_righty_neg" : [ "focus_up", "bar_up", "viewport_uparrow" ],

                "pad_dpdown_press" : [ "focus_down", "bar_down", "viewport_downarrow" ],
                "pad_lefty_pos" : [ "focus_down", "bar_down", "viewport_downarrow" ],
                "pad_righty_pos" : [ "focus_down", "bar_down", "viewport_downarrow" ],

                "repeat_pad_dpleft_press" : [ "focus_left", "bar_left", "viewport_leftarrow" ],
                "repeat_pad_leftx_neg" : [ "focus_left", "bar_left", "viewport_leftarrow" ],
                "repeat_pad_rightx_neg" : [ "focus_left", "bar_left", "viewport_leftarrow" ],

                "repeat_pad_dpright_press" : [ "focus_right", "bar_right", "viewport_rightarrow" ],
                "repeat_pad_leftx_pos" : [ "focus_right", "bar_right", "viewport_rightarrow" ],
                "repeat_pad_rightx_pos" : [ "focus_right", "bar_right", "viewport_rightarrow" ],

                "repeat_pad_dpup_press" : [ "focus_up", "bar_up", "viewport_uparrow" ],
                "repeat_pad_lefty_neg" : [ "focus_up", "bar_up", "viewport_uparrow" ],
                "repeat_pad_righty_neg" : [ "focus_up", "bar_up", "viewport_uparrow" ],

                "repeat_pad_dpdown_press" : [ "focus_down", "bar_down", "viewport_downarrow" ],
                "repeat_pad_lefty_pos" : [ "focus_down", "bar_down", "viewport_downarrow" ],
                "repeat_pad_righty_pos" : [ "focus_down", "bar_down", "viewport_downarrow" ],
            }

    #endregion Customizing the Keymap

    #region Achievements
        # see https://www.renpy.org/doc/html/achievement.html
    #endregion Achievements

    #region Dialogue History
        # see https://www.renpy.org/doc/html/history.html
    #endregion Dialogue History

    #region Multiple Character Dialogue
        # see https://www.renpy.org/doc/html/multiple.html
        e "Ren'Py supports displaying multiple lines of dialogue simultaneously." (multiple=2)
        l "About bloody time! I've been waiting for this for years." (multiple=2)
    #endregion Multiple Character Dialogue

    #region Splashscreen and Presplash
        # see https://www.renpy.org/doc/html/splashscreen_presplash.html

        label splashscreen:
            scene black
            with Pause(1)

            show text "American Bishoujo Presents..." with dissolve
            with Pause(2)

            hide text with dissolve
            with Pause(1)

            return

        image splash = "splash.png"

        label splashscreen:
            scene black
            with Pause(1)

            play sound "ping.ogg"

            show splash with dissolve
            with Pause(2)

            scene black with dissolve
            with Pause(1)

            return

        label splashscreen:

            $ renpy.movie_cutscene('movie.ogv')

            return
    #endregion Splashscreen and Presplash

#endregion

#region Python and Ren'Py
    # see https://www.renpy.org/doc/html/statement_equivalents.html
    # see https://www.renpy.org/doc/html/save_load_rollback.html
    # see https://www.renpy.org/doc/html/persistent.html
    # see https://www.renpy.org/doc/html/trans_trans_python.html
    # see https://www.renpy.org/doc/html/gui_advanced.html
    # see https://www.renpy.org/doc/html/screen_python.html
    # see https://www.renpy.org/doc/html/modes.html
    # see https://www.renpy.org/doc/html/cdd.html
    # see https://www.renpy.org/doc/html/cds.html
    # see https://www.renpy.org/doc/html/custom_text_tags.html
    # see https://www.renpy.org/doc/html/character_callbacks.html
    # see https://www.renpy.org/doc/html/file_python.html
    # see https://www.renpy.org/doc/html/color_class.html
    # see https://www.renpy.org/doc/html/matrix.html
    # see https://www.renpy.org/doc/html/model.html
    # see https://www.renpy.org/doc/html/other.html
#endregion Python and Ren'Py

#region other
    screen extract_dialogue:

        frame:
            style_group "l"
            style "l_root"

            window:

                has vbox

                label _("Extract Dialogue: [project.current.display_name!q]"):
                    test

                add HALF_SPACER

                frame:
                    style "l_indent"
                    xfill True

    # Return Statement
    label main_menu:
        return "no_unlock"


    # Special Labels
    label start:
        return
    label quit:
        return
    label after_load:
        return
        
    label splashscreen:
        return

    label before_main_menu:
        return
    label main_menu:
        
        return
    label after_warp:
        return
    label hide_windows:
        return

    # Python statements
    init:
        "Renpy code block"
        
    python:
        renpy.pause(delay)

    python in X:
        renpy.pause(delay)

    python hide:
        renpy.pause(delay)

    python early:
        renpy.pause(delay)

    init python:
        renpy.pause(delay)

    init -1 python in N:
        renpy.pause(delay)

    init 99 python hide:
        renpy.pause(delay)

    init python hide early in Namespace:

        def sampleFunction(name, delay, position=(0,0)):
            """
            This is a sample function.
            """
    # test
            renpy.pause(delay)
            return name

        class Inventory:
            """
            This is a fake inventory class.
            """

            def __init__(self):
                self.items = []

            def add(self, item):
                """Add an item to the inventory."""
                self.items.append(item);
                return
#endregion