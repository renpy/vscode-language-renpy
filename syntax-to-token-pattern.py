from datetime import datetime
import json
import re
from typing import Any

from dataclasses import dataclass, field

@dataclass
class GeneratorState:
    defined_variables: list[str] = field(default_factory=list[str])
    used_token_types: list[str] = field(default_factory=list[str])
    pattern_include_entries: list[str] = field(default_factory=list[str])
    external_pattern_include_entries: list[str] = field(default_factory=list[str])
    source_imports: list[str] = field(default_factory=list[str])

def get_indent(indent: int) -> str:
    return " " * indent

def camelCase(st: str):
    output = ''.join(x for x in st.title() if x.isalnum())
    return output[0].lower() + output[1:]

def titleCase(st: str):
    return ''.join(x for x in st.title() if x.isalnum())

def convert_token_type_split(name: str) -> str:
    token_parts = name.split(".")
    if len(token_parts) <= 1:
        return "Error"
    
    def get_part(index: int) -> str:
        if index >= len(token_parts):
            return ""
        return token_parts[index]
    
    def get_parts(range: slice) -> str:
        if range.start >= len(token_parts):
            return ""
        return ".".join(token_parts[range])
    
    if get_part(0) == "string":
        if get_part(1) == "quoted" and get_part(2) == "docstring":
            return "MetaTokenType.Docstring"
        else:
            return "LiteralTokenType.String"

    elif get_part(0) == "variable":
        return "EntityTokenType.VariableName"

    elif get_part(0) == "storage":
        if get_part(1) == "type":
            if get_part(2) == "string":
                return "MetaTokenType.StringStorageType"
            elif get_part(2) == "format":
                return "MetaTokenType.FormatStorageType"
            elif get_part(2) == "class":
                return "KeywordTokenType.Class"
            elif get_part(2) == "style":
                return "KeywordTokenType.Style"
            elif get_part(2) == "imaginary":
                return "MetaTokenType.ImaginaryNumberStorageType"
            elif get_part(2) == "number":
                return "MetaTokenType.NumberStorageType"
            elif get_part(2) == "function":
                if get_part(3) == "lambda":
                    return "KeywordTokenType.Lambda"
                elif get_part(3) == "async":
                    return "KeywordTokenType.Async"
                elif get_part(3) == "label":
                    return "KeywordTokenType.Label"
                else:
                    return "KeywordTokenType.Def"
                
        elif get_part(1) == "modifier":
            if get_part(2) == "declaration":
                return "KeywordTokenType." + titleCase(get_parts(slice(3, -1)))
            elif get_part(2) == "flag":
                return "MetaTokenType.ModifierFlagStorageType"
            
    elif get_part(0) == "constant":
        if get_part(1) == "numeric":
            if get_part(2) == "integer":
                return "LiteralTokenType.Integer"
            elif get_part(2) == "float":
                return "LiteralTokenType.Float"
            elif get_part(2) == "boolean":
                return "LiteralTokenType.Boolean"
            elif get_part(2) == "character":
                return "LiteralTokenType.Character"
            elif get_part(2) == "escape":
                return "LiteralTokenType.Escape"
            else:
                return "MetaTokenType.ConstantNumeric"
            
        elif get_part(1) == "language":
            return "MetaTokenType.ConstantLiteral"
        
        elif get_part(1) == "color":
            return "LiteralTokenType.Color"

        elif get_part(1) == "character":
            if get_part(2) == "escape":
                if get_part(3) == "python" or get_part(3) == "regexp":
                    return "MetaTokenType.EscapeSequence"
                else:
                    return "EscapedCharacterTokenType.Esc" + titleCase(get_parts(slice(3, -2)))
            
            elif get_part(2) == "unicode":
                return "MetaTokenType.EscapeSequence"

            elif get_part(2) == "set":
                return "MetaTokenType.CharacterSet"
            
            elif get_part(2) == "format" and get_part(3) == "placeholder":
                return "MetaTokenType.Placeholder"
                
        
        elif get_part(1) == "other":
            return "MetaTokenType.ConstantCaps"

    elif get_part(0) == "invalid":
        if get_part(1) == "deprecated":
            return "MetaTokenType.Deprecated"
        else:
            return "MetaTokenType.Invalid"
        
    elif get_part(0) == "debug":
        return "MetaTokenType.Invalid"

    elif get_part(0) == "punctuation":
        if get_part(1) == "definition":
            if get_part(2) == "tag" or get_part(2) == "dict" or get_part(2) == "inheritance":
                if get_part(3) == "begin":
                    return "CharacterTokenType.OpenBracket"
                elif get_part(3) == "end":
                    return "CharacterTokenType.CloseBracket"
                elif get_part(3) == "region":
                    return "MetaTokenType.CommentRegionTag"
                
            elif get_part(2) == "list":
                if get_part(3) == "begin":
                    return "CharacterTokenType.OpenSquareBracket"
                elif get_part(3) == "end":
                    return "CharacterTokenType.CloseSquareBracket"
            
            elif get_part(2) == "arguments" or get_part(2) == "parameters":
                if get_part(3) == "begin":
                    return "CharacterTokenType.OpenParentheses"
                elif get_part(3) == "end":
                    return "CharacterTokenType.CloseParentheses"

            elif get_part(2) == "string":
                if get_part(3) == "begin":
                    return "MetaTokenType.StringBegin"
                elif get_part(3) == "end":
                    return "MetaTokenType.StringEnd"
            
            elif get_part(2) == "comment":
                return "CharacterTokenType.Hashtag"
            elif get_part(2) == "decorator":
                return "CharacterTokenType.AtSymbol"
        
        elif get_part(1) == "parenthesis":
            if get_part(2) == "begin":
                return "CharacterTokenType.OpenParentheses"
            elif get_part(2) == "end":
                return "CharacterTokenType.CloseParentheses"
            
        elif get_part(1) == "bracket":
            if get_part(2) == "begin":
                return "CharacterTokenType.OpenBracket"
            elif get_part(2) == "end":
                return "CharacterTokenType.CloseBracket"
            
        elif get_part(1) == "square-bracket":
            if get_part(2) == "begin":
                return "CharacterTokenType.OpenSquareBracket"
            elif get_part(2) == "end":
                return "CharacterTokenType.CloseSquareBracket"
            
        elif get_part(1) == "section":
            if get_part(3) == "begin" or get_part(4) == "begin":
                return "CharacterTokenType.Colon"
                
        elif get_part(1) == "separator":
            if get_part(2) == "parameters" or get_part(2) == "arguments" or get_part(2) == "element" or get_part(2) == "inheritance":
                return "CharacterTokenType.Comma"
            elif get_part(2) == "dict" or get_part(2) == "annotation" or get_part(2) == "slice":
                return "CharacterTokenType.Colon"
            elif get_part(2) == "continuation":
                return "CharacterTokenType.Backslash"
            elif get_part(2) == "key-value":
                return "CharacterTokenType.EqualsSymbol"
            else:
                return "CharacterTokenType." + titleCase(get_part(2))
            
        elif get_part(1) == "character":
            if get_part(2) == "set":
                if get_part(3) == "begin":
                    return "CharacterTokenType.OpenSquareBracket"
                elif get_part(3) == "end":
                    return "CharacterTokenType.CloseSquareBracket"
        
        elif get_part(1) == "comment":
            if get_part(2) == "begin":
                return "MetaTokenType.CommentBegin"
            elif get_part(2) == "end":
                return "MetaTokenType.CommentEnd"
        
        else:
            return "CharacterTokenType." + titleCase(get_part(1))
    
    elif get_part(0) == "support":
        if get_part(1) == "type":
            if get_part(2) == "property-name":
                return "EntityTokenType.PropertyName"
            elif get_part(2) == "class":
                return "EntityTokenType.ClassName"
            elif get_part(2) == "function":
                return "EntityTokenType.FunctionName"
            elif get_part(2) == "variable":
                return "EntityTokenType.VariableName"
            elif get_part(2) == "namespace":
                return "EntityTokenType.NamespaceName"
            elif get_part(2) == "metaclass":
                return "KeywordTokenType.Metaclass"
            elif get_part(2) == "exception":
                return "MetaTokenType.BuiltinExceptionType"
            else:
                return "MetaTokenType.BuiltinType"
        
        elif get_part(1) == "variable":
            return "EntityTokenType.VariableName"

        elif get_part(1) == "function":
            if get_part(2) == "event":
                return "EntityTokenType.EventName"
            else:
                return "EntityTokenType.FunctionName"
            
        elif get_part(1) == "other":
            if get_part(2) == "match":
                if get_part(3) == "any":
                    return "CharacterTokenType.Period"
                elif get_part(3) == "begin":
                    return "CharacterTokenType.Caret"
                elif get_part(3) == "end":
                    return "CharacterTokenType.DollarSymbol"
                
            elif get_part(2) == "escape":
                return "MetaTokenType.EscapeSequence"

    elif get_part(0) == "comment":
        if get_part(1) == "typehint":
            return "MetaTokenType.Typehint" + titleCase(get_part(2))
        else:
            return "MetaTokenType.Comment"

    elif get_part(0) == "keyword":
        if get_part(1) == "operator":
            if get_part(2) == "arithmetic":
                if get_part(3) == "python" or get_part(3) == "renpy":
                    return "MetaTokenType.ArithmeticOperator"
                else:
                    return "OperatorTokenType." + titleCase(get_part(3))
            elif get_part(2) == "logical":
                    return "MetaTokenType.LogicalOperatorKeyword"
            elif get_part(2) == "bitwise":
                    return "MetaTokenType.BitwiseOperatorKeyword"
            elif get_part(2) == "comparison":
                    return "MetaTokenType.ComparisonOperatorKeyword"
            elif get_part(2) == "python":
                    return "MetaTokenType.Operator"
            elif get_part(2) == "unpacking":
                return "OperatorTokenType." + titleCase(get_part(2))
            else:
                return "OperatorTokenType." + titleCase(get_parts(slice(2, -1)))
        
        elif get_part(1) == "codetag":
            return "MetaTokenType.CommentCodeTag"
        
        elif get_part(1) == "control":
            if get_part(2) == "flow":
                if get_part(3) == "python" or get_part(3) == "renpy": # TODO
                    return "MetaTokenType.ControlFlowKeyword"
                else:
                    return "KeywordTokenType." + titleCase(get_part(3))
            elif get_part(2) == "import":
                return "KeywordTokenType.Import"
            elif get_part(2) == "conditional":
                return "KeywordTokenType.If"
        
        elif get_part(1) == "illegal" and get_part(2) == "name":
            return "MetaTokenType.Invalid"
        else:
            return "KeywordTokenType." + titleCase(get_parts(slice(1, -1)))

    elif get_part(0) == "entity":
        if get_part(1) == "name":
            if get_part(2) == "type":
                return "EntityTokenType." + titleCase(get_part(3)) + "Name"
            else:
                return "EntityTokenType." + titleCase(get_part(2)) + "Name"
        
        elif get_part(1) == "other":
            if get_part(2) == "inherited-class":
                return "EntityTokenType.InheritedClassName"

    elif get_part(0) == "meta":
        if get_part(1) == "embedded":
            if get_part(2) == "block":
                return "MetaTokenType.PythonBlock"
            elif get_part(2) == "line":
                return "MetaTokenType.PythonLine"
            
        elif get_part(1) == "arguments" or get_part(2) == "arguments" or get_part(3) == "arguments":
            return "MetaTokenType.Arguments"
        
        elif get_part(1) == "function-call":
            if get_part(2) == "label":
                return "MetaTokenType.LabelCall"
            else:
                return "MetaTokenType.FunctionCall"
            
        elif get_part(1) == "member":
            if get_part(2) == "access":
                if get_part(3) == "label":
                    return "MetaTokenType.LabelAccess"
                else:
                    return "MetaTokenType.MemberAccess"
        
        elif get_part(1) == "string":
            if get_part(2) == "tag":
                return "MetaTokenType.StringTag"
            elif get_part(2) == "character":
                return "MetaTokenType.CharacterNameString"
            
        elif (get_part(1) == "class" or get_part(1) == "function") and get_part(2) != "inheritance":
            return "MetaTokenType." + titleCase(get_part(1)) + "Definition"

        else:
            return "MetaTokenType." + titleCase(get_parts(slice(1, -1)))

    return "Error" + " /*Error: Could not convert token type*/"

