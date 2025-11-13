import argparse
import json
import yaml
import pathlib


INTEGER_KEYS = {str(i): i for i in range(10)}


def update_object(o):
    if isinstance(o, dict):
        return {INTEGER_KEYS.get(k, k): update_object(v) for k, v in o.items()}
    elif isinstance(o, list):
        return [update_object(i) for i in o]
    else:
        return o


def main():
    ap = argparse.ArgumentParser(description="Convert JSON to YAML")
    ap.add_argument("files", nargs="+", help="JSON files to convert")

    for i in ap.parse_args().files:

        with open(i, "r") as f:
            data = json.load(f)

        destination = pathlib.Path(i).with_suffix(".yaml")

        data = update_object(data)
        yaml_data = yaml.dump(data, indent=2, sort_keys=False)

        destination = pathlib.Path(i).with_suffix(".yaml")

        with open(destination, "w") as f:
            f.write(yaml_data)


if __name__ == "__main__":
    main()
