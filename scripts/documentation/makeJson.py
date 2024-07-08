from __future__ import print_function

import doc
import shaderdoc
import inspect
import re
import collections
import keyword
import renpy.sl2
import shutil
import os
import json

#import __builtin__

root = ""
final_output = ""
incdir = ""
fnpath = ""

# A map from filename to a list of lines that are supposed to go into
# that file.
line_buffer = collections.defaultdict(list)

# A map from id(o) to the names it's documented under.
documented = collections.defaultdict(list)

# This keeps all objects we see alive, to prevent duplicates in documented.
documented_list = [ ]

name_kind = collections.defaultdict(str)

### ROB'S STUFF
name_docs = collections.defaultdict(str)
name_args = collections.defaultdict(str)
name_class = collections.defaultdict(str)
output = collections.defaultdict(str)
baseoutput = collections.defaultdict(str)
test_mode = True

def set_root(path):
    global root, final_output, incdir
    root = path
    final_output = os.path.join(root, 'renpy.json')
    incdir = os.path.join(root, 'source', 'inc')

def set_renpy_root(path):
    global fnpath
    fnpath = path

def json_scan_docs(filename=None):
    """
    Scans the documentation for functions, classes, and variables.
    """

    def scan_file(fn):
        f = open(fn)
        basefile = os.path.splitext(os.path.basename(fn))[0]

        buffer = []
        current_kind = ""
        current_class = ""
        get_docs = False

        for l in f:
            m = re.search(r"\.\. (\w+):: ([.\w+]+)(.*)", l)
            
            if not m:
                if current_kind == "":
                    continue
                else:
                    if len(l) > 1 and not l.startswith(' '):
                        name_docs[current_kind] = format_doc_string(buffer)
                        format_output(basefile, current_kind)
                        get_docs = False
                        current_kind = ""
                        buffer = []
                    else:
                        if len(l) > 1:
                            buffer.append(l.replace('    ','').replace('   ','').replace('\n','').replace('\\','"'))
                        else:
                            buffer.append(l.replace('\n',''))
                    continue
            
            if (current_kind != ""):
                name_docs[current_kind] = format_doc_string(buffer)
                format_output(basefile, current_kind)
                get_docs = False
                current_kind = ""
                buffer = []

            current_kind = m.group(2)
            name_args[current_kind] = m.group(3)
            name_kind[current_kind] = m.group(1)
            get_docs = True
            buffer = []
            if m.group(1) == "class":
                current_class = m.group(2)
            name_class[current_kind] = ""
            if (m.group(1) == "method" or m.group(1) == "attribute"):
                if l.startswith('  ') and current_class != "":
                    name_class[current_kind] = current_class
        
        if (current_kind != ""):
            name_docs[current_kind] = format_doc_string(buffer)
            format_output(basefile, current_kind)

    output["renpy.say"] = output["say"]
    del output["say"]

    output_json("black", "internal", "image", " = Solid(\"#000\")", "", "image", "")
    output_json("renpy.music", "basefile", "", "", "", "", documentation["renpy.music"])
    output_json("renpy.sound", "basefile", "", "", "", "", documentation["renpy.sound"])

    audio_doc = documentation["renpy.sound.register_channel"]
    audio_args = override_args["renpy.sound.register_channel"]
    output_json("renpy.music.register_channel", "audio", "function", audio_args, "", "", audio_doc)
    output_json("renpy.sound.register_channel", "audio", "function", audio_args, "", "", audio_doc)
    override_documented["renpy.music.register_channel"] = True
    override_documented["renpy.sound.register_channel"] = True
    
    if (filename):
        scan_file(os.path.join(root, "source", filename))
    else: 
        for i in os.listdir(os.path.join(root, "source")):
            if i.endswith(".rst"):
                scan_file(os.path.join(root, "source", i))

        for i in os.listdir(os.path.join(root, "source", "inc")):
            scan_file(os.path.join(root, "source", "inc", i))

