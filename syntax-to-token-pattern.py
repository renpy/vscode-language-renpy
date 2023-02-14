import json
import re
from typing import Any

PATTERN_PREFIX = "python#"

# load the input data from the file
with open("./syntaxes/renpy.python.tmLanguage.json", "r") as file:
    data = json.load(file)

# get the repository value
repository = data.get("repository", {})

# Create an empty list to store the typescript strings
typescript_entries: list[str] = []

def get_indent(indent: int) -> str:
    return " " * indent

def camelCase(st: str):
    output = ''.join(x for x in st.title() if x.isalnum())
    return output[0].lower() + output[1:]

def get_token_type(name: str) -> str:
    if "invalid." in name:
        return "MetaTokenType.Invalid"
    elif "storage.type.string." in name:
        return "LiteralTokenType.String"

    tokenPrefix = ""
    token = name.replace(".python", "")

    if "meta." in token:
        tokenPrefix = "MetaTokenType."
        token = token.replace("meta.", "")
    elif "keyword." in token:
        tokenPrefix = "KeywordTokenType."
        token = token.replace("keyword.", "")
    elif "entity." in token:
        tokenPrefix = "EntityTokenType."
        token = token.replace("entity.", "")
    
    return "MetaTokenType.Invalid" # tokenPrefix + camelCase(token)

def get_match_str(match: str, hasCaptures: bool) -> str:
    match = match.replace("/", "\\/") # Escape forward slashes
    mFlag: str = "m" if re.search("(?<!\\[)[\\^$]", match) != None else ""
    dFlag: str = "d" if hasCaptures else ""
    return f"/{match}/{dFlag}g{mFlag}"

def transform_captures(indent: int, captures: dict[str, Any]) -> str:
    typescript_entry = "{\n"
    indent += 4

    for key, value in captures.items():
        typescript_entry += f"{get_indent(indent)}{key}: {transform_pattern(indent, value)},\n"

    indent -= 4
    typescript_entry += f"{get_indent(indent)}}},\n"
    return typescript_entry

def transform_pattern(indent: int, value: dict[str, Any]) -> str:
    typescript_entry = "{\n"
    indent += 4

    # Add comments
    if "comment" in value:
        comment = value["comment"].replace("\n", f"\n{get_indent(indent)}// ")
        typescript_entry += f"{get_indent(indent)}// {comment}\n"
    
    # Add token type
    if "name" in value:
        name = value["name"]
        token = get_token_type(name)
        typescript_entry += f"{get_indent(indent)}token: {token}, // {name}\n"

    if "contentName" in value:
        name = value["contentName"]
        token = get_token_type(name)
        typescript_entry += f"{get_indent(indent)}contentToken: {token}, // {name}\n"

    # Add match
    if "match" in value:
        match = get_match_str(value["match"], "captures" in value)
        typescript_entry += f"{get_indent(indent)}match: {match},\n"

    # Iterate through the captures in the value
    if "captures" in value:
        typescript_entry += f"{get_indent(indent)}captures: "
        typescript_entry += transform_captures(indent, value["captures"])

    if "begin" in value:
        match = get_match_str(value["begin"], "beginCaptures" in value)
        typescript_entry += f"{get_indent(indent)}begin: {match},\n"

    # Iterate through the beginCaptures in the value
    if "beginCaptures" in value:
        typescript_entry += f"{get_indent(indent)}beginCaptures: "
        typescript_entry += transform_captures(indent, value["beginCaptures"])

    if "end" in value:
        match = get_match_str(value["end"], "endCaptures" in value)
        typescript_entry += f"{get_indent(indent)}end: {match},\n"

    # Iterate through the endCaptures in the value
    if "endCaptures" in value:
        typescript_entry += f"{get_indent(indent)}endCaptures: "
        typescript_entry += transform_captures(indent, value["endCaptures"])

    # Iterate through the patterns in the value
    if "patterns" in value:
        patterns = value["patterns"]
        typescript_entry += f"{get_indent(indent)}patterns: [\n"
        indent += 4

        for i in range(len(patterns)):
            pattern = patterns[i]

            # Handle includes
            if "include" in pattern:
                include = camelCase(PATTERN_PREFIX + pattern["include"])
                typescript_entry += f"{get_indent(indent)}{include},\n"
                continue

            typescript_entry += get_indent(indent)
            typescript_entry += transform_pattern(indent, pattern)
            typescript_entry += ",\n"

        indent -= 4
        typescript_entry += f"{get_indent(indent)}]\n"

    indent -= 4
    typescript_entry += f"{get_indent(indent)}}}"
    return typescript_entry


# Iterate through the repository entries
for key, value in repository.items():
    patternName = camelCase(PATTERN_PREFIX + key)
    typescript_entry = f"export const {patternName}: TokenPattern = "

    typescript_entry += transform_pattern(0, value)
    
    typescript_entry += ";\n"

    # Add the typescript entry to the list of entries
    typescript_entries.append(typescript_entry)

# Write the typescript entries to a file
with open("./src/tokenizer/generated.output.ts", "w") as file:
    contents: str = "import { KeywordTokenType, LiteralTokenType, MetaTokenType } from \"./renpy-tokens\";\n"
    contents += "import { TokenPattern } from \"./token-pattern-types\";\n\n"
    contents += "\n".join(typescript_entries)
    file.write(contents)
