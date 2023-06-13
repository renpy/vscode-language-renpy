import { performance } from "perf_hooks";
import { DecorationOptions, Disposable, ExtensionContext, MarkdownString, Uri, window, workspace } from "vscode";
import { CharacterTokenType, LiteralTokenType, EntityTokenType, EscapedCharacterTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { TokenTree, tokenTypeToStringMap } from "./token-definitions";
import { Tokenizer } from "./tokenizer";
import { LogLevel, logMessage, logToast } from "../logger";

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

const deprecatedDecorationType = window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "dotted",
    borderColor: "#f44747",
    textDecoration: "underline wavy yellow 2px",
});

const allDecorationTypes = [
    keywordDecorationType,
    controlKeywordDecorationType,
    typeDecorationType,
    functionDecorationType,
    variableDecorationType,
    entityDecorationType,
    commentDecorationType,
    stringDecorationType,
    metaDecorationType,
    constantDecorationType,
    numberDecorationType,
    colorDecorationType,
    operatorDecorationType,
    characterDecorationType,
    specialCharacterDecorationType,
    escCharacterDecorationType,
    errorDecorationType,
];

let tokenCache: TokenTree;
let documentVersion = -1;
let documentUri: Uri | null = null;

let textChangedEvent: Disposable | null = null;
let activeEditorChangedEvent: Disposable | null = null;

export async function registerDebugDecorator(context: ExtensionContext) {
    await triggerUpdateDecorations();

    // A TextDocument was changed
    context.subscriptions.push(
        (textChangedEvent = workspace.onDidChangeTextDocument(async (event) => {
            const activeEditor = window.activeTextEditor;

            if (activeEditor && event.document === activeEditor.document) {
                await triggerUpdateDecorations(true);
            }
        }))
    );

    // The active text editor was changed
    context.subscriptions.push(
        (activeEditorChangedEvent = window.onDidChangeActiveTextEditor(async () => {
            await triggerUpdateDecorations();
        }))
    );
}

export function unregisterDebugDecorator() {
    textChangedEvent?.dispose();
    activeEditorChangedEvent?.dispose();

    const activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    // Clear all decorations
    allDecorationTypes.forEach((x) => activeEditor.setDecorations(x, []));
}

