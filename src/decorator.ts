import { DecorationOptions, ExtensionContext, window, workspace } from "vscode";
import { tokenizeDocument } from "./tokenizer";

let timeout: NodeJS.Timer | undefined = undefined;

const keywordDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#569cd6",
});

const controlKeywordDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#C586C0",
});

const entityDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#9CDCFE",
    fontWeight: "bold",
});

const typeDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4EC9B0",
});

const functionDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#DCDCAA",
});

const variableDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#9CDCFE",
});

const metaDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#D4D4D4",
    fontWeight: "bold",
});

const commentDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#6A9955",
});

const stringDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#ce9178",
});

const constantDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#DCDCAA",
    fontWeight: "bold",
    //Constants and enums: "#4FC1FF"
});

const colorDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#9CDCFE",
});

const numberDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#b5cea8",
    //Constants and enums: "#4FC1FF"
});

const operatorDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#D4D4D4",
});

const characterDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#569cd6",
    backgroundColor: "#569cd633",
});

const specialCharacterDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#569cd6",
});

const escCharacterDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d7ba7d",
});

const errorDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "dotted",
    borderColor: "#f44747",
    textDecoration: "underline wavy red 2px",
});

function updateDecorations() {
    let activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    const tokens = tokenizeDocument(activeEditor.document);

    const keywords: DecorationOptions[] = [];
    const controlKeywords: DecorationOptions[] = [];

    const types: DecorationOptions[] = [];
    const functions: DecorationOptions[] = [];
    const variables: DecorationOptions[] = [];
    const otherEntities: DecorationOptions[] = [];

    const comments: DecorationOptions[] = [];
    const strings: DecorationOptions[] = [];
    const otherMeta: DecorationOptions[] = [];

    const numbers: DecorationOptions[] = [];
    const colors: DecorationOptions[] = [];
    const otherConstants: DecorationOptions[] = [];

    const operators: DecorationOptions[] = [];
    const characters: DecorationOptions[] = [];
    const specialCharacters: DecorationOptions[] = [];
    const escCharacters: DecorationOptions[] = [];

    const errors: DecorationOptions[] = [];

    tokens.forEach((token) => {
        const content = activeEditor?.document.getText(token.range);
        const decoration: DecorationOptions = { range: token.range, hoverMessage: token.tokenType.toString() + ": { " + content + " }" };
        switch (token.tokenType) {
            // Python statement keywords
            case KeywordTokenType.Init:
            case KeywordTokenType.Python:
            case KeywordTokenType.Hide:
            case KeywordTokenType.Early:
            case KeywordTokenType.Define:
            case KeywordTokenType.Default:

            // Renpy keywords
            case KeywordTokenType.Label:
            case KeywordTokenType.Play:
            case KeywordTokenType.Pause:
            case KeywordTokenType.Screen:
            case KeywordTokenType.Scene:
            case KeywordTokenType.Show:
            case KeywordTokenType.Image:
            case KeywordTokenType.Transform:

            // Renpy sub expression keywords
            case KeywordTokenType.Set:
            case KeywordTokenType.Expression:
            case KeywordTokenType.Sound:
            case KeywordTokenType.At:
            case KeywordTokenType.With:
            case KeywordTokenType.From:
            case KeywordTokenType.DollarSign:

            // Language keywords
            case ConstantTokenType.Boolean:
            case OperatorTokenType.And:
            case OperatorTokenType.Or:
            case OperatorTokenType.Not:
            case OperatorTokenType.Is:
            case OperatorTokenType.IsNot:
            case OperatorTokenType.In:
            case OperatorTokenType.NotIn:
                keywords.push(decoration);
                break;

            // Conditional control flow keywords
            case KeywordTokenType.If:
            case KeywordTokenType.Elif:
            case KeywordTokenType.Else:

            // Control flow keywords
            case KeywordTokenType.For:
            case KeywordTokenType.While:
            case KeywordTokenType.Pass:
            case KeywordTokenType.Return:
            case KeywordTokenType.Menu:
            case KeywordTokenType.Jump:
            case KeywordTokenType.Call:
                controlKeywords.push(decoration);
                break;

            // Types
            case EntityTokenType.Class:
            case EntityTokenType.Namespace:
                types.push(decoration);
                break;

            // Functions
            case EntityTokenType.Function:
                functions.push(decoration);
                break;

            // Variables
            case EntityTokenType.Variable:
                variables.push(decoration);
                break;

            // Other entities
            case EntityTokenType.Tag:
                otherEntities.push(decoration);
                break;

            // Comments
            case MetaTokenType.Comment:
                comments.push(decoration);
                break;

            case MetaTokenType.CommentCodeTag:
            case MetaTokenType.PythonLine:
            case MetaTokenType.PythonBlock:
            case MetaTokenType.Arguments:
            case MetaTokenType.Tag:
            case MetaTokenType.Placeholder:
            case MetaTokenType.Block:
            case MetaTokenType.EmptyString:
                otherMeta.push(decoration);
                break;

            // Strings
            case ConstantTokenType.String:
            case ConstantTokenType.UnquotedString:
                strings.push(decoration);
                break;

            // Colors
            case ConstantTokenType.Color:
                {
                    const colorDecoration: DecorationOptions = {
                        range: token.range,
                        hoverMessage: content,
                        renderOptions: {
                            before: { color: content },
                        },
                    };
                    colors.push(colorDecoration);
                }
                break;

            // Numbers
            case ConstantTokenType.Integer:
            case ConstantTokenType.Float:
                numbers.push(decoration);
                break;

            // Arithmatic operators
            case OperatorTokenType.Plus:
            case OperatorTokenType.Minus:
            case OperatorTokenType.Multiply:
            case OperatorTokenType.Divide:
            case OperatorTokenType.Modulo:
            case OperatorTokenType.Exponentiate:
            case OperatorTokenType.FloorDivide:

            // Bitwise operators
            case OperatorTokenType.BitwiseAnd:
            case OperatorTokenType.BitwiseOr:
            case OperatorTokenType.BitwiseXOr:
            case OperatorTokenType.BitwiseNot:
            case OperatorTokenType.BitwiseLeftShift:
            case OperatorTokenType.BitwiseRightShift:

            // Assignment operators
            case OperatorTokenType.Assign:
            case OperatorTokenType.PlusAssign:
            case OperatorTokenType.MinusAssign:
            case OperatorTokenType.MultiplyAssign:
            case OperatorTokenType.DivideAssign:
            case OperatorTokenType.ModuloAssign:
            case OperatorTokenType.ExponentiateAssign:
            case OperatorTokenType.FloorDivideAssign:
            case OperatorTokenType.BitwiseAndAssign:
            case OperatorTokenType.BitwiseOrAssign:
            case OperatorTokenType.BitwiseXOrAssign:
            case OperatorTokenType.BitwiseLeftShiftAssign:
            case OperatorTokenType.BitwiseRightShiftAssign:

            // Comparison operators
            case OperatorTokenType.Equals:
            case OperatorTokenType.NotEquals:
            case OperatorTokenType.GreaterThan:
            case OperatorTokenType.LessThan:
            case OperatorTokenType.GreaterThanEquals:
            case OperatorTokenType.LessThanEquals:
                operators.push(decoration);
                break;

            case CharacterTokenType.WhiteSpace:
            case CharacterTokenType.Colon:
            case CharacterTokenType.Semicolon:
            case CharacterTokenType.Comma:
            case CharacterTokenType.Hashtag:
            case CharacterTokenType.Quote:
            case CharacterTokenType.DoubleQuote:
            case CharacterTokenType.BackQuote:
            case CharacterTokenType.Backslash:
                characters.push(decoration);
                break;

            case CharacterTokenType.OpenParentheses:
            case CharacterTokenType.CloseParentheses:
            case CharacterTokenType.OpenBracket:
            case CharacterTokenType.CloseBracket:
            case CharacterTokenType.OpenSquareBracket:
            case CharacterTokenType.CloseSquareBracket:
                specialCharacters.push(decoration);
                break;

            case EscapedCharacterTokenType.Escaped_Whitespace:
            case EscapedCharacterTokenType.Escaped_Newline:
            case EscapedCharacterTokenType.Escaped_Quote:
            case EscapedCharacterTokenType.Escaped_DoubleQuote:
            case EscapedCharacterTokenType.Escaped_Backslash:
            case EscapedCharacterTokenType.Escaped_OpenSquareBracket:
            case EscapedCharacterTokenType.Escaped_OpenBracket:
                escCharacters.push(decoration);
                break;

            case CharacterTokenType.Unknown:
            case MetaTokenType.Invalid:
                errors.push(decoration);
                break;
        }
    });

    activeEditor.setDecorations(keywordDecorationType, keywords);
    activeEditor.setDecorations(controlKeywordDecorationType, controlKeywords);

    activeEditor.setDecorations(typeDecorationType, types);
    activeEditor.setDecorations(functionDecorationType, functions);
    activeEditor.setDecorations(variableDecorationType, variables);
    activeEditor.setDecorations(entityDecorationType, otherEntities);

    activeEditor.setDecorations(commentDecorationType, comments);
    activeEditor.setDecorations(stringDecorationType, strings);
    activeEditor.setDecorations(metaDecorationType, otherMeta);

    activeEditor.setDecorations(constantDecorationType, otherConstants);
    activeEditor.setDecorations(numberDecorationType, numbers);
    activeEditor.setDecorations(colorDecorationType, colors);

    activeEditor.setDecorations(operatorDecorationType, operators);

    activeEditor.setDecorations(characterDecorationType, characters);
    activeEditor.setDecorations(specialCharacterDecorationType, specialCharacters);
    activeEditor.setDecorations(escCharacterDecorationType, escCharacters);

    activeEditor.setDecorations(errorDecorationType, errors);
}

function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    if (throttle) {
        timeout = setTimeout(updateDecorations, 500);
    } else {
        updateDecorations();
    }
}

export function registerDecorator(context: ExtensionContext) {
    triggerUpdateDecorations();

    // A TextDocument was changed
    context.subscriptions.push(
        workspace.onDidChangeTextDocument((event) => {
            let activeEditor = window.activeTextEditor;

            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations(true);
            }
        })
    );

    // The active text editor was changed
    context.subscriptions.push(
        window.onDidChangeActiveTextEditor(() => {
            triggerUpdateDecorations();
        })
    );
}
