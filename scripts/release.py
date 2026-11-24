"""Release the extension to the Visual Studio Marketplace and Open VSX.

The version is derived from a Ren'Py checkout: Ren'Py X.Y.Z becomes extension version (X*100+Y).Z.N, where N is one
more than the highest existing tag for that Ren'Py version, starting at 0. The script checks the tree, runs lint, the
format check, and the tests, bumps the version, renames the changelog's "## Unreleased" heading, commits and tags,
packages a .vsix, pushes, publishes that .vsix to both registries, and creates a draft GitHub release with it.

Run it with ./release.sh in the repository root, which passes its arguments to:

    uv run --project scripts scripts/release.py [--dry-run] [--pre-release] [--skip-tests] [--renpy DIR]

Publishing needs VSCE_PAT and OVSX_PAT, from the environment or the git-ignored .env file, and a logged-in gh CLI.
--dry-run runs the checks, builds a .vsix of the current tree into a temporary directory, and prints the commands that
would change anything, without running them; it only fetches from origin and rebuilds the git-ignored build output.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path

REPO: Path = Path(__file__).resolve().parent.parent
"""The root of the extension repository."""

CHANGELOG: Path = REPO / "CHANGELOG.md"
"""The changelog whose "## Unreleased" section becomes the release notes."""

UNRELEASED_HEADING: str = "## Unreleased"
"""The changelog heading that collects changes since the last release."""

BRANCH: str = "master"
"""The branch releases are made from."""

REMOTE: str = "origin"
"""The remote that the release commit and tag are pushed to."""

ENV_FILE: Path = REPO / ".env"
"""Optional git-ignored file holding VSCE_PAT and OVSX_PAT as KEY=VALUE lines."""

TOKEN_VARIABLES: tuple[str, ...] = ("VSCE_PAT", "OVSX_PAT")
"""The environment variables vsce and ovsx read their publishing tokens from."""

MIN_NODE_MAJOR: int = 22
"""The oldest Node major version the ovsx CLI supports."""


class ReleaseError(Exception):
    """A problem that stops the release, reported to the user without a traceback."""


def echo_command(cmd: Sequence[str], cwd: Path) -> None:
    """Print a command the way a user could run it, noting the directory when it isn't the repository."""

    prefix = "" if cwd == REPO else f"(in {cwd}) "
    print(f"$ {prefix}{shlex.join(cmd)}", flush=True)


def run(cmd: Sequence[str], cwd: Path = REPO, capture: bool = False, env: Mapping[str, str] | None = None) -> str:
    """Echo and run a command, raising ReleaseError if it fails.

    With capture, stdout is returned (stderr still goes to the terminal); otherwise output goes to the terminal and an
    empty string is returned. env adds variables (such as one publishing token) for this command only; they are not
    echoed.
    """

    echo_command(cmd, cwd)
    full_env = {**os.environ, **env} if env else None

    try:
        result = subprocess.run(
            cmd, cwd=cwd, check=True, text=True, stdout=subprocess.PIPE if capture else None, env=full_env
        )
    except FileNotFoundError as e:
        raise ReleaseError(f"{cmd[0]} was not found.") from e
    except subprocess.CalledProcessError as e:
        raise ReleaseError(f"Command failed with exit status {e.returncode}: {shlex.join(cmd)}") from e

    return result.stdout or ""


def git_output(*args: str) -> str:
    """Run a read-only git command quietly and return its stripped stdout."""

    return subprocess.run(["git", *args], cwd=REPO, check=True, text=True, capture_output=True).stdout.strip()


def warn_or_fail(message: str, dry_run: bool) -> None:
    """Report a missing publishing prerequisite: a warning in a dry run, an error otherwise."""

    if dry_run:
        print(f"warning: {message}", flush=True)
    else:
        raise ReleaseError(message)


