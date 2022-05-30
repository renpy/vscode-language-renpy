# The script of the game goes in this file.

# Declare characters used by this game. The color argument colorizes the
# name of the character.

define e = Character("Eileen", who_color="#c8ffc8")

# sample colors
image red = Solid('#FF0000FF')
image green = Solid("#00FF00")
image white = Solid("#fff")
image translucent = Solid("#fff8")
image colorTest_solid = Solid(Color((255, 0, 0, 255)))
image colorTest_color = Color(color=(0, 255, 0, 255))
image colorTest_rgb = Color(rgb=(0.0, 0.0, 1.0), alpha=1.0)

# image definitions
image bg outside = "bg_outside.png"
image sprite = "sprite.png"

# default variables
default sidebar = False
default inventory = Inventory()

# obsolete method
default variable = im.Flip("test.png", horizontal=True)

# The game starts here.

label start:

    # Show a background. This uses a placeholder by default, but you can
    # add a file (named either "bg room.png" or "bg room.jpg") to the
    # images directory to show it.

    scene bg room

    # This shows a character sprite. A placeholder is used, but you can
    # replace it by adding a file named "eileen happy.png" to the images
    # directory.

    show eileen happy
    with dissolve

    # These display lines of dialogue.

    e "You've created a new Ren'Py game."

    # call a label 

    call sidebar_label

    if sidebar:
        e "We had a sidebar conversation."
    else:
        e "Continuing on."

    e "Once you add a story, pictures, and music, you can release it to the world!"

    $ sampleFunction("Eileen", 1.0)

    # This ends the game.

    return


label sidebar_label:
    $ save_name = "Sidebar"
    $ sidebar = True
    e "This is a sidebar conversation."
    e "Take this business card."
    $ inventory.add("business card")

    return

# sample screen code

screen hello_world(world):
    tag example
    zorder 1
    modal False

    text "Hello, {}.".format(world)

transform hello_t:
    align (0.7, 0.5) alpha 0.0
    linear 0.5 alpha 1.0

screen hello_title():
    text "Hello." at hello_t
    text "Hello.":
        at transform:
            align (0.2, 0.5) alpha 0.0
            linear 0.5 alpha 1.0

# sample python code
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