def format_doc_string(buffer):
    docs = "\n".join(buffer).replace('"', "\\""")

    codeblock = ""
    split = docs.split("::")
    if len(split) == 2:
        docs = split[0].rstrip()
        codeblock = split[1].lstrip()
        codeblock = "```\n" + codeblock + "\n```"
    
    docs = docs.replace("\n\n", "!!!!").replace("\n", " ").replace("!!!!", "\n\n")
    docs = docs.replace("\n\n", "!!!!").replace("\n", " ").replace("!!!!", "\n\n")
    
    if len(codeblock):
        docs = docs + "\n" + codeblock

    return docs.strip()

def format_output(basefile, current_kind):
    if basefile in ["screen_special"]:
        return

    if name_class[current_kind] != "":
        key = "{}.{}".format(name_class[current_kind], current_kind)
    else:
        key = current_kind

    if key == "inc" or name_kind[current_kind] in ["productionlist","ifconfig","figure","image","raw","only","warning","highlight"]:
        return

    if basefile == "store_variables":
        name_class[current_kind] = "store"
    elif basefile in ["screen_actions"]:
        name_kind[current_kind] = "Action"

    output_json(key,
        basefile,
        current_kind,
        name_args[current_kind],
        name_class[current_kind],
        name_kind[current_kind],
        name_docs[current_kind]
    )

    return

def output_json(key, basefile, kind, nargs, nclass, nkind, ndocs):
    if (key in ignore_list):
        return

    if key.startswith('_') and not (key in documentation):
        print("output_json skipping '{}'", key)
        return

    if (key == "Image"):
        ndocs = "Loads an image from a file. filename is a string giving the name of the file.\n\nfilename should be a JPEG or PNG file with an appropriate extension.\n\nIf optimize_bounds is True, only the portion of the image inside the bounding box of non-transparent pixels is loaded into GPU memory. (The only reason to set this to False is when using an image as input to a shader.)"

    if ndocs == "" and key in documentation:
        ndocs = documentation[key]
        if key in override_args:
            nargs = override_args[key]
    elif ("->" in ndocs):
        if key in documentation:
            ndocs = documentation[key]
        else:
            return
    elif "This module provides" in ndocs:
        return

    if "." in key and len(ndocs) == 0:
        return

    if key.startswith('im.') or key == "im":
        basefile = "obsolete"
    elif (key.startswith('ui.') or key == "ui") and key != "ui.adjustment":
        basefile = "obsolete"
    elif key in obsoleted:
        basefile = "obsolete"
        ndocs = obsoleted[key]

    if ndocs.startswith('Returns a transition') or key == 'Swing':
        basefile = 'transitions'

    if nargs:
        nargs = nargs.replace("(self, ", "(")

    if nkind == "" and key in override_kind:
        nkind = override_kind[key]

    output[key] = [
        basefile,
        kind,
        nargs,
        nclass,
        nkind,
        ndocs
    ]
    
    if test_mode or key=="_autosave":
        print("{} = {}".format(key, output[key]))

    return

def sort_output_json():
    for key in undocumented:
        output.pop(key, None)

    group = {}
    for key in sorted(output):
        if key.startswith("config."):
            group[key] = output[key]
    baseoutput["config"] = group

    group = {}
    for key, value in iter(output.items()):
        if key.startswith("renpy."):
            group[key] = value
    baseoutput["renpy"] = group

    group = {}
    for key, value in iter(output.items()):
        if not key.startswith("config.") and not key.startswith("renpy."):
            group[key] = value
    baseoutput["internal"] = group

    jsonStr = json.dumps(baseoutput)
    # print("")
    # print(jsonStr)

    with open(os.path.join(root, 'renpy.json'), "w") as f:
        f.write(jsonStr)

def json_write_reserved(module, dest, ignore_builtins):
    for i in sorted(dir(module)):
        if i == "doc":
            continue

        if i.startswith("_"):
            continue

        #if ignore_builtins and hasattr(__builtin__, i):
        #    continue
    
        simple_scan(i, getattr(module, i), "")

def scan_section(name, o):
    """
    Scans object o. Assumes it has the name name.
    """

    #print("scan_section {}".format(name))
    for n in dir(o):
        if n.startswith('_'):
            continue
        simple_scan(name + n, getattr(o, n))

