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

    character.e "You've created a new Ren'Py game."

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