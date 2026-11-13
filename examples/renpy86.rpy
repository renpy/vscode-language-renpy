## Syntax added or changed in Ren'Py 8.6, for manually checking highlighting.

# Text interpolation: the !f flag passes the value through config.say_menu_text_filter.
label renpy86:
    "Hello, [player_name!f]."
    "Hello, [player_name!tf]."

# PEP 701 f-strings.
init python:
    d = {"key": 1}
    x = 255
    width = 10

    a = f"{d["key"]}"
    b = f'{d['key']}'
    c = f"{x:#x}"
    e = f"{x:'>10}"
    g = f"{x:{width}}"
    h = f"{x:>{width}.2f}"
    i = f"{(y := 10)}"
    j = f"{x!r:>10}"
    k = f"{x=}"
    l = f"{{literal}} {x}"
    m = f"{f"{x}"}"
    n = f"{
        x  # a comment inside a replacement field
    }"
    o = rf"\d{x}"
    p = f"""{d["key"]:>{width}}"""
    after = "highlighting resumes here"

# Layered images: nested if inside a branch, and at together with at transform.
layeredimage eileen:
    always:
        "eileen_base"

    if glasses:
        if glasses == "evil":
            "eileen_glasses_evil"
        elif glasses == "funky":
            "eileen_glasses_funky"
        else:
            "eileen_glasses"

    attribute hat:
        "hat.png"
        at wobble
        at transform:
            zoom 0.9

# Screen language: bar and vbar take action.
screen volume_bar():
    bar:
        value VariableValue("volume", 100)
        action Play("sound", "click.ogg")
        changed SetVariable("changed", True)

# ATL: gl_texture_scaling and per-uniform wrap and scaling properties.
transform scaled:
    gl_texture_scaling "linear"
    gl_texture_scaling_tex0 "nearest"
    gl_texture_wrap_u_markup "repeat"
    gl_texture_scaling_u_markup "linear"
    u_custom_uniform 1.0

# Translation strings: old and new must be plain string literals.
translate french strings:
    old "Start"
    new "Com" "mencer"