def get_token_type(state: GeneratorState, name: str) -> str:
    token = name.split(" ")[-1] # Multi-tokens are not yet supported. For now assume the last token is the important one
    token = convert_token_type_split(token)

    import_token_type = token.split(".")[0]
    if not import_token_type in state.used_token_types:
        state.used_token_types.append(import_token_type)

    return token.replace("Atl", "ATL") # Upper case ATL

def get_match_str(match: str, hasCaptures: bool) -> str:
    match = match.replace("/", "\\/") # Escape forward slashes

    iFlagSet = False
    if "(?i)" in match:
        iFlagSet = True
        match = match.replace("(?i)", "")

    match = match.replace("[:alpha:]", "a-zA-Z")
    match = match.replace("[:alnum:]", "a-zA-Z0-9")
    match = match.replace("[:upper:]", "A-Z")

    iFlag: str = "i" if iFlagSet else ""
    mFlag: str = "m" if re.search("(?<!\\[)[\\^$]", match) != None else ""
    dFlag: str = "d" if hasCaptures else ""
    return f"/{match}/{dFlag}g{iFlag}{mFlag}"

def transform_captures(state: GeneratorState, indent: int, captures: dict[str, Any], access_str: str) -> str:
    typescript_entry = "{\n"
    indent += 4

    for key, value in captures.items():
        capture_access_str = f"{access_str}[{key}]"
        typescript_entry += f"{get_indent(indent)}{key}: {transform_pattern(state, indent, value, capture_access_str)},\n"

    indent -= 4
    typescript_entry += f"{get_indent(indent)}}},\n"
    return typescript_entry

