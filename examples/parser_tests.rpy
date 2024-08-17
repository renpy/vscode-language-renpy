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

    

label sample1:
    e "Here is 'sample1' label."
    character.e "You've created a new Ren'Py game."

label sample2(a="default"):
    e "Here is 'sample2' label."

    "a = [a]"

label global_label:
    "Inside a global label.."
    label .local_name:
        "..resides a local one."
        # jump .local_name
    
    label local:
    label .local:
        
    label global_name.local:
    label global_label.local_name.error:
    label .global_label.local_name.error:
        pass