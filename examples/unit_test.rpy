#region Quick start
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

transform ctc_appear:
    alpha 0.0
    pause 5.0
    linear 0.5 alpha 1.0
#endregion

#region Language Basics
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

#region nvl_mode Getting Started
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

#region ATL
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
    
#endregion

#region other
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