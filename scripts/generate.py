import pathlib
import yaml
import json

import syntax_to_token_pattern

import keywords

def apply_keywords(o):
    """
    Recursively apply keywords to a data structure.
    """

    if isinstance(o, dict):
        return {k: apply_keywords(v) for k, v in o.items()}

    elif isinstance(o, list):
        return [apply_keywords(i) for i in o]

    elif isinstance(o, str):
        rv = o
        rv = rv.replace("(?:STYLE_PROPERTIES)", keywords.style_property_regex)
        return rv

    return o

def convert_file(filename: pathlib.Path):
    """
    Convert a .tmLanguage.yaml file to .tmLanguage.json
    """
    destination = filename.with_suffix(".json")

    with open(filename, "r") as f:
        data = yaml.safe_load(f)

    data = apply_keywords(data)

    data["information_for_contributors"].insert(
        0,
        f"This file is generated from syntaxes/{filename.name}. Please edit that file instead.",
    )

    output = json.dumps(data, indent=2)

    try:
        old_text = destination.read_text()
        if old_text == output:
            return False
    except FileNotFoundError:
        pass

    destination.write_text(output)


def main():

    ROOT = pathlib.Path(__file__).parent.parent

    generated = False

    for filename in ROOT.glob("syntaxes/*.tmLanguage.yaml"):
        generated = generated or convert_file(filename)

    print("Generated .tmLanguage.json files from .tmLanguage.yaml files.")

    if generated:
        syntax_to_token_pattern.generate_token_patterns()
        print("Generated token patterns.")



if __name__ == "__main__":
    main()
