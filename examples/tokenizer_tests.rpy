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

label start:
    "Light Distraction\n{color=ff0000}{size=18}[distraction_percentages[0]]%% Chance{/size}{/color}"
    
    menu:    
        "It's a video game.":
            jump game

        "It's an interactive book.":
            jump book
        