def simple_scan(name, o, prefix=""):
    doc_type = "function"
    # The section it's going into.
    section = None
    # The formatted arguments.
    args = None

    # Get the function's docstring.
    doc = inspect.getdoc(o)
    if doc is None:
        doc = inspect.getcomments(o)
        try:
            doc = o.__doc__
        except AttributeError:
            doc = None

    # doc strings are compiled out of the final binaries :(
    # if doc is None:
    #     doc = getattr(o, "__doc__", None)
    #     if not isinstance(doc, basestring):
    #         doc = None

    #if not doc:
    #    return

    # Break up the doc string, scan it for specials.
    lines = [ ]

    if doc:
        for l in doc.split("\n"):
            m = re.match(r':doc: *(\w+) *(\w+)?', l)
            if m:
                section = m.group(1)
                if m.group(2):
                    doc_type = m.group(2)
                continue

            m = re.match(r':args: *(.*)', l)
            if m:
                args = m.group(1)
                continue

            m = re.match(r':name: *(\S+)', l)
            if m:
                if name != m.group(1):
                    return
                continue

            lines.append(l)

    if args is None:
        # Get the arguments.
        if inspect.isclass(o):
            init = getattr(o, "__init__", None)
            if not init:
                return

            init_doc = inspect.getdoc(init)
            if init_doc and not init_doc.startswith("x.__init__("):
                lines.append("")
                lines.extend(init_doc.split("\n"))
            try:
                args = inspect.getfullargspec(init)
            except:
                args = None

        elif inspect.isfunction(o):
            args = inspect.getfullargspec(o)
    
        elif inspect.ismethod(o):
            args = inspect.getfullargspec(o)

        else:
            #print("Warning: %s has section but not args." % name)
            #return
            pass

        # Format the arguments.
        if args is not None:
            args = inspect.formatargspec(*args)
            args = args.replace("(self, ", "(")
            args = re.sub(r'\<[^>]*\>', 'NotSet', args)
        else:
            args = "()"

    # Put it into the line buffer.
    lb = line_buffer[section]

    nkind = ""
    if inspect.isclass(o):
        doc_type = "class"
        tree = inspect.getclasstree([o], unique=True)
        if tree and len(tree) > 0 and renpy.ui.Action in tree[0]:
            nkind = "Action"

    lb.append(prefix + ".. %s:: %s%s" % (doc_type, name, args))

    for l in lines:
        lb.append(prefix + "    " + l)

    lb.append(prefix + "")

    # if inspect.isclass(o):
    #     if (name not in [ "Matrix", "OffsetMatrix", "RotateMatrix", "ScaleMatrix" ]):
    #         for i in dir(o):
    #             simple_scan(i, getattr(o, i), prefix + "    ")

    if name == "identity":
        raise Exception("identity")

    documented_list.append(o)
    documented[id(o)].append(name)

    output_json(name,
        'internal',
        doc_type,
        args,
        '',
        nkind,
        format_doc_string(lines)
    )

def parse_file_test():
    parse_file("", fnpath + "audio/audio.py")

