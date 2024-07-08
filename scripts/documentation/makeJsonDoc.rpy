init python:
    import doc
    import shaderdoc
    import makeJson

    def export():
        # the folder containing the sphinx project
        root = "/Users/robdurfee/Library/CloudStorage/OneDrive-Personal/Documents/RenPy/sphinx"
        incdir = os.path.join(root, 'source', 'inc')
        makeJson.set_root(root)
        # the renpy SDK folder
        makeJson.set_renpy_root("/Applications/renpy-8-sdk/renpy/")

        makeJson.parse_file_list()
        shaderdoc.shaders(incdir=incdir)

        makeJson.scan_section("", renpy.store)
        makeJson.scan_section("renpy.", renpy)
        makeJson.scan_section("renpy.music.", renpy.music)
        #makeJson.scan_section("theme.", theme)
        makeJson.scan_section("layout.", layout)
        makeJson.scan_section("define.", define)
        makeJson.scan_section("ui.", ui)
        makeJson.scan_section("im.", im)
        #makeJson.scan_section("im.matrix.", im.matrix)
        makeJson.scan_section("build.", build)
        makeJson.scan_section("updater.", updater)
        makeJson.scan_section("iap.", iap)
        makeJson.scan_section("achievement.", achievement)
        makeJson.scan_section("gui.", gui)
        makeJson.scan_section("layeredimage.", layeredimage)
        makeJson.scan_section("Matrix.", Matrix)

        makeJson.json_scan_docs()
        #makeJson.json_write_reserved(__builtin__, os.path.join(incdir, 'reserved_builtins'), False)
        makeJson.json_write_reserved(store, os.path.join(incdir, 'test'), True)
        makeJson.json_scan_docs('transitions.rst')
        makeJson.json_scan_docs('transforms.rst')
        makeJson.copyRenpyFunctions()
        makeJson.sort_output_json()
        raise SystemExit

label exportJson:
    $ export()
