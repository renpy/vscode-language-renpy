from datetime import datetime
import json
from math import e
import re
from typing import Any

class GeneratorState:
    defined_variables: list[str] = []
    used_token_types: list[str] = []
    pattern_include_entries: list[str] = []
    python_imports: list[str] = []
    atl_imports: list[str] = []
    renpy_imports: list[str] = []
    pattern_prefix = ""

    def __init__(self, pattern_prefix: str):
        self.defined_variables = []
        self.used_token_types = []
        self.pattern_include_entries = []
        self.python_imports = []
        self.atl_imports = []
        self.renpy_imports = []
        self.pattern_prefix = pattern_prefix

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
            if (get_part(2) == "python" or get_part(2) =="block" or \
                    get_part(2) == "class" or get_part(2) == "function" or \
                    get_part(2) == "atl" or get_part(2) == "label" or \
                    get_part(2) == "menu" or get_part(2) == "menu-option"):
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
    token = name.split(" ")[0] # Multi-tokens are not yet supported. For now assume the first token is the important one
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

        includes: list[str] = []
        for i in range(len(patterns)):
            pattern = patterns[i]

            # Handle includes
            if "include" in pattern:
                include: str = pattern["include"]

                if include.startswith("source.renpy.python"):
                    include = camelCase(include.replace("source.renpy.python", "python"))
                    if include not in state.python_imports:
                        state.python_imports.append(include)
                        state.defined_variables.append(include)
                elif include.startswith("source.renpy.atl"):
                    include = camelCase(include.replace("source.renpy.atl", "atl"))
                    if include not in state.atl_imports:
                        state.atl_imports.append(include)
                        state.defined_variables.append(include)
                elif include.startswith("source.renpy"):
                    include = camelCase(include.replace("source.renpy", ""))
                    if include not in state.renpy_imports:
                        state.renpy_imports.append(include)
                        state.defined_variables.append(include)
                else:
                    include = camelCase(state.pattern_prefix + include)

                # All includes that have not been defined yet, are pushed at the bottom of the file
                if include not in state.defined_variables:
                    includes.append(include)
                else:
                    typescript_entry += f"{get_indent(indent)}{include},\n"
                continue

            typescript_entry += get_indent(indent)
            typescript_entry += transform_pattern(state, indent, pattern, f"{access_str}.patterns![{i}]")
            typescript_entry += ",\n"

        # Add the includes to the list of includes
        if len(includes) > 0:
            state.pattern_include_entries.append(f"{access_str}.patterns!.push({', '.join(includes)});")

        indent -= 4
        typescript_entry += f"{get_indent(indent)}]\n"

    indent -= 4
    typescript_entry += f"{get_indent(indent)}}}"
    return typescript_entry

def generate_file(source_file: str, output_file: str, pattern_prefix: str):
    state = GeneratorState(pattern_prefix)

    # load the input data from the file
    with open(source_file, "r") as file:
        data = json.load(file)
    
    # get the repository value
    repository = data.get("repository", {})

    # Iterate through the repository entries
    src_lines: list[str] = []
    for key, value in repository.items():
        patternName = camelCase(pattern_prefix + key)

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
        
        time_now = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S")

        contents: str = "\n".join(eslint_comments) + "\n\n"
        contents += "// THIS FILE HAS BEEN GENERATED BY THE `syntax-to-token-pattern.py` GENERATOR\n"
        contents += "// DO NOT EDIT THIS FILE DIRECTLY! INSTEAD RUN THE PYTHON SCRIPT.\n"
        contents += "// ANY MANUAL EDITS MADE TO THIS FILE WILL BE OVERWRITTEN. YOU HAVE BEEN WARNED.\n"
        contents += f"// Last generated: {time_now} (UTC+0)\n"
        contents += "\n"

        token_type_imports = ", ".join(state.used_token_types)
        contents += f"import {{ {token_type_imports} }} from \"./renpy-tokens\";\n"

        if len(state.python_imports) > 0:
            imports: str = ", ".join(state.python_imports)
            contents += f"import {{ {imports} }} from \"./python-token-patterns\";\n"

        if len(state.atl_imports) > 0:
            imports: str = ", ".join(state.atl_imports)
            contents += f"import {{ {imports} }} from \"./atl-token-patterns.g\";\n"

        if len(state.renpy_imports) > 0:
            imports: str = ", ".join(state.renpy_imports)
            contents += f"import {{ {imports} }} from \"./token-patterns\";\n"

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

generate_file("./syntaxes/renpy.tmLanguage.json", "./src/tokenizer/token-patterns.g.ts", "")
generate_file("./syntaxes/renpy.atl.tmLanguage.json", "./src/tokenizer/atl-token-patterns.g.ts", "")
generate_file("./syntaxes/renpy.python.tmLanguage.json", "./src/tokenizer/python-token-patterns.g.ts", "python#")