def parse_file_list():
    # extract documentation from the source files
    print("documentation count={}".format(len(documentation)))
    print("ignore_list count={}".format(len(ignore_list)))

    common_list = ["00action_audio.rpy","00action_control.rpy",
        "00action_data.rpy","00action_file.rpy","00action_menu.rpy",
        "00action_other.rpy","00barvalues.rpy","00gamepad.rpy",
        "00matrixcolor.rpy","00matrixtransform.rpy","00mousedisplayable.rpy",
        "00musicroom.rpy","00gallery.rpy","00inputvalues.rpy",
        "00nvl_mode.rpy","00placeholder.rpy","00preferences.rpy",
        "00sideimage.rpy","00stylepreferences.rpy","00voice.rpy",
        "00layeredimage.rpy"]

    for p in common_list:
        parse_file("", os.path.join(fnpath, 'common', p))

    renpy_list = ["exports.py", "character.py", "display/video.py",
        "display/image.py", "display/transition.py", "common/00library.rpy",
        "gl2/live2d.py","statements.py","sl2/slparser.py","text/font.py",
        "gl2/gl2shadercache.py","loadsave.py","display/focus.py",
        "display/behavior.py","ast.py","display/screen.py",
        "lint.py"]

    for p in renpy_list:
        parse_file("renpy", os.path.join(fnpath, p))
        parse_file("", os.path.join(fnpath, p))

    parse_file("renpy.sound", os.path.join(fnpath, 'audio', 'audio.py'))
    parse_file("renpy.music", os.path.join(fnpath, 'audio', 'music.py'))

    parse_file("", os.path.join(fnpath, "audio", "audio.py"))
    parse_file("", os.path.join(fnpath, "display", "layout.py"))
    parse_file("", os.path.join(fnpath, "display", "model.py"))
    parse_file("", os.path.join(fnpath, "display", "imagelike.py"))
    parse_file("", os.path.join(fnpath, "display", "particle.py"))
    parse_file("", os.path.join(fnpath, "display", "motion.py"))
    parse_file("", os.path.join(fnpath, "display", "dragdrop.py"))
    parse_file("", os.path.join(fnpath, "text", "extras.py"))
    parse_file("", os.path.join(fnpath, "text", "text.py"))
    parse_file("", os.path.join(fnpath, "defaultstore.py"))
    parse_file("", os.path.join(fnpath, "common", "00definitions.rpy"))
    parse_file("", os.path.join(fnpath, "color.py"))
    parse_file("", os.path.join(fnpath, "python.py"))
    parse_file("", os.path.join(fnpath, "ui.py"))

    parse_file("gui", os.path.join(fnpath, "common", "00gui.rpy"))
    parse_file("build", os.path.join(fnpath, "common", "00build.rpy"))
    parse_file("define", os.path.join(fnpath, "common", "00definitions.rpy"))
    parse_file("iap", os.path.join(fnpath, "common", "00iap.rpy"))
    parse_file("layeredimage", os.path.join(fnpath, "common", "00layeredimage.rpy"))
    parse_file("updater", os.path.join(fnpath, "common", "00updater.rpy"))
    parse_file("im", os.path.join(fnpath, "display", "im.py"))
    parse_file("ui", os.path.join(fnpath, "ui.py"))
    parse_file("achievement", os.path.join(fnpath, "common", "00achievement.rpy"))

    print("documentation count={}".format(len(documentation)))
    print("ignore_list count={}".format(len(ignore_list)))

def parse_file(prefix, fn):
    f = open(fn)
    lb = []
    inside_doc = False
    kwtype = ""
    function = ""
    args = ""

    #print("documentation count={}".format(len(documentation)))
    for l in f:
        m = re.search(r"^\s{0,4}(class|def)\s+(\w+)(\(.*\)):(.*)", l)
        if m:
            kwtype = m.group(1)
            function = m.group(2)
            args = m.group(3)
                
            if prefix and len(prefix) > 0:
                function = prefix + "." + function

            if test_mode:
                print("found: {}{}".format(function,args))

            lb = []
            continue
        else:
            m = re.search(r"^\s{0,4}(class|def)\s+(\w+)(\()", l)
            if m:
                kwtype = m.group(1)
                function = m.group(2)
                args = ""

                if prefix and len(prefix) > 0:
                    function = prefix + "." + function

                if test_mode:
                    print("found multiline: {}{}".format(function,args))

                lb = []
                continue

        if '"""' in l:
            if len(lb) > 0:
                docs = format_doc_string(lb)
                #if test_mode:
                #    print("{} : {} : {}".format(function,args,docs))
                if docs and len(docs) > 0:
                    if not function in documentation:
                        documentation[function] = docs
                    if prefix and len(prefix) > 0 and kwtype == "def":
                        override_args[function] = args
                lb = []
                inside_doc = False
            else:
                inside_doc = True
        elif inside_doc:
            if ":undocumented:" in l:
                undocumented.append(function)
                ignore_list.append(function)
                lb = []
                inside_doc = False
            elif ":doc:" in l:
                override_documented[function] = True
                #print("*** override_documented[{}]".format(function))
                #if function == "AnimatedValue":
                #    print("AnimatedValue={}".format(fn))
                if "00action" in fn or "00inputvalues" in fn or "00barvalues" in fn:
                    override_kind[function] = "Action"
                pass
            elif ":args:" in l:
                args = l.replace(":args:", "").strip()
                override_args[function] = args
            elif ":name:" in l:
                override_name = l.replace(":name:", "").strip()
                function = override_name
            elif "figure::" in l:
                pass
            else:
                if len(l) > 1:
                    lb.append(l.replace('    ','').replace('   ','').replace('\n','').replace('\\','"'))
                else:
                    lb.append(l.replace('\n',''))