def transform_pattern(state: GeneratorState, indent: int, value: dict[str, Any], access_str: str) -> str:
    typescript_entry = "{\n"
    indent += 4

    # Add debugName for patterns with regex
    if "match" in value or "begin" in value or "end" in value:
        typescript_entry += f"{get_indent(indent)}debugName: \"{access_str}\",\n\n"

    # Add comments
    if "comment" in value:
        comment = value["comment"].replace("\n", f"\n{get_indent(indent)}// ")
        typescript_entry += f"{get_indent(indent)}// {comment}\n"
    
    # Add token type
    if "name" in value:
        name = value["name"]
        token = get_token_type(state, name)
        typescript_entry += f"{get_indent(indent)}token: {token}, /*{name}*/\n"

    if "contentName" in value:
        name = value["contentName"]
        token = get_token_type(state, name)
        typescript_entry += f"{get_indent(indent)}contentToken: {token}, /*{name}*/\n"

    # Add match
    if "match" in value:
        match = get_match_str(value["match"], "captures" in value)
        typescript_entry += f"{get_indent(indent)}match: {match},\n"

    # Iterate through the captures in the value
    if "captures" in value:
        typescript_entry += f"{get_indent(indent)}captures: "
        typescript_entry += transform_captures(state, indent, value["captures"], f"{access_str}.captures!")

    if "begin" in value:
        match = get_match_str(value["begin"], "beginCaptures" in value)
        typescript_entry += f"{get_indent(indent)}begin: {match},\n"

    # Iterate through the beginCaptures in the value
    if "beginCaptures" in value:
        typescript_entry += f"{get_indent(indent)}beginCaptures: "
        typescript_entry += transform_captures(state, indent, value["beginCaptures"], f"{access_str}.beginCaptures!")

    if "end" in value:
        match = get_match_str(value["end"], "endCaptures" in value)
        typescript_entry += f"{get_indent(indent)}end: {match},\n"

    # Iterate through the endCaptures in the value
    if "endCaptures" in value:
        typescript_entry += f"{get_indent(indent)}endCaptures: "
        typescript_entry += transform_captures(state, indent, value["endCaptures"], f"{access_str}.endCaptures!")

    # Iterate through the patterns in the value
    if "patterns" in value:
        patterns = value["patterns"]
        typescript_entry += f"{get_indent(indent)}patterns: [\n"
        indent += 4

        includes: list[tuple[str, int]] = []
        external_includes: list[tuple[str, int]] = []
        last_pattern_index = 0

        # Handle includes first to make sure they are pushed in the correct order
        for i in range(len(patterns)):
            pattern = patterns[i]

            if "include" not in pattern:
                last_pattern_index = i
                continue

            include: str = pattern["include"]

            if include.startswith("source.renpy"):
                include_parts = include.split("#")

                source = include_parts[0]
                reference = include_parts[1] if len(include_parts) > 1 else None

                language = source.split(".")[-1]
                language_accessor = titleCase(language) + "Patterns."

                if reference == None:
                    include = language_accessor + language
                else:
                    include = language_accessor + camelCase(reference)
                
                if language not in state.source_imports:
                    state.source_imports.append(language)
                
                external_includes.append((include, i))
            else:
                include = camelCase(include)

                # All includes that have not been defined yet, are pushed at the bottom of the file
                if include not in state.defined_variables:
                    includes.append((include, i))
                else:
                    last_pattern_index = i

        # Add the includes to the list of includes
        def process_includes(include_list: list[tuple[str, int]], entries_list: list[str]):
            push_list: list[str] = []
            for i in range(len(include_list)):
                [include, index] = include_list[i]
                if index < last_pattern_index: # 0 < 0
                    entries_list.append(f"{access_str}.patterns!.splice({index}, 0, {include});")
                else:
                    push_list.append(include)

            if len(push_list) > 0:
                entries_list.append(f"{access_str}.patterns!.push({', '.join(push_list)});")

        if len(includes) > 0:
            process_includes(includes, state.pattern_include_entries)
            last_pattern_index = includes[-1][1]

        if len(external_includes) > 0:
            process_includes(external_includes, state.external_pattern_include_entries)

        # Now write the pattern source
        for i in range(len(patterns)):
            pattern = patterns[i]

            # Handle includes
            if "include" in pattern:
                include: str = pattern["include"]
                if include.startswith("source.renpy"):
                    continue

                include = camelCase(include)
                if include in state.defined_variables:
                    typescript_entry += f"{get_indent(indent)}{include},\n"
                
                continue

            typescript_entry += get_indent(indent)
            typescript_entry += transform_pattern(state, indent, pattern, f"{access_str}.patterns![{i}]")
            typescript_entry += ",\n"

        indent -= 4
        typescript_entry += f"{get_indent(indent)}]\n"

    indent -= 4
    typescript_entry += f"{get_indent(indent)}}}"
    return typescript_entry

