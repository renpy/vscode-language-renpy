import pathlib
import yaml
import json

import syntax_to_token_pattern


def convert_file(filename: pathlib.Path):
    """
    Convert a .tmLanguage.yaml file to .tmLanguage.json
    """
    destination = filename.with_suffix(".json")

    with open(filename, "r") as f:
        data = yaml.safe_load(f)

    data["information_for_contributors"].insert(
        0,
        f"This file is generated from syntaxes/{filename.name}. Please edit that file instead.",
    )

    with open(destination, "w") as f:
        json.dump(data, f, indent=2)


def main():

    ROOT = pathlib.Path(__file__).parent.parent
    for filename in ROOT.glob("syntaxes/*.tmLanguage.yaml"):
        convert_file(filename)

    print("Generated .tmLanguage.json files from .tmLanguage.yaml files.")

    syntax_to_token_pattern.generate_token_patterns()

    print("Generated token patterns.")



if __name__ == "__main__":
    main()