def copyRenpyFunctions():
    new_output = output["renpy.sound.register_channel"][:]
    new_output[1] = 'renpy.music.register_channel'
    output["renpy.music.register_channel"] = new_output
    override_args["renpy.music.register_channel"] = override_args["renpy.sound.register_channel"]
    override_documented["renpy.music.register_channel"] = True
    
    new_keys = []
    for o in output:
        # get ready to copy the renpy.music functions
        # remove the undocumented audio functions
        if "renpy.music." in o:
            if o in override_args and o in override_documented:
                new_keys.append(o)
            else:
                output[o] = ":undocumented:"
                undocumented.append(o)
        elif "achievement." in o:
            if o in override_documented:
                new_keys.append(o)
            else:
                output[o] = ":undocumented:"
                undocumented.append(o)

    # add copies of the renpy.music functions to renpy.sound
    for key in new_keys:
        new_key = key.replace('.music.', '.sound.')
        new_output = output[key][:]
        new_output[2] = new_output[2].replace('channel="music"', 'channel="sound"')
        output[new_key] = new_output

    #update transitions
    new_output = output["irisin"][:]
    new_output[1] = 'irisout'
    new_output[5] = new_output[5].replace('irisout', 'irisin')
    output["irisout"] = new_output

    for key in ["pushleft", "pushup", "pushdown"]:
        new_output = output["pushright"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'pushright')
        output[key] = new_output    

    for key in ["wiperight", "wipeup", "wipedown"]:
        new_output = output["wipeleft"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'wipeleft')
        output[key] = new_output   

    for key in ["slideright", "slideup", "slidedown"]:
        new_output = output["slideleft"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'slideleft')
        output[key] = new_output    

    for key in ["slideawayright", "slideawayup", "slideawaydown"]:
        new_output = output["slideawayleft"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'slideawayleft')
        output[key] = new_output 

    for key in ["moveinleft", "moveintop", "moveinbottom"]:
        new_output = output["moveinright"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'moveinright')
        output[key] = new_output 

    for key in ["moveoutleft", "moveouttop", "moveoutbottom"]:
        new_output = output["moveoutright"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'moveoutright')
        output[key] = new_output 

    for key in ['easeinright','easeinleft','easeintop','easeinbottom','easeoutright','easeoutleft','easeouttop','easeoutbottom']:
        new_output = output["ease"][:]
        new_output[1] = key
        new_output[5] = new_output[5].replace(key, 'ease')
        output[key] = new_output 

    ui_docs = documentation["ui"]
    for key in ["ui.add", "ui.bar", "ui.imagebutton", "ui.input", "ui.key", "ui.label", "ui.null", "ui.text", "ui.textbutton", "ui.timer", "ui.vbar", "ui.hotspot", "ui.hotbar", "ui.spritemanager", "ui.button", "ui.frame", "ui.transform", "ui.window", "ui.drag", "ui.fixed", "ui.grid", "ui.hbox", "ui.side", "ui.vbox", "ui.imagemap", "ui.draggroup"]:
        output_json(key,'obsolete',key,'','','ui',ui_docs)

    #for key in ['_autosave','_confirm_quit','_dismiss_pause','_game_menu_screen','_history','_history_list','_ignore_action','_menu','_quit_slot','_rollback','_screenshot_pattern','_skipping','_version','_window','_window_auto','_window_subtitle']:
    #    output_json(key,'store_variables',key,'','','','')