def generate_file(state: GeneratorState, source_file: str, output_file: str):
    # load the input data from the file
    with open(source_file, "r") as file:
        data = json.load(file)
    
    # get the repository value
    repository = data.get("repository", {})

    # Iterate through the repository entries
    src_lines: list[str] = []
    for key, value in repository.items():
        patternName = camelCase(key)

        # Keep track of the defined variables to reduce the amount of variables we need to push later
        state.defined_variables.append(patternName)

        typescript_entry = f"export const {patternName}: TokenPattern = "

        typescript_entry += transform_pattern(state, 0, value, patternName)
        
        typescript_entry += ";\n"

        # Add the typescript entry to the list of entries
        src_lines.append(typescript_entry)

    # Write the typescript entries to a file
    with open(output_file, "w") as file:
        eslint_comments: list[str] = [
            "/* eslint-disable no-useless-escape */",
            "/* eslint-disable no-useless-backreference */",
            "/* eslint-disable @typescript-eslint/no-non-null-assertion */",
        ]
        
        contents: str = "\n".join(eslint_comments) + "\n\n"
        contents += "// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR\n"
        contents += "// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.\n"
        contents += "// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.\n"
        contents += f"// Last generated: {datetime.utcnow().strftime('%d/%m/%Y %H:%M:%S')} (UTC+0)\n"
        contents += "\n"

        contents += f"import {{ {', '.join(state.used_token_types)} }} from \"./renpy-tokens\";\n"
        contents += "import { TokenPattern } from \"./token-pattern-types\";\n\n"
        contents += "\n".join(src_lines)

        if len(state.pattern_include_entries) > 0:
            contents += "\n// Push pattern references that were not defined on include\n"
            contents += "\n".join(state.pattern_include_entries)

        # Remove any newlines from the body of a single line array
        contents = re.sub(r':\s*\[\n\s*([^,]*),\n?\s*\]', r': [\1]', contents, flags=re.MULTILINE)

        # Remove any newlines from the body of a single line definition
        contents = re.sub(r':\s*{\n\s*(.*)\n?\s*}', r': { \1 }', contents, flags=re.MULTILINE)

        file.write(contents)