def read_unreleased_notes() -> str:
    """Return the body of the changelog's "## Unreleased" section, raising ReleaseError if it is missing or empty."""

    lines = CHANGELOG.read_text(encoding="utf-8").splitlines()

    try:
        start = lines.index(UNRELEASED_HEADING) + 1
    except ValueError as e:
        raise ReleaseError(f'{CHANGELOG.name} has no "{UNRELEASED_HEADING}" heading.') from e

    end = start
    while end < len(lines) and not lines[end].startswith("## "):
        end += 1

    notes = "\n".join(lines[start:end]).strip()
    if not notes:
        raise ReleaseError(f'The "{UNRELEASED_HEADING}" section of {CHANGELOG.name} is empty.')

    return notes + "\n"


def rename_unreleased_heading(version: str) -> None:
    """Replace the changelog's "## Unreleased" heading with a heading for the released version."""

    text = CHANGELOG.read_text(encoding="utf-8")
    text = re.sub(rf"^{re.escape(UNRELEASED_HEADING)}$", f"## {version}", text, count=1, flags=re.MULTILINE)
    CHANGELOG.write_text(text, encoding="utf-8")


def check_tools() -> None:
    """Make sure the programs the release runs are on PATH."""

    missing = [tool for tool in ("git", "node", "npm", "npx", "uv", "gh") if shutil.which(tool) is None]
    if missing:
        raise ReleaseError(f"Missing required programs: {', '.join(missing)}.")

    node_version = subprocess.run(["node", "--version"], capture_output=True, text=True, check=True).stdout.strip()
    match = re.match(r"v(\d+)\.", node_version)
    if match is None or int(match[1]) < MIN_NODE_MAJOR:
        raise ReleaseError(f"ovsx needs Node {MIN_NODE_MAJOR} or later, but node is {node_version}.")


def check_git_state() -> None:
    """Require a clean working tree on the release branch, matching the remote after fetching tags."""

    if git_output("status", "--porcelain"):
        raise ReleaseError("The working tree has uncommitted changes.")

    branch = git_output("rev-parse", "--abbrev-ref", "HEAD")
    if branch != BRANCH:
        raise ReleaseError(f"Releases are made from {BRANCH}, but {branch} is checked out.")

    run(["git", "fetch", "--tags", REMOTE])

    if git_output("rev-parse", "HEAD") != git_output("rev-parse", f"{REMOTE}/{BRANCH}"):
        raise ReleaseError(f"{BRANCH} is not the same as {REMOTE}/{BRANCH}. Pull or push first.")


def load_tokens() -> dict[str, str]:
    """Collect the publishing tokens from the environment and .env, and remove them from this process's environment.

    Removing them keeps the tokens away from subprocesses that don't need them (tests, git hooks, Ren'Py); each is
    passed only to its own registry's commands. A non-empty value in the environment wins over .env. In .env, lines
    look like KEY=VALUE, optionally prefixed by "export " and with the value in single or double quotes; blank lines
    and lines starting with # are ignored, as are keys other than TOKEN_VARIABLES. Values are never printed.
    """

    tokens = {}
    for variable in TOKEN_VARIABLES:
        value = os.environ.pop(variable, "")
        if value:
            tokens[variable] = value

    if not ENV_FILE.is_file():
        return tokens

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.removeprefix("export ").split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]

        if key in TOKEN_VARIABLES and value and key not in tokens:
            tokens[key] = value

    return tokens


def check_publishing_access(publisher: str, tokens: Mapping[str, str], dry_run: bool) -> None:
    """Check the registry tokens and the gh login without printing any secret."""

    for variable, tool in zip(TOKEN_VARIABLES, ("vsce", "ovsx"), strict=True):
        if variable not in tokens:
            warn_or_fail(
                f"{variable} is not set in the environment or {ENV_FILE.name}, so {tool} can't publish.", dry_run
            )
            continue

        try:
            run(["npx", tool, "verify-pat", publisher], env={variable: tokens[variable]})
        except ReleaseError:
            warn_or_fail(f"{variable} can't publish as {publisher}.", dry_run)

    if subprocess.run(["gh", "auth", "status"], cwd=REPO, capture_output=True, check=False).returncode != 0:
        warn_or_fail("gh is not logged in (run gh auth login).", dry_run)