# ignore these keywords and don't document them
ignore_list = ["sys","os","renpy.os","renpy.open","renpy.copy","im.open","im.os","ui.open","ui.tobytes",
    "updater.json","renpy.renpy_pure","renpy.public_api","layeredimage.Layer","nvl_erase",
    "updater.io","updater.zlib","updater.subprocess","updater.traceback","updater.future","updater.os",
    "updater.python_object","updater.zsync_path","updater.hashlib","updater.tobytes","updater.rsa",
    "updater.tarfile","updater.struct","updater.codecs","updater.urlparse","updater.threading",
    "renpy.munge","default","define"]

# override documentation for common objects whose pydoc is empty for some reason
override_args = {}
override_documented = {}
undocumented = []
obsoleted = {
    "LiveCrop": "LiveCrop is now :func:`Crop`.",
    "LiveComposite": "LiveComposite is now :func:`Composite`."
}
override_kind = {
    "If" : "Action",
    "FileAction" : "Action",
    "ScreenVariableValue" : "Action",
    "AudioPositionValue" : "Action",
    "FieldValue" : "Action",
    "DictValue" : "Action",
    "Preference" : "Action",
    "GetCharacterVolume" : "Action",
    "GamepadCalibrate" : "Action",
    "GamepadExists" : "Action"
}

