#!/bin/bash

set -e

# Get the full path to the Ren'Py directory
RENPY=${1:-"/home/tom/ab/renpy"}
RENPY=$( cd -- "${RENPY}" && pwd -P )

# Change to the root of the project.
cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/.."


JSON="$RENPY/sphinx/renpy.json"

if [ ! -e "$JSON" ]; then
    echo "Error: $JSON does not exist."
    echo "Ensure that sphinx has been built at least once, and run with $0 <path to renpy>".
    exit 1
fi

cp $JSON "src/renpy.json"