def compute_version(renpy_dir: Path) -> str:
    """Return the next extension version for the Ren'Py checkout in renpy_dir.

    Ren'Py X.Y.Z maps to (X*100+Y).Z.N, with N one more than the highest existing v(X*100+Y).Z.* tag, or 0.
    """

    if not (renpy_dir / "distribute.py").is_file():
        raise ReleaseError(f"{renpy_dir} is not a Ren'Py checkout (no distribute.py). Use --renpy.")

    output = run(["uv", "run", "distribute.py", "--print-version=short"], cwd=renpy_dir, capture=True)
    lines = output.strip().splitlines()
    renpy_version = lines[-1].strip() if lines else ""

    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", renpy_version)
    if match is None:
        raise ReleaseError(f"Expected a Ren'Py version like 8.6.2, but distribute.py printed {output!r}.")

    major = int(match[1]) * 100 + int(match[2])
    minor = int(match[3])

    patches = []
    for tag in git_output("tag", "--list", f"v{major}.{minor}.*").splitlines():
        tag_match = re.fullmatch(rf"v{major}\.{minor}\.(\d+)", tag)
        if tag_match:
            patches.append(int(tag_match[1]))

    patch = max(patches) + 1 if patches else 0

    print(f"Ren'Py {renpy_version} -> extension version {major}.{minor}.{patch}", flush=True)
    return f"{major}.{minor}.{patch}"


def run_checks(skip_tests: bool) -> None:
    """Run lint, the format check, and (unless skipped) the tests, under xvfb-run when there is no display."""

    run(["npm", "run", "lint"])
    run(["npm", "run", "format:check"])

    if skip_tests:
        print("Skipping tests.", flush=True)
        return

    test = ["npm", "test"]
    if not os.environ.get("DISPLAY") and shutil.which("xvfb-run"):
        test = ["xvfb-run", "-a", *test]

    run(test)


@dataclass
class Plan:
    """The commands that change state, in the order they run, so a dry run can print them and a failure can list what
    remains."""

    steps: list[tuple[str, list[str], str | None]] = field(default_factory=list)
    """(description, command, token variable) triples; a command of [] is an action the script performs itself, and
    the token variable names the one publishing token the command is given, if any."""

    def add(self, description: str, command: list[str] | None = None, token: str | None = None) -> None:
        """Append a step."""

        self.steps.append((description, command or [], token))


def build_plan(version: str, vsix: Path, notes_file: Path, pre_release: bool) -> Plan:
    """Lay out every state-changing step of the release."""

    pre = ["--pre-release"] if pre_release else []
    tag = f"v{version}"
    vsix_arg = str(vsix.relative_to(REPO))

    plan = Plan()
    plan.add("Set the version", ["npm", "version", version, "--no-git-tag-version", "--allow-same-version"])
    plan.add(f'Rename "{UNRELEASED_HEADING}" to "## {version}" in {CHANGELOG.name}')
    plan.add(
        "Commit",
        ["git", "commit", "-m", f"Release {version}.", "--", "package.json", "package-lock.json", CHANGELOG.name],
    )
    plan.add("Tag", ["git", "tag", "-a", tag, "-m", version])
    plan.add("Package", ["npx", "vsce", "package", *pre, "-o", vsix_arg])
    plan.add("Push", ["git", "push", "--atomic", REMOTE, BRANCH, tag])
    plan.add(
        "Publish to the Visual Studio Marketplace",
        ["npx", "vsce", "publish", "--packagePath", vsix_arg, *pre],
        "VSCE_PAT",
    )
    plan.add("Publish to Open VSX", ["npx", "ovsx", "publish", vsix_arg, *pre], "OVSX_PAT")
    plan.add(
        "Create a draft GitHub release",
        [
            "gh",
            "release",
            "create",
            tag,
            vsix_arg,
            "--draft",
            "--verify-tag",
            *(["--prerelease"] if pre_release else []),
            "--title",
            version,
            "--notes-file",
            str(notes_file),
        ],
    )

    return plan


def format_step(command: list[str], token: str | None) -> str:
    """Render a step's command for the user, noting the token it needs without revealing it."""

    return shlex.join(command) + (f"    # needs {token} set" if token else "")