documentation = {
    "renpy" : "To allow Ren'Py to be scripted in Python, each Ren'Py statement has a Python equivalent. This usually consists of a Python function, but may also consist of a pattern of Python calls that perform an action equivalent to the statement.",
    "Lexer" : "The parse method of renpy.register_statement takes a Lexer object",
    "HistoryEntry" : "The _history_list variable stores the actual history, as a list of HistoryEntry objects.",
    "save_name": "A save name that is included with saves.",
    "build.display_name" : "The name that will be displayed in the title bar.",
    "build.version" : "The version used by the build system.",
    "iap" : "Ren'Py includes a high-level in-app purchasing framework. This framework currently only supports unlock-style purchases from the Apple App Store, Google Play, and the Amazon Appstore.",
    "ui" : "**Note**\n\nThe implementation of Ren'Py has changed, and UI functions that create displayables can now be far slower than their screen language equivalents.\n\nThe UI functions are Python equivalents of the screen language statements. For each screen language statement, there is a ui function with the same name. For example, ui.text corresponds to the text statement, and ui.add corresponds to the add statement.",
    "im" : "An image manipulator is a displayable that takes an image or image manipulator, and either loads it or performs an operation on it. Image manipulators can only take images or other image manipulators as input.\n\nWith the few exceptions listed below, the use of image manipulators is historic. A number of image manipulators that had been documented in the past should no longer be used, as they suffer from inherent problems. In any case except for im.Data, the Transform() displayable provides similar functionality in a more general manner, while fixing the problems, although it sometimes requires gl2 to be enabled.",
    "config" : "Configuration variables control the behavior of Ren'Py's implementation, allowing Ren'Py itself to be customized in a myriad of ways. These range from the common (such as changing the screen size) to the obscure (adding new kinds of archive files).\n\nRen'Py's implementation makes the assumption that, once the GUI system has initialized, configuration variables will not change. Changing configuration variables outside of init blocks can lead to undefined behavior. Configuration variables are not part of the save data.",
    "Live2D" : "This displayable displays a Live2D animation.\n\nOnly filename should be given positionally, and all other arguments should be given as keyword arguments.",
    "Transform" : "A transform applies operations such as cropping, rotation, scaling, and alpha-blending to its child. A transform object has fields corresponding to the transform properties, which it applies to its child.",
    "persistent" : "The persistent variable allows access to the Persistent object's fields, which contains saved data that is not associated with a particular point in a game.",
    "say" : "The equivalent of the say statement.\n\n`who` Either the character that will say something, None for the narrator, or a string giving the character name. In the latter case, the say() is used to create the speaking character.\n\n`what` A string giving the line to say. Percent-substitutions are performed in this string.",
    "achievement" : "The Achievement module allows the developer to grant achievements to the player, to clear achievements, and to determine if an achievement has been granted. It also allows the recording of progress towards an achievement.\n\nBy default, the achievement stores information in the persistent file. If Steam support is available and enabled, achievement information is automatically synchronized with Steam.",
    "renpy.music" : "Most renpy.music functions have aliases in renpy.sound. These functions are similar, except they default to the sound channel rather than the music channel, and default to not looping.",
    "renpy.sound" : "Most renpy.sound functions have aliases in renpy.music. These functions are similar, except they default to the music channel rather than the sound channel, and default to looping.",
    "Image" : "Loads an image from a file. filename is a string giving the name of the file.\n\nfilename should be a JPEG or PNG file with an appropriate extension.\n\nIf optimize_bounds is True, only the portion of the image inside the bounding box of non-transparent pixels is loaded into GPU memory. (The only reason to set this to False is when using an image as input to a shader.)",
    "DynamicCharacter" : "Creates and returns a `Character` object that has the `dynamic` property set to `True`.\n\n`name_expr` should either be a string containing a Python expression, a function, or a callable object. If it's a string, that string will be evaluated before each line of dialogue, and the result used as the name of the character. Otherwise, the function or callable object will be called with no arguments before each line of dialogue, and the return value of the call will be used as the name of the character.",
    "adv" : "This is a template ADV-mode character, and the default character kind that is used when `Character()` is called.",
    "name_only" : "This is a template character that is used when a string is given as the character name in a say statement.",
    "narrator" : "This is the character that speaks narration (say statements that do not give a character or character name).",
    "_autosave" : "This variable can be set to False to disable autosave.",
    "_confirm_quit" : "This determines if quitting the game asks for confirmation. It is set to False during the splashscreen, and is ignored when in the main menu.",
    "_dismiss_pause" : "If True, the player can dismiss pauses and transitions.",
    "_game_menu_screen" : "This is the screen that is displayed when entering the game menu with no more specific screen selected. (For example, when right-clicking, pressing escape, or when ShowMenu() is not given an argument.) If None, entry to the game menu is disallowed.\n\nThis is set to None at the start of the splashscreen, and restored to its original value when the splashscreen ends.",
    "_history" : "If true, Ren'Py will record dialogue history when a line is shown. (Note that `config.history_list_length` must be set as well.)",
    "_history_list" : "This is a list of history objects, corresponding to each line of history from oldest to newest. See the History section for more information.",
    "_ignore_action" : "When this is not None, it's an action that is run after clicking Ignore on the error handling screen. The action is usually `Jump()`, to jump the game to a place that can recover from an error. If None, control continues with the next Ren'Py statement.",
    "_menu" : "Ren'Py sets this variable to True when entering a main menu or game menu context.",
    "_quit_slot" : "If not None, this should be a string giving the name of a file slot. When Ren'Py quits, the game will be saved in this slot.",
    "_rollback" : "Controls if rollback is allowed.",
    "_screenshot_pattern" : "If not None, this string is used in preference to `config.screenshot_pattern` to determine the filename of a screenshot. Please see the documentation for that variable for the format of the string.",
    "_skipping" : "Controls if skipping is allowed.",
    "_version" : "This is set to `config.version` when a new game is started. It can be used by the `after_load` label or `config.after_load_callbacks` to determine which upgrades need to be done.\n\nThis is only set once, upon the initial start. After that, the game is responsible for updating `_version` as necessary.",
    "_window" : "This set by the `window show` and `window hide` statements, and indirectly by `window auto`. If true, the dialogue window is shown during non-dialogue statements.",
    "_window_auto" : "This is set to true by `window auto` and to false by `window show` and `window hide`. If true, the `window auto` behavior occurs.",
    "_window_subtitle" : "This is appended to `config.window_title` to produce the caption for the game window. This is automatically set to `config.menu_window_subtitle` while in the game menu.",
    "_live2d_fade" : "If true, Live2D animations use motion fading. If False, animations are transitioned abruptly.",
    "_in_replay" : "When in replay mode, this is sent to the label at which replay mode was started. Outside of replay mode, this is None."
}
