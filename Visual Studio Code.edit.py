import os
import subprocess
import sys

import renpy.editor


class Editor(renpy.editor.Editor):

    has_projects = True

    def get_code(self):
        """
        Returns the path to the code executable, if None.
        """

        DIR = os.path.abspath(os.path.dirname(__file__))

        if renpy.windows:
            code = "Code.cmd"
        elif renpy.macintosh:
            DIR = os.path.abspath("/Applications")
            code = os.path.join(
                DIR,
                "Visual Studio Code.app",
                "Contents",
                "Resources",
                "app",
                "bin",
                "code",
            )
        else:
            code = "code"

        return code

    def open(self, filename, line=None, **kwargs):
        if line:
            filename = "{}:{}".format(filename, line)
        self.args.append(filename)

    def open_project(self, project):
        self.args.append(project)

    def begin(self, new_window=False, **kwargs):
        self.args = []

    def end(self, **kwargs):
        self.args.reverse()
        code = self.get_code()
        args = [code, "-g"] + self.args
        args = [renpy.exports.fsencode(i) for i in args]

        if renpy.windows:
            CREATE_NO_WINDOW = 0x08000000
            subprocess.Popen(args, creationflags=CREATE_NO_WINDOW)
        else:
            subprocess.Popen(args)


def main():
    e = Editor()
    e.begin()

    for i in sys.argv[1:]:
        e.open(i)

    e.end()


if __name__ == "__main__":
    main()