def execute_plan(plan: Plan, version: str, tokens: Mapping[str, str]) -> None:
    """Run the plan's steps, giving each command only the token it needs, and explain how to recover if one fails."""

    pushed = False

    for index, (description, command, token) in enumerate(plan.steps):
        print(f"\n== {description}", flush=True)

        try:
            if command:
                run(command, env={token: tokens[token]} if token else None)
            else:
                rename_unreleased_heading(version)
        except ReleaseError:
            print(f"\nThe release stopped at: {description}.", file=sys.stderr)

            if pushed:
                print("The commit and tag are pushed. Finish by hand with:", file=sys.stderr)
                for _, remaining, remaining_token in plan.steps[index:]:
                    print(f"  {format_step(remaining, remaining_token)}", file=sys.stderr)
                print("Don't rerun this script; it would pick the next version.", file=sys.stderr)
            else:
                print(
                    "Nothing has been pushed or published. Inspect and undo local changes before retrying,",
                    file=sys.stderr,
                )
                print(f"for example with: git tag -d v{version}; git reset --hard {REMOTE}/{BRANCH}", file=sys.stderr)

            raise

        if command[:2] == ["git", "push"]:
            pushed = True


def print_plan(plan: Plan) -> None:
    """Show what a real release would do."""

    print("\nA real release would run:", flush=True)
    for description, command, token in plan.steps:
        print(f"  # {description}")
        if command:
            print(f"  {format_step(command, token)}")


def package_dry_run(pre_release: bool) -> None:
    """Build a .vsix of the current tree into a temporary directory to check that packaging works."""

    with tempfile.TemporaryDirectory(prefix="renpy-release-") as tmp:
        vsix = Path(tmp) / "language-renpy-dry-run.vsix"
        run(["npx", "vsce", "package", *(["--pre-release"] if pre_release else []), "-o", str(vsix)])
        print(f"Packaged {vsix.stat().st_size} bytes; the dry-run package is discarded.", flush=True)


def parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    """Parse the command line."""

    parser = argparse.ArgumentParser(description="Release the extension to the Visual Studio Marketplace and Open VSX.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="run the checks and print what would happen, without committing, pushing, or publishing",
    )
    parser.add_argument("--pre-release", action="store_true", help="publish as a pre-release")
    parser.add_argument("--skip-tests", action="store_true", help="don't run npm test")
    parser.add_argument(
        "--renpy",
        type=Path,
        default=REPO.parent / "renpy",
        help="Ren'Py checkout that determines the version (default: %(default)s)",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    """Run the release, or a dry run of it."""

    args = parse_args(argv)

    # uv run sets VIRTUAL_ENV to this script's environment; don't let it leak into the uv run inside Ren'Py.
    os.environ.pop("VIRTUAL_ENV", None)
    publisher = json.loads((REPO / "package.json").read_text(encoding="utf-8"))["publisher"]

    try:
        print("== Preflight", flush=True)
        tokens = load_tokens()
        check_tools()
        check_git_state()
        notes = read_unreleased_notes()
        check_publishing_access(publisher, tokens, args.dry_run)

        print("\n== Version", flush=True)
        version = compute_version(args.renpy.resolve())
        if git_output("tag", "--list", f"v{version}"):
            raise ReleaseError(f"Tag v{version} already exists.")

        print("\n== Checks", flush=True)
        run_checks(args.skip_tests)

        vsix = REPO / f"language-renpy-{version}.vsix"

        # Not a TemporaryDirectory: if a step after the push fails, the printed recovery commands still need the notes.
        notes_dir = Path(tempfile.mkdtemp(prefix="renpy-release-notes-"))
        notes_file = notes_dir / "notes.md"
        notes_file.write_text(notes, encoding="utf-8")
        plan = build_plan(version, vsix, notes_file, args.pre_release)

        if args.dry_run:
            print("\n== Package (dry run)", flush=True)
            package_dry_run(args.pre_release)
            print(f"\nRelease notes for {version}{' (pre-release)' if args.pre_release else ''}:\n")
            print(notes)
            print_plan(plan)
            print("\nDry run complete; nothing was committed, pushed, or published.")
        else:
            execute_plan(plan, version, tokens)
            print(f"\nReleased {version}. Review and publish the draft GitHub release.")

        shutil.rmtree(notes_dir, ignore_errors=True)

    except ReleaseError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
