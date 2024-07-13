# This is not included in the game. It's here so that an editor knows
# the type of strength.
strength = 100

"""renpy
init python:
"""

class BoostStrength(Action):
    """
    Boosts the strength of the player by 10.
    """

    def __call__(self):
        global strength
        strength += 10
        renpy.restart_interaction()