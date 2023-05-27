import { performance } from "perf_hooks";
import { DecorationOptions, Disposable, ExtensionContext, MarkdownString, Uri, window, workspace } from "vscode";
import { CharacterTokenType, LiteralTokenType, EntityTokenType, EscapedCharacterTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { TokenTree } from "./token-definitions";
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

export function registerDebugDecorator(context: ExtensionContext) {
    triggerUpdateDecorations();

    // A TextDocument was changed
    context.subscriptions.push(
        (textChangedEvent = workspace.onDidChangeTextDocument((event) => {
            const activeEditor = window.activeTextEditor;

            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations(true);
            }
        }))
    );

    // The active text editor was changed
    context.subscriptions.push(
        (activeEditorChangedEvent = window.onDidChangeActiveTextEditor(() => {
            triggerUpdateDecorations();
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

function updateDecorations() {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    if (documentVersion !== activeEditor.document.version || documentUri !== activeEditor.document.uri || tokenCache.count() === 0) {
        documentVersion = activeEditor.document.version;
        documentUri = activeEditor.document.uri;

        // Update tokens only if document has changed
        const t0 = performance.now();
        tokenCache = tokenizeDocument(activeEditor.document);
        const t1 = performance.now();

        window.showInformationMessage(`DocumentTokenizer took ${(t1 - t0).toFixed(2)} milliseconds to complete.`);
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
            console.error(`Start line number is incorrect!. Got: ${range.start.line + 1}, expected: ${start.line + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`);
        }

        if (range.end.line !== end.line) {
            console.error(`End line number is incorrect!. Got: ${range.end.line + 1}, expected: ${end.line + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`);
        }

        // Debug char numbers
        if (range.start.character !== start.character) {
            console.error(`Start char number is incorrect!. Got: ${range.start.character + 1}, expected: ${start.character + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`);
        }

        if (range.end.character !== end.character) {
            console.error(`End char number is incorrect!. Got: ${range.end.character + 1}, expected: ${end.character + 1}. On token:
${(decoration.hoverMessage as MarkdownString).value}`);
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
            case KeywordTokenType.At:
            case KeywordTokenType.As:
            case KeywordTokenType.With:
            case KeywordTokenType.Onlayer:
            case KeywordTokenType.Zorder:
            case KeywordTokenType.Behind:
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
            case OperatorTokenType.In:
            case OperatorTokenType.NotIn:
                keywords.push(decoration);
                break;

            case KeywordTokenType.If: // Conditional control flow keywords
            case KeywordTokenType.Elif:
            case KeywordTokenType.Else:
            case KeywordTokenType.For: // Control flow keywords
            case KeywordTokenType.While:
            case KeywordTokenType.Pass:
            case KeywordTokenType.Return:
            case KeywordTokenType.Jump:
            case KeywordTokenType.Call:
            case KeywordTokenType.Contains:
            case KeywordTokenType.Parallel:
            case KeywordTokenType.Block:
            case KeywordTokenType.Choice:
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
            case MetaTokenType.ATLBlock:
            case MetaTokenType.ATLChoiceBlock:
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

// NOTE: Everything below is defined solely for this debug decorator.
// None of this should be used outside of this file! This is for debug purposes only!
type AllTokenTypes = typeof KeywordTokenType & typeof EntityTokenType & typeof MetaTokenType & typeof LiteralTokenType & typeof OperatorTokenType & typeof CharacterTokenType & typeof EscapedCharacterTokenType;

type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};

const tokenTypeDefinitions: EnumToString<AllTokenTypes> = {
    Init: { name: "Init", value: KeywordTokenType.Init },
    Offset: { name: "Offset", value: KeywordTokenType.Offset },
    Python: { name: "Python", value: KeywordTokenType.Python },
    Hide: { name: "Hide", value: KeywordTokenType.Hide },
    Early: { name: "Early", value: KeywordTokenType.Early },
    Define: { name: "Define", value: KeywordTokenType.Define },
    Default: { name: "Default", value: KeywordTokenType.Default },

    Label: { name: "Label", value: KeywordTokenType.Label },
    Menu: { name: "Menu", value: KeywordTokenType.Menu },
    Pause: { name: "Pause", value: KeywordTokenType.Pause },
    Screen: { name: "Screen", value: KeywordTokenType.Screen },
    Scene: { name: "Scene", value: KeywordTokenType.Scene },
    Camera: { name: "Camera", value: KeywordTokenType.Camera },
    Show: { name: "Show", value: KeywordTokenType.Show },
    Image: { name: "Image", value: KeywordTokenType.Image },
    LayeredImage: { name: "LayeredImage", value: KeywordTokenType.LayeredImage },
    Window: { name: "Window", value: KeywordTokenType.Window },
    Frame: { name: "Frame", value: KeywordTokenType.Frame },
    Transform: { name: "Transform", value: KeywordTokenType.Transform },
    Translate: { name: "Translate", value: KeywordTokenType.Translate },
    Extend: { name: "Extend", value: KeywordTokenType.Extend },
    NVLClear: { name: "NVLClear", value: KeywordTokenType.NVLClear },

    Voice: { name: "Voice", value: KeywordTokenType.Voice },
    Sound: { name: "Sound", value: KeywordTokenType.Sound },
    Play: { name: "Play", value: KeywordTokenType.Play },
    Queue: { name: "Queue", value: KeywordTokenType.Queue },
    Stop: { name: "Stop", value: KeywordTokenType.Stop },
    Fadeout: { name: "Fadeout", value: KeywordTokenType.Fadeout },

    Set: { name: "Set", value: KeywordTokenType.Set },
    Expression: { name: "Expression", value: KeywordTokenType.Expression },
    At: { name: "At", value: KeywordTokenType.At },
    As: { name: "As", value: KeywordTokenType.As },
    With: { name: "With", value: KeywordTokenType.With },
    Onlayer: { name: "Onlayer", value: KeywordTokenType.Onlayer },
    Zorder: { name: "Zorder", value: KeywordTokenType.Zorder },
    Behind: { name: "Behind", value: KeywordTokenType.Behind },
    Animation: { name: "Animation", value: KeywordTokenType.Animation },
    From: { name: "From", value: KeywordTokenType.From },
    Time: { name: "Time", value: KeywordTokenType.Time },
    Repeat: { name: "Repeat", value: KeywordTokenType.Repeat },
    DollarSign: { name: "DollarSign", value: KeywordTokenType.DollarSign },
    Sensitive: { name: "Sensitive", value: KeywordTokenType.Sensitive },
    Text: { name: "Text", value: KeywordTokenType.Text },
    Other: { name: "Other", value: KeywordTokenType.Other },
    OtherPython: { name: "OtherPython", value: KeywordTokenType.OtherPython },
    OtherAudio: { name: "OtherAudio", value: KeywordTokenType.OtherAudio },

    If: { name: "If", value: KeywordTokenType.If },
    Elif: { name: "Elif", value: KeywordTokenType.Elif },
    Else: { name: "Else", value: KeywordTokenType.Else },

    For: { name: "For", value: KeywordTokenType.For },
    While: { name: "While", value: KeywordTokenType.While },
    Pass: { name: "Pass", value: KeywordTokenType.Pass },
    Return: { name: "Return", value: KeywordTokenType.Return },
    Jump: { name: "Jump", value: KeywordTokenType.Jump },
    Call: { name: "Call", value: KeywordTokenType.Call },
    Contains: { name: "Contains", value: KeywordTokenType.Contains },
    Parallel: { name: "Parallel", value: KeywordTokenType.Parallel },
    Block: { name: "Block", value: KeywordTokenType.Block },
    Choice: { name: "Choice", value: KeywordTokenType.Choice },

    Warp: { name: "Warp", value: KeywordTokenType.Warp },
    Circles: { name: "Circles", value: KeywordTokenType.Circles },
    Clockwise: { name: "Clockwise", value: KeywordTokenType.Clockwise },
    Counterclockwise: { name: "Counterclockwise", value: KeywordTokenType.Counterclockwise },
    Event: { name: "Event", value: KeywordTokenType.Event },
    On: { name: "On", value: KeywordTokenType.On },
    Function: { name: "Function", value: KeywordTokenType.Function },

    Import: { name: "Import", value: KeywordTokenType.Import },
    Class: { name: "Class", value: KeywordTokenType.Class },
    Metaclass: { name: "Metaclass", value: KeywordTokenType.Metaclass },
    Lambda: { name: "Lambda", value: KeywordTokenType.Lambda },
    Async: { name: "Async", value: KeywordTokenType.Async },
    Def: { name: "Def", value: KeywordTokenType.Def },
    Global: { name: "Global", value: KeywordTokenType.Global },
    Nonlocal: { name: "Nonlocal", value: KeywordTokenType.Nonlocal },

    ClassName: { name: "ClassName", value: EntityTokenType.ClassName },
    InheritedClassName: { name: "InheritedClassName", value: EntityTokenType.InheritedClassName },
    TypeName: { name: "TypeName", value: EntityTokenType.TypeName },
    NamespaceName: { name: "NamespaceName", value: EntityTokenType.NamespaceName },
    FunctionName: { name: "FunctionName", value: EntityTokenType.FunctionName },
    TagName: { name: "TagName", value: EntityTokenType.TagName },
    VariableName: { name: "VariableName", value: EntityTokenType.VariableName },

    ImageName: { name: "ImageName", value: EntityTokenType.ImageName },
    TextName: { name: "TextName", value: EntityTokenType.TextName },
    AudioName: { name: "AudioName", value: EntityTokenType.AudioName },
    CharacterName: { name: "CharacterName", value: EntityTokenType.CharacterName },

    EventName: { name: "EventName", value: EntityTokenType.EventName },
    PropertyName: { name: "PropertyName", value: EntityTokenType.PropertyName },

    String: { name: "String", value: LiteralTokenType.String },
    UnquotedString: { name: "UnquotedString", value: LiteralTokenType.UnquotedString },

    Color: { name: "Color", value: LiteralTokenType.Color },

    Integer: { name: "Integer", value: LiteralTokenType.Integer },
    Float: { name: "Float", value: LiteralTokenType.Float },

    Boolean: { name: "Boolean", value: LiteralTokenType.Boolean },

    Plus: { name: "Plus", value: OperatorTokenType.Plus },
    Minus: { name: "Minus", value: OperatorTokenType.Minus },
    Multiply: { name: "Multiply", value: OperatorTokenType.Multiply },
    Divide: { name: "Divide", value: OperatorTokenType.Divide },
    Modulo: { name: "Modulo", value: OperatorTokenType.Modulo },
    Exponentiate: { name: "Exponentiate", value: OperatorTokenType.Exponentiate },
    FloorDivide: { name: "FloorDivide", value: OperatorTokenType.FloorDivide },

    BitwiseAnd: { name: "BitwiseAnd", value: OperatorTokenType.BitwiseAnd },
    BitwiseOr: { name: "BitwiseOr", value: OperatorTokenType.BitwiseOr },
    BitwiseXOr: { name: "BitwiseXOr", value: OperatorTokenType.BitwiseXOr },
    BitwiseNot: { name: "BitwiseNot", value: OperatorTokenType.BitwiseNot },
    BitwiseLeftShift: { name: "BitwiseLeftShift", value: OperatorTokenType.BitwiseLeftShift },
    BitwiseRightShift: { name: "BitwiseRightShift", value: OperatorTokenType.BitwiseRightShift },

    Assignment: { name: "Assignment", value: OperatorTokenType.Assignment },
    PlusAssign: { name: "PlusAssign", value: OperatorTokenType.PlusAssign },
    MinusAssign: { name: "MinusAssign", value: OperatorTokenType.MinusAssign },
    MultiplyAssign: { name: "MultiplyAssign", value: OperatorTokenType.MultiplyAssign },
    DivideAssign: { name: "DivideAssign", value: OperatorTokenType.DivideAssign },
    ModuloAssign: { name: "ModuloAssign", value: OperatorTokenType.ModuloAssign },
    ExponentiateAssign: { name: "ExponentiateAssign", value: OperatorTokenType.ExponentiateAssign },
    FloorDivideAssign: { name: "FloorDivideAssign", value: OperatorTokenType.FloorDivideAssign },
    BitwiseAndAssign: { name: "BitwiseAndAssign", value: OperatorTokenType.BitwiseAndAssign },
    BitwiseOrAssign: { name: "BitwiseOrAssign", value: OperatorTokenType.BitwiseOrAssign },
    BitwiseXOrAssign: { name: "BitwiseXOrAssign", value: OperatorTokenType.BitwiseXOrAssign },
    BitwiseLeftShiftAssign: { name: "BitwiseLeftShiftAssign", value: OperatorTokenType.BitwiseLeftShiftAssign },
    BitwiseRightShiftAssign: { name: "BitwiseRightShiftAssign", value: OperatorTokenType.BitwiseRightShiftAssign },

    Equals: { name: "Equals", value: OperatorTokenType.Equals },
    NotEquals: { name: "NotEquals", value: OperatorTokenType.NotEquals },
    GreaterThan: { name: "GreaterThan", value: OperatorTokenType.GreaterThan },
    LessThan: { name: "LessThan", value: OperatorTokenType.LessThan },
    GreaterThanEquals: { name: "GreaterThanEquals", value: OperatorTokenType.GreaterThanEquals },
    LessThanEquals: { name: "LessThanEquals", value: OperatorTokenType.LessThanEquals },

    And: { name: "And", value: OperatorTokenType.And },
    Or: { name: "Or", value: OperatorTokenType.Or },
    Not: { name: "Not", value: OperatorTokenType.Not },

    Is: { name: "Is", value: OperatorTokenType.Is },
    IsNot: { name: "IsNot", value: OperatorTokenType.IsNot },

    In: { name: "In", value: OperatorTokenType.In },
    NotIn: { name: "NotIn", value: OperatorTokenType.NotIn },

    Unpacking: { name: "Unpacking", value: OperatorTokenType.Unpacking },
    PositionalParameter: { name: "PositionalParameter", value: OperatorTokenType.PositionalParameter },

    Quantifier: { name: "Quantifier", value: OperatorTokenType.Quantifier },
    Disjunction: { name: "Disjunction", value: OperatorTokenType.Disjunction },
    Negation: { name: "Negation", value: OperatorTokenType.Negation },
    Lookahead: { name: "Lookahead", value: OperatorTokenType.Lookahead },
    LookaheadNegative: { name: "LookaheadNegative", value: OperatorTokenType.LookaheadNegative },
    Lookbehind: { name: "Lookbehind", value: OperatorTokenType.Lookbehind },
    LookbehindNegative: { name: "LookbehindNegative", value: OperatorTokenType.LookbehindNegative },
    Conditional: { name: "Conditional", value: OperatorTokenType.Conditional },
    ConditionalNegative: { name: "ConditionalNegative", value: OperatorTokenType.ConditionalNegative },

    Unknown: { name: "Unknown", value: CharacterTokenType.Unknown },

    OpenParentheses: { name: "OpenParentheses", value: CharacterTokenType.OpenParentheses },
    CloseParentheses: { name: "CloseParentheses", value: CharacterTokenType.CloseParentheses },

    OpenBracket: { name: "OpenBracket", value: CharacterTokenType.OpenBracket },
    CloseBracket: { name: "CloseBracket", value: CharacterTokenType.CloseBracket },

    OpenSquareBracket: { name: "OpenSquareBracket", value: CharacterTokenType.OpenSquareBracket },
    CloseSquareBracket: { name: "CloseSquareBracket", value: CharacterTokenType.CloseSquareBracket },

    Whitespace: { name: "Whitespace", value: CharacterTokenType.Whitespace },
    NewLine: { name: "NewLine", value: CharacterTokenType.NewLine },

    Period: { name: "Period", value: CharacterTokenType.Period },
    Colon: { name: "Colon", value: CharacterTokenType.Colon },
    Semicolon: { name: "Semicolon", value: CharacterTokenType.Semicolon },
    Comma: { name: "Comma", value: CharacterTokenType.Comma },
    Hashtag: { name: "Hashtag", value: CharacterTokenType.Hashtag },
    Caret: { name: "Caret", value: CharacterTokenType.Caret },
    DollarSymbol: { name: "DollarSymbol", value: CharacterTokenType.DollarSymbol },
    AtSymbol: { name: "AtSymbol", value: CharacterTokenType.AtSymbol },
    EqualsSymbol: { name: "EqualsSymbol", value: CharacterTokenType.EqualsSymbol },

    Quote: { name: "Quote", value: CharacterTokenType.Quote },
    DoubleQuote: { name: "DoubleQuote", value: CharacterTokenType.DoubleQuote },
    BackQuote: { name: "BackQuote", value: CharacterTokenType.BackQuote },

    Backslash: { name: "Backslash", value: CharacterTokenType.Backslash },
    ForwardSlash: { name: "ForwardSlash", value: CharacterTokenType.ForwardSlash },

    EscWhitespace: { name: "EscWhitespace", value: EscapedCharacterTokenType.EscWhitespace },
    EscNewline: { name: "EscNewline", value: EscapedCharacterTokenType.EscNewline },

    EscQuote: { name: "EscQuote", value: EscapedCharacterTokenType.EscQuote },
    EscDoubleQuote: { name: "EscDoubleQuote", value: EscapedCharacterTokenType.EscDoubleQuote },
    EscBackslash: { name: "EscBackslash", value: EscapedCharacterTokenType.EscBackslash },
    EscOpenSquareBracket: { name: "EscOpenSquareBracket", value: EscapedCharacterTokenType.EscOpenSquareBracket },
    EscOpenBracket: { name: "EscOpenBracket", value: EscapedCharacterTokenType.EscOpenBracket },

    Invalid: { name: "Invalid", value: MetaTokenType.Invalid },
    Deprecated: { name: "Deprecated", value: MetaTokenType.Deprecated },

    Comment: { name: "Comment", value: MetaTokenType.Comment },
    CommentCodeTag: { name: "CommentCodeTag", value: MetaTokenType.CommentCodeTag },
    CommentRegionTag: { name: "CommentRegionTag", value: MetaTokenType.CommentRegionTag },
    TypehintComment: { name: "TypehintComment", value: MetaTokenType.TypehintComment },
    TypehintDirective: { name: "TypehintDirective", value: MetaTokenType.TypehintDirective },
    TypehintIgnore: { name: "TypehintIgnore", value: MetaTokenType.TypehintIgnore },
    TypehintType: { name: "TypehintType", value: MetaTokenType.TypehintType },
    TypehintPunctuation: { name: "TypehintPunctuation", value: MetaTokenType.TypehintPunctuation },
    TypehintVariable: { name: "TypehintVariable", value: MetaTokenType.TypehintVariable },
    Docstring: { name: "Docstring", value: MetaTokenType.Docstring },

    StringBegin: { name: "StringBegin", value: MetaTokenType.StringBegin },
    StringEnd: { name: "StringEnd", value: MetaTokenType.StringEnd },

    CodeBlock: { name: "CodeBlock", value: MetaTokenType.CodeBlock },
    PythonLine: { name: "PythonLine", value: MetaTokenType.PythonLine },
    PythonBlock: { name: "PythonBlock", value: MetaTokenType.PythonBlock },
    Arguments: { name: "Arguments", value: MetaTokenType.Arguments },

    EmptyString: { name: "EmptyString", value: MetaTokenType.EmptyString },
    StringTag: { name: "StringTag", value: MetaTokenType.StringTag },
    TagBlock: { name: "TagBlock", value: MetaTokenType.TagBlock },
    TaggedString: { name: "TaggedString", value: MetaTokenType.TaggedString },
    Placeholder: { name: "Placeholder", value: MetaTokenType.Placeholder },

    MenuStatement: { name: "MenuStatement", value: MetaTokenType.MenuStatement },
    MenuBlock: { name: "MenuBlock", value: MetaTokenType.MenuBlock },
    MenuOption: { name: "MenuOption", value: MetaTokenType.MenuOption },
    MenuOptionBlock: { name: "MenuOptionBlock", value: MetaTokenType.MenuOptionBlock },

    LabelStatement: { name: "LabelStatement", value: MetaTokenType.LabelStatement },
    LabelCall: { name: "LabelCall", value: MetaTokenType.LabelCall },
    LabelAccess: { name: "LabelAccess", value: MetaTokenType.LabelAccess },

    BehindStatement: { name: "BehindStatement", value: MetaTokenType.BehindStatement },
    OnlayerStatement: { name: "OnlayerStatement", value: MetaTokenType.OnlayerStatement },
    ZorderStatement: { name: "ZorderStatement", value: MetaTokenType.ZorderStatement },
    AtStatement: { name: "AtStatement", value: MetaTokenType.AtStatement },
    AsStatement: { name: "AsStatement", value: MetaTokenType.AsStatement },
    WithStatement: { name: "WithStatement", value: MetaTokenType.WithStatement },

    ImageStatement: { name: "ImageStatement", value: MetaTokenType.ImageStatement },
    CameraStatement: { name: "CameraStatement", value: MetaTokenType.CameraStatement },
    SceneStatement: { name: "SceneStatement", value: MetaTokenType.SceneStatement },
    ShowStatement: { name: "ShowStatement", value: MetaTokenType.ShowStatement },

    JumpStatement: { name: "JumpStatement", value: MetaTokenType.JumpStatement },
    CallStatement: { name: "CallStatement", value: MetaTokenType.CallStatement },

    PlayAudioStatement: { name: "PlayAudioStatement", value: MetaTokenType.PlayAudioStatement },
    QueueAudioStatement: { name: "QueueAudioStatement", value: MetaTokenType.QueueAudioStatement },
    StopAudioStatement: { name: "StopAudioStatement", value: MetaTokenType.StopAudioStatement },

    ScreenStatement: { name: "ScreenStatement", value: MetaTokenType.ScreenStatement },
    ScreenSensitive: { name: "ScreenSensitive", value: MetaTokenType.ScreenSensitive },
    ScreenFrame: { name: "ScreenFrame", value: MetaTokenType.ScreenFrame },
    ScreenWindow: { name: "ScreenWindow", value: MetaTokenType.ScreenWindow },
    ScreenText: { name: "ScreenText", value: MetaTokenType.ScreenText },
    ScreenBlock: { name: "ScreenBlock", value: MetaTokenType.ScreenBlock },

    NarratorSayStatement: { name: "NarratorSayStatement", value: MetaTokenType.NarratorSayStatement },
    SayStatement: { name: "SayStatement", value: MetaTokenType.SayStatement },
    CharacterNameString: { name: "CharacterNameString", value: MetaTokenType.CharacterNameString },
    SayNarrator: { name: "SayNarrator", value: MetaTokenType.SayNarrator },
    SayCharacter: { name: "SayCharacter", value: MetaTokenType.SayCharacter },

    AtParameters: { name: "AtParameters", value: MetaTokenType.AtParameters },
    AsParameters: { name: "AsParameters", value: MetaTokenType.AsParameters },
    BehindParameters: { name: "BehindParameters", value: MetaTokenType.BehindParameters },
    OnlayerParameters: { name: "OnlayerParameters", value: MetaTokenType.OnlayerParameters },
    WithParameters: { name: "WithParameters", value: MetaTokenType.WithParameters },
    ZorderParameters: { name: "ZorderParameters", value: MetaTokenType.ZorderParameters },

    ATLBlock: { name: "ATLBlock", value: MetaTokenType.ATLBlock },
    ATLChoiceBlock: { name: "ATLChoiceBlock", value: MetaTokenType.ATLChoiceBlock },
    ATLContains: { name: "ATLContains", value: MetaTokenType.ATLContains },
    ATLWith: { name: "ATLWith", value: MetaTokenType.ATLWith },
    ATLEvent: { name: "ATLEvent", value: MetaTokenType.ATLEvent },
    ATLFunction: { name: "ATLFunction", value: MetaTokenType.ATLFunction },
    ATLWarper: { name: "ATLWarper", value: MetaTokenType.ATLWarper },
    ATLOn: { name: "ATLOn", value: MetaTokenType.ATLOn },

    MemberAccess: { name: "MemberAccess", value: MetaTokenType.MemberAccess },
    ItemAccess: { name: "ItemAccess", value: MetaTokenType.ItemAccess },
    IndexedName: { name: "IndexedName", value: MetaTokenType.IndexedName },
    Attribute: { name: "Attribute", value: MetaTokenType.Attribute },
    ClassDefinition: { name: "ClassDefinition", value: MetaTokenType.ClassDefinition },
    ClassInheritance: { name: "ClassInheritance", value: MetaTokenType.ClassInheritance },
    FunctionDefinition: { name: "FunctionDefinition", value: MetaTokenType.FunctionDefinition },
    LambdaFunction: { name: "LambdaFunction", value: MetaTokenType.LambdaFunction },
    FunctionLambdaParameters: { name: "FunctionLambdaParameters", value: MetaTokenType.FunctionLambdaParameters },
    FunctionParameters: { name: "FunctionParameters", value: MetaTokenType.FunctionParameters },
    FunctionDecorator: { name: "FunctionDecorator", value: MetaTokenType.FunctionDecorator },
    FunctionCall: { name: "FunctionCall", value: MetaTokenType.FunctionCall },
    FunctionCallGeneric: { name: "FunctionCallGeneric", value: MetaTokenType.FunctionCallGeneric },
    Fstring: { name: "Fstring", value: MetaTokenType.Fstring },
    ControlFlowKeyword: { name: "ControlFlowKeyword", value: MetaTokenType.ControlFlowKeyword },
    LogicalOperatorKeyword: { name: "LogicalOperatorKeyword", value: MetaTokenType.LogicalOperatorKeyword },
    Operator: { name: "Operator", value: MetaTokenType.Operator },
    ArithmeticOperator: { name: "ArithmeticOperator", value: MetaTokenType.ArithmeticOperator },
    BitwiseOperatorKeyword: { name: "BitwiseOperatorKeyword", value: MetaTokenType.BitwiseOperatorKeyword },
    ComparisonOperatorKeyword: { name: "ComparisonOperatorKeyword", value: MetaTokenType.ComparisonOperatorKeyword },
    ConstantLiteral: { name: "ConstantLiteral", value: MetaTokenType.ConstantLiteral },
    ConstantNumeric: { name: "ConstantNumeric", value: MetaTokenType.ConstantNumeric },
    ConstantCaps: { name: "ConstantCaps", value: MetaTokenType.ConstantCaps },
    BuiltinExceptionType: { name: "BuiltinExceptionType", value: MetaTokenType.BuiltinExceptionType },
    BuiltinType: { name: "BuiltinType", value: MetaTokenType.BuiltinType },
    MagicVariable: { name: "MagicVariable", value: MetaTokenType.MagicVariable },
    EscapeSequence: { name: "EscapeSequence", value: MetaTokenType.EscapeSequence },
    FormatPercent: { name: "FormatPercent", value: MetaTokenType.FormatPercent },
    FormatBrace: { name: "FormatBrace", value: MetaTokenType.FormatBrace },
    StringStorageType: { name: "StringStorageType", value: MetaTokenType.StringStorageType },
    FormatStorageType: { name: "FormatStorageType", value: MetaTokenType.FormatStorageType },
    ImaginaryNumberStorageType: { name: "ImaginaryNumberStorageType", value: MetaTokenType.ImaginaryNumberStorageType },
    NumberStorageType: { name: "NumberStorageType", value: MetaTokenType.NumberStorageType },
    ClassStorageType: { name: "ClassStorageType", value: MetaTokenType.ClassStorageType },
    CommentBegin: { name: "CommentBegin", value: MetaTokenType.CommentBegin },
    CommentEnd: { name: "CommentEnd", value: MetaTokenType.CommentEnd },
    Backreference: { name: "Backreference", value: MetaTokenType.Backreference },
    BackreferenceNamed: { name: "BackreferenceNamed", value: MetaTokenType.BackreferenceNamed },
    CharacterSet: { name: "CharacterSet", value: MetaTokenType.CharacterSet },
    Named: { name: "Named", value: MetaTokenType.Named },
    ModifierFlagStorageType: { name: "ModifierFlagStorageType", value: MetaTokenType.ModifierFlagStorageType },
};

export const tokenTypeToStringMap = Object.fromEntries(Object.entries(tokenTypeDefinitions).map(([, v]) => [v.value, v.name]));
