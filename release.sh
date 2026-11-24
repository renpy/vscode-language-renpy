#!/bin/bash
# Releases the extension to the Visual Studio Marketplace and Open VSX by running scripts/release.py through uv.
# All arguments are passed through; see ./release.sh --help. Use --dry-run to check a release without making it.

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# --project rather than --directory, so relative paths in the arguments (like --renpy) resolve against the caller's
# working directory.
exec uv run --project "$ROOT/scripts" "$ROOT/scripts/release.py" "$@"