async function updateDecorations() {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    if (documentVersion !== activeEditor.document.version || documentUri !== activeEditor.document.uri || tokenCache.count() === 0) {
        documentVersion = activeEditor.document.version;
        documentUri = activeEditor.document.uri;

        // Update tokens only if document has changed
        const t0 = performance.now();
        tokenCache = await Tokenizer.tokenizeDocument(activeEditor.document);
        const t1 = performance.now();

        logToast(LogLevel.Info, `DocumentTokenizer took ${(t1 - t0).toFixed(2)} milliseconds to complete.`);
    }

    const tokens = tokenCache;

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
    const deprecated: DecorationOptions[] = [];

    tokens.forEach((node) => {
        const token = node.token;
        if (!token) {
            return;
        }

        const range = token.getVSCodeRange();
        const content = activeEditor?.document.getText(range);

        const decoration: DecorationOptions = {
            range: range,
            hoverMessage: {
                language: "text",
                value: `Token: ${tokenTypeToStringMap[token.tokenType]}(id: ${token.tokenType})
Start: {Line: ${range.start.line + 1}, Char: ${range.start.character + 1}}
End: {Line: ${range.end.line + 1}, Char: ${range.end.character + 1}}
Content: {${content?.replaceAll("\n", "\\n")}}`,
            },
        };

        // Debug line and char numbers
        const start = activeEditor?.document.positionAt(token.startPos.charStartOffset);
        const end = activeEditor?.document.positionAt(token.endPos.charStartOffset);
        if (range.start.line !== start.line) {
            logMessage(
                LogLevel.Error,
                `Start line number is incorrect!. Got: ${range.start.line + 1}, expected: ${start.line + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`
            );
        }

        if (range.end.line !== end.line) {
            logMessage(
                LogLevel.Error,
                `End line number is incorrect!. Got: ${range.end.line + 1}, expected: ${end.line + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`
            );
        }

        // Debug char numbers
        if (range.start.character !== start.character) {
            logMessage(
                LogLevel.Error,
                `Start char number is incorrect!. Got: ${range.start.character + 1}, expected: ${start.character + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`
            );
        }

        if (range.end.character !== end.character) {
            logMessage(
                LogLevel.Error,
                `End char number is incorrect!. Got: ${range.end.character + 1}, expected: ${end.character + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`
            );
        }

        switch (token.tokenType) {
            case KeywordTokenType.Init: // Python statement keywords
            case KeywordTokenType.Offset:
            case KeywordTokenType.Python:
            case KeywordTokenType.Hide:
            case KeywordTokenType.Early:
            case KeywordTokenType.Define:
            case KeywordTokenType.Default:
            case KeywordTokenType.Label: // Renpy keywords
            case KeywordTokenType.Menu:
            case KeywordTokenType.Pause:
            case KeywordTokenType.Style:
            case KeywordTokenType.Screen:
            case KeywordTokenType.Scene:
            case KeywordTokenType.Camera:
            case KeywordTokenType.Show:
            case KeywordTokenType.Image:
            case KeywordTokenType.LayeredImage:
            case KeywordTokenType.Window:
            case KeywordTokenType.Frame:
            case KeywordTokenType.Transform:
            case KeywordTokenType.Translate:
            case KeywordTokenType.Extend:
            case KeywordTokenType.NVLClear:
            case KeywordTokenType.Voice: // Audio
            case KeywordTokenType.Sound:
            case KeywordTokenType.Play:
            case KeywordTokenType.Queue:
            case KeywordTokenType.Stop:
            case KeywordTokenType.Fadeout:
            case KeywordTokenType.Set: // Renpy sub expression keywords
            case KeywordTokenType.Expression:
            case KeywordTokenType.Animation:
            case KeywordTokenType.From:
            case KeywordTokenType.Time:
            case KeywordTokenType.Repeat:
            case KeywordTokenType.DollarSign:
            case KeywordTokenType.Sensitive:
            case KeywordTokenType.Text:
            case KeywordTokenType.Other:
            case KeywordTokenType.OtherPython:
            case KeywordTokenType.OtherAudio:
            case KeywordTokenType.Take: // Renpy style sub-expression keywords
            case KeywordTokenType.Del:
            case KeywordTokenType.Clear:
            case KeywordTokenType.Variant:
            case KeywordTokenType.Vbox: // Renpy screen sub-expression keywords
            case KeywordTokenType.Hbox:
            case KeywordTokenType.Warp: // ATL keywords
            case KeywordTokenType.Circles:
            case KeywordTokenType.Clockwise:
            case KeywordTokenType.Counterclockwise:
            case KeywordTokenType.Event:
            case KeywordTokenType.On:
            case KeywordTokenType.Function:
            case KeywordTokenType.Import: // Python keywords
            case KeywordTokenType.Class:
            case KeywordTokenType.Metaclass:
            case KeywordTokenType.Lambda:
            case KeywordTokenType.Async:
            case KeywordTokenType.Def:
            case KeywordTokenType.Global:
            case KeywordTokenType.Nonlocal:
            case LiteralTokenType.Boolean: // Language keywords
            case OperatorTokenType.And:
            case OperatorTokenType.Or:
            case OperatorTokenType.Not:
            case OperatorTokenType.Is:
            case OperatorTokenType.IsNot:
            case OperatorTokenType.NotIn:
                keywords.push(decoration);
                break;

            case KeywordTokenType.If: // Conditional control flow keywords
            case KeywordTokenType.Elif:
            case KeywordTokenType.Else:
            case KeywordTokenType.In: // Control flow keywords
            case KeywordTokenType.For:
            case KeywordTokenType.While:
            case KeywordTokenType.Pass:
            case KeywordTokenType.Return:
            case KeywordTokenType.Jump:
            case KeywordTokenType.Call:
            case KeywordTokenType.Contains:
            case KeywordTokenType.Parallel:
            case KeywordTokenType.Block:
            case KeywordTokenType.Choice:
            case KeywordTokenType.At: // Renpy control flow keywords
            case KeywordTokenType.As:
            case KeywordTokenType.With:
            case KeywordTokenType.Onlayer:
            case KeywordTokenType.Zorder:
            case KeywordTokenType.Behind:
                controlKeywords.push(decoration);
                break;

            case EntityTokenType.ClassName: // Types
            case EntityTokenType.InheritedClassName:
            case EntityTokenType.TypeName:
            case EntityTokenType.NamespaceName:
                types.push(decoration);
                break;

            // Functions
            case EntityTokenType.FunctionName:
            case EntityTokenType.EventName:
                functions.push(decoration);
                break;

            // Variables
            case EntityTokenType.VariableName:
            case EntityTokenType.StyleName:
            case EntityTokenType.ImageName:
            case EntityTokenType.TextName:
            case EntityTokenType.AudioName:
            case EntityTokenType.CharacterName:
            case EntityTokenType.PropertyName:
                variables.push(decoration);
                break;

            // Other entities
            case EntityTokenType.TagName:
                otherEntities.push(decoration);
                break;

            // Comments
            case MetaTokenType.Comment:
            case MetaTokenType.CommentCodeTag:
            case MetaTokenType.CommentRegionTag:
            case MetaTokenType.TypehintComment:
            case MetaTokenType.TypehintDirective:
            case MetaTokenType.TypehintIgnore:
            case MetaTokenType.TypehintType:
            case MetaTokenType.TypehintPunctuation:
            case MetaTokenType.TypehintVariable:
            case MetaTokenType.Docstring:
                comments.push(decoration);
                break;

            case MetaTokenType.StringBegin:
            case MetaTokenType.StringEnd:
            case MetaTokenType.SimpleExpression:
            case MetaTokenType.CodeBlock:
            case MetaTokenType.PythonLine:
            case MetaTokenType.PythonBlock:
            case MetaTokenType.Arguments:
            case MetaTokenType.EmptyString:
            case MetaTokenType.StringTag:
            case MetaTokenType.TagBlock:
            case MetaTokenType.TaggedString:
            case MetaTokenType.Placeholder:
            case MetaTokenType.MenuStatement:
            case MetaTokenType.MenuBlock:
            case MetaTokenType.MenuOption:
            case MetaTokenType.MenuOptionBlock:
            case MetaTokenType.BehindStatement:
            case MetaTokenType.OnlayerStatement:
            case MetaTokenType.CameraStatement:
            case MetaTokenType.SceneStatement:
            case MetaTokenType.ShowStatement:
            case MetaTokenType.ImageStatement:
            case MetaTokenType.CallStatement:
            case MetaTokenType.JumpStatement:
            case MetaTokenType.PlayAudioStatement:
            case MetaTokenType.QueueAudioStatement:
            case MetaTokenType.StopAudioStatement:
            case MetaTokenType.LabelStatement:
            case MetaTokenType.LabelCall:
            case MetaTokenType.LabelAccess:
            case MetaTokenType.AtStatement:
            case MetaTokenType.AsStatement:
            case MetaTokenType.WithStatement:
            case MetaTokenType.ScreenStatement:
            case MetaTokenType.ScreenSensitive:
            case MetaTokenType.ScreenFrame:
            case MetaTokenType.ScreenWindow:
            case MetaTokenType.ScreenText:
            case MetaTokenType.ScreenBlock:
            case MetaTokenType.StyleStatement:
            case MetaTokenType.StyleBlock:
            case MetaTokenType.NarratorSayStatement:
            case MetaTokenType.SayStatement:
            case MetaTokenType.CharacterNameString:
            case MetaTokenType.SayNarrator:
            case MetaTokenType.SayCharacter:
            case MetaTokenType.AtParameters:
            case MetaTokenType.AsParameters:
            case MetaTokenType.BehindParameters:
            case MetaTokenType.OnlayerParameters:
            case MetaTokenType.WithParameters:
            case MetaTokenType.ZorderParameters:
            case MetaTokenType.PauseParameters:
            case MetaTokenType.ATLBlock:
            case MetaTokenType.ATLChoiceBlock:
            case MetaTokenType.TransformBlock:
            case MetaTokenType.ATLContains:
            case MetaTokenType.ATLWith:
            case MetaTokenType.ATLEvent:
            case MetaTokenType.ATLFunction:
            case MetaTokenType.ATLWarper:
            case MetaTokenType.ATLOn:
            case MetaTokenType.MemberAccess:
            case MetaTokenType.ItemAccess:
            case MetaTokenType.IndexedName:
            case MetaTokenType.Attribute:
            case MetaTokenType.ClassDefinition:
            case MetaTokenType.ClassInheritance:
            case MetaTokenType.FunctionDefinition:
            case MetaTokenType.LambdaFunction:
            case MetaTokenType.FunctionLambdaParameters:
            case MetaTokenType.FunctionParameters:
            case MetaTokenType.FunctionDecorator:
            case MetaTokenType.FunctionCall:
            case MetaTokenType.FunctionCallGeneric:
            case MetaTokenType.Fstring:
            case MetaTokenType.ControlFlowKeyword:
            case MetaTokenType.LogicalOperatorKeyword:
            case MetaTokenType.Operator:
            case MetaTokenType.ArithmeticOperator:
            case MetaTokenType.BitwiseOperatorKeyword:
            case MetaTokenType.ComparisonOperatorKeyword:
            case MetaTokenType.ConstantLiteral:
            case MetaTokenType.ConstantNumeric:
            case MetaTokenType.ConstantCaps:
            case MetaTokenType.BuiltinExceptionType:
            case MetaTokenType.BuiltinType:
            case MetaTokenType.MagicVariable:
            case MetaTokenType.EscapeSequence:
            case MetaTokenType.FormatPercent:
            case MetaTokenType.FormatBrace:
            case MetaTokenType.StringStorageType:
            case MetaTokenType.FormatStorageType:
            case MetaTokenType.ImaginaryNumberStorageType:
            case MetaTokenType.NumberStorageType:
            case MetaTokenType.ClassStorageType:
            case MetaTokenType.CommentBegin:
            case MetaTokenType.CommentEnd:
            case MetaTokenType.Backreference:
            case MetaTokenType.BackreferenceNamed:
            case MetaTokenType.CharacterSet:
            case MetaTokenType.Named:
            case MetaTokenType.ModifierFlagStorageType:
                otherMeta.push(decoration);
                break;

            // Strings
            case LiteralTokenType.String:
            case LiteralTokenType.UnquotedString:
                strings.push(decoration);
                break;

            // Colors
            case LiteralTokenType.Color:
                {
                    const colorDecoration: DecorationOptions = {
                        range: range,
                        hoverMessage: content,
                        renderOptions: {
                            before: { color: content },
                        },
                    };
                    colors.push(colorDecoration);
                }
                break;

            // Numbers
            case LiteralTokenType.Integer:
            case LiteralTokenType.Float:
                numbers.push(decoration);
                break;

            case OperatorTokenType.Plus: // Arithmatic operators
            case OperatorTokenType.Minus:
            case OperatorTokenType.Multiply:
            case OperatorTokenType.Divide:
            case OperatorTokenType.Modulo:
            case OperatorTokenType.Exponentiate:
            case OperatorTokenType.FloorDivide:
            case OperatorTokenType.BitwiseAnd: // Bitwise operators
            case OperatorTokenType.BitwiseOr:
            case OperatorTokenType.BitwiseXOr:
            case OperatorTokenType.BitwiseNot:
            case OperatorTokenType.BitwiseLeftShift:
            case OperatorTokenType.BitwiseRightShift:
            case OperatorTokenType.Assignment: // Assignment operators
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
            case OperatorTokenType.Equals: // Comparison operators
            case OperatorTokenType.NotEquals:
            case OperatorTokenType.GreaterThan:
            case OperatorTokenType.LessThan:
            case OperatorTokenType.GreaterThanEquals:
            case OperatorTokenType.LessThanEquals:
                operators.push(decoration);
                break;

            case CharacterTokenType.Whitespace:
            case CharacterTokenType.NewLine:
            case CharacterTokenType.Period:
            case CharacterTokenType.Colon:
            case CharacterTokenType.Semicolon:
            case CharacterTokenType.Comma:
            case CharacterTokenType.Hashtag:
            case CharacterTokenType.Caret:
            case CharacterTokenType.DollarSymbol:
            case CharacterTokenType.AtSymbol:
            case CharacterTokenType.EqualsSymbol:
            case CharacterTokenType.Quote:
            case CharacterTokenType.DoubleQuote:
            case CharacterTokenType.BackQuote:
            case CharacterTokenType.Backslash:
            case CharacterTokenType.ForwardSlash:
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

            case EscapedCharacterTokenType.EscWhitespace:
            case EscapedCharacterTokenType.EscNewline:
            case EscapedCharacterTokenType.EscQuote:
            case EscapedCharacterTokenType.EscDoubleQuote:
            case EscapedCharacterTokenType.EscBackslash:
            case EscapedCharacterTokenType.EscOpenSquareBracket:
            case EscapedCharacterTokenType.EscOpenBracket:
                escCharacters.push(decoration);
                break;

            case CharacterTokenType.Unknown:
            case MetaTokenType.Invalid:
                errors.push(decoration);
                break;

            case MetaTokenType.Deprecated:
                deprecated.push(decoration);
                break;

            default:
                throw new Error(`Unhandled token case: ${tokenTypeToStringMap[token.tokenType]}(id: ${token.tokenType})`);
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
    activeEditor.setDecorations(deprecatedDecorationType, deprecated);
}

async function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    if (throttle) {
        timeout = setTimeout(async () => {
            await updateDecorations();
        }, 500);
    } else {
        await updateDecorations();
    }
}