def generate_token_patterns():
    renpy_state = GeneratorState()
    atl_state = GeneratorState()
    screen_state = GeneratorState()
    python_state = GeneratorState()

    generate_file(renpy_state, "./syntaxes/renpy.tmLanguage.json", "./src/tokenizer/renpy-token-patterns.g.ts")
    generate_file(atl_state, "./syntaxes/renpy.atl.tmLanguage.json", "./src/tokenizer/atl-token-patterns.g.ts")
    generate_file(screen_state, "./syntaxes/renpy.screen.tmLanguage.json", "./src/tokenizer/screen-token-patterns.g.ts")
    generate_file(python_state, "./syntaxes/renpy.python.tmLanguage.json", "./src/tokenizer/python-token-patterns.g.ts")

    # Write the typescript entries to a file
    output_file = "./src/tokenizer/token-patterns.g.ts"
    with open(output_file, "w") as file:
        contents = "/* eslint-disable @typescript-eslint/no-non-null-assertion */\n\n"
        contents += "// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR\n"
        contents += "// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.\n"
        contents += "// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.\n"
        contents += f"// Last generated: {datetime.utcnow().strftime('%d/%m/%Y %H:%M:%S')} (UTC+0)\n"
        contents += "\n"

        # Add all source import from all states, but only the unique ones
        source_imports = set(renpy_state.source_imports + atl_state.source_imports + screen_state.source_imports + python_state.source_imports)
        
        for source_import in source_imports:
            contents += f"import * as {titleCase(source_import)}Patterns from \"./{source_import}-token-patterns.g\";\n"

        def add_entries(entries: list[str], prefix: str) -> str:
            contents = ""
            if len(entries) > 0:
                contents += f"\n// Push all {prefix} external includes\n"
                for entry in entries:
                    contents += f"{prefix}.{entry}\n"

            return contents

        contents += add_entries(renpy_state.external_pattern_include_entries, "RenpyPatterns")
        contents += add_entries(atl_state.external_pattern_include_entries, "AtlPatterns")
        contents += add_entries(screen_state.external_pattern_include_entries, "ScreenPatterns")
        contents += add_entries(python_state.external_pattern_include_entries, "PythonPatterns")

        exports: list[str] = []
        for source_import in source_imports:
            exports.append(f"{titleCase(source_import)}Patterns")

        contents += f"\n\nexport {{ {', '.join(exports)} }};"

        file.write(contents)

# main
generate_token_patterns()