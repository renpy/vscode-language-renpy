import { performance } from "perf_hooks";
import { DecorationOptions, Disposable, ExtensionContext, MarkdownString, Uri, window, workspace } from "vscode";
import { CharacterTokenType, LiteralTokenType, EntityTokenType, EscapedCharacterTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "./renpy-tokens";
import { Token } from "./token-definitions";
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

let tokenCache: Token[] = [];
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

    if (documentVersion !== activeEditor.document.version || documentUri !== activeEditor.document.uri || tokenCache.length === 0) {
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

    tokens.forEach((token) => {
        const range = token.getRange();
        const content = activeEditor?.document.getText(range);

        const decoration: DecorationOptions = {
            range: range,
            hoverMessage: {
                language: "text",
                value: `${tokenTypeToStringMap[token.tokenType]} Token (id: ${token.tokenType}): 
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
            case KeywordTokenType.Transform:
            case KeywordTokenType.Extend:
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
            case KeywordTokenType.OnLayer:
            case KeywordTokenType.ZOrder:
            case KeywordTokenType.Behind:
            case KeywordTokenType.Animation:
            case KeywordTokenType.From:
            case KeywordTokenType.DollarSign:
            case KeywordTokenType.Warp: // ATL keywords
            case KeywordTokenType.Circles:
            case KeywordTokenType.Clockwise:
            case KeywordTokenType.Counterclockwise:
            case KeywordTokenType.Event:
            case KeywordTokenType.On:
            case KeywordTokenType.Function:
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

            case EntityTokenType.Class: // Types
            case EntityTokenType.Namespace:
                types.push(decoration);
                break;

            // Functions
            case EntityTokenType.FunctionName:
            case EntityTokenType.EventName:
                functions.push(decoration);
                break;

            // Variables
            case EntityTokenType.VariableName:
            case EntityTokenType.PropertyName:
                variables.push(decoration);
                break;

            // Other entities
            case EntityTokenType.Tag:
                otherEntities.push(decoration);
                break;

            // Comments
            case MetaTokenType.Comment:
            case MetaTokenType.CommentCodeTag:
                comments.push(decoration);
                break;

            case MetaTokenType.CodeBlock:
            case MetaTokenType.PythonLine:
            case MetaTokenType.PythonBlock:
            case MetaTokenType.Arguments:
            case MetaTokenType.EmptyString:
            case MetaTokenType.TagBlock:
            case MetaTokenType.Placeholder:
            case MetaTokenType.MenuStatement:
            case MetaTokenType.MenuBlock:
            case MetaTokenType.MenuOption:
            case MetaTokenType.MenuOptionBlock:
            case MetaTokenType.CameraStatement:
            case MetaTokenType.SceneStatement:
            case MetaTokenType.ShowStatement:
            case MetaTokenType.ImageStatement:
            case MetaTokenType.NarratorSayStatement:
            case MetaTokenType.SayStatement:
            case MetaTokenType.CharacterNameString:
            case MetaTokenType.CallStatement:
            case MetaTokenType.JumpStatement:
            case MetaTokenType.PlayAudioStatement:
            case MetaTokenType.StopAudioStatement:
            case MetaTokenType.LabelStatement:
            case MetaTokenType.LabelCall:
            case MetaTokenType.LabelAccess:
            case MetaTokenType.AtStatement:
            case MetaTokenType.AsStatement:
            case MetaTokenType.WithStatement:
            case MetaTokenType.ATLBlock:
            case MetaTokenType.ATLChoiceBlock:
            case MetaTokenType.ATLContains:
            case MetaTokenType.ATLWith:
            case MetaTokenType.ATLEvent:
            case MetaTokenType.ATLFunction:
            case MetaTokenType.ATLWarper:
            case MetaTokenType.ATLOn:
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
            case OperatorTokenType.Assign: // Assignment operators
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

            case CharacterTokenType.WhiteSpace:
            case CharacterTokenType.NewLine:
            case CharacterTokenType.Period:
            case CharacterTokenType.Colon:
            case CharacterTokenType.Semicolon:
            case CharacterTokenType.Comma:
            case CharacterTokenType.Hashtag:
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
            default:
                throw new Error(`Unhandled token case: ${token.tokenType}`);
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

// NOTE: Everything below is defined solely for this debug decorator.
// None of this should be used outside of this file! This is for debug purposes only!
type AllTokenTypes = typeof KeywordTokenType & typeof EntityTokenType & typeof MetaTokenType & typeof LiteralTokenType & typeof OperatorTokenType & typeof CharacterTokenType & typeof EscapedCharacterTokenType;

type EnumToString<Type> = {
    [P in keyof Type]: { name: P; value: Type[P] };
};

const tokenTypeDefinitions: EnumToString<AllTokenTypes> = {
    Init: { name: "Init", value: KeywordTokenType.Init },
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
    OnLayer: { name: "OnLayer", value: KeywordTokenType.OnLayer },
    ZOrder: { name: "ZOrder", value: KeywordTokenType.ZOrder },
    Behind: { name: "Behind", value: KeywordTokenType.Behind },
    Animation: { name: "Animation", value: KeywordTokenType.Animation },
    From: { name: "From", value: KeywordTokenType.From },
    Time: { name: "Time", value: KeywordTokenType.Time },
    Repeat: { name: "Repeat", value: KeywordTokenType.Repeat },
    DollarSign: { name: "DollarSign", value: KeywordTokenType.DollarSign },

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

    Class: { name: "Class", value: EntityTokenType.Class },
    Namespace: { name: "Namespace", value: EntityTokenType.Namespace },
    FunctionName: { name: "FunctionName", value: EntityTokenType.FunctionName },
    Tag: { name: "Tag", value: EntityTokenType.Tag },
    VariableName: { name: "VariableName", value: EntityTokenType.VariableName },

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

    Assign: { name: "Assign", value: OperatorTokenType.Assign },
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

    Unknown: { name: "Unknown", value: CharacterTokenType.Unknown },

    OpenParentheses: { name: "OpenParentheses", value: CharacterTokenType.OpenParentheses },
    CloseParentheses: { name: "CloseParentheses", value: CharacterTokenType.CloseParentheses },

    OpenBracket: { name: "OpenBracket", value: CharacterTokenType.OpenBracket },
    CloseBracket: { name: "CloseBracket", value: CharacterTokenType.CloseBracket },

    OpenSquareBracket: { name: "OpenSquareBracket", value: CharacterTokenType.OpenSquareBracket },
    CloseSquareBracket: { name: "CloseSquareBracket", value: CharacterTokenType.CloseSquareBracket },

    WhiteSpace: { name: "WhiteSpace", value: CharacterTokenType.WhiteSpace },
    NewLine: { name: "NewLine", value: CharacterTokenType.NewLine },

    Period: { name: "Period", value: CharacterTokenType.Period },
    Colon: { name: "Colon", value: CharacterTokenType.Colon },
    Semicolon: { name: "Semicolon", value: CharacterTokenType.Semicolon },
    Comma: { name: "Comma", value: CharacterTokenType.Comma },
    Hashtag: { name: "Hashtag", value: CharacterTokenType.Hashtag },

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
    Comment: { name: "Comment", value: MetaTokenType.Comment },
    CodeBlock: { name: "CodeBlock", value: MetaTokenType.CodeBlock },

    PythonLine: { name: "PythonLine", value: MetaTokenType.PythonLine },
    PythonBlock: { name: "PythonBlock", value: MetaTokenType.PythonBlock },
    Arguments: { name: "Arguments", value: MetaTokenType.Arguments },

    CommentCodeTag: { name: "CommentCodeTag", value: MetaTokenType.CommentCodeTag },
    EmptyString: { name: "EmptyString", value: MetaTokenType.EmptyString },
    TagBlock: { name: "TagBlock", value: MetaTokenType.TagBlock },
    Placeholder: { name: "Placeholder", value: MetaTokenType.Placeholder },

    MenuStatement: { name: "MenuStatement", value: MetaTokenType.MenuStatement },
    MenuBlock: { name: "MenuBlock", value: MetaTokenType.MenuBlock },
    MenuOption: { name: "MenuOption", value: MetaTokenType.MenuOption },
    MenuOptionBlock: { name: "MenuOptionBlock", value: MetaTokenType.MenuOptionBlock },

    CameraStatement: { name: "CameraStatement", value: MetaTokenType.CameraStatement },
    SceneStatement: { name: "SceneStatement", value: MetaTokenType.SceneStatement },
    ShowStatement: { name: "ShowStatement", value: MetaTokenType.ShowStatement },
    ImageStatement: { name: "ImageStatement", value: MetaTokenType.ImageStatement },

    NarratorSayStatement: { name: "NarratorSayStatement", value: MetaTokenType.NarratorSayStatement },
    SayStatement: { name: "SayStatement", value: MetaTokenType.SayStatement },
    CharacterNameString: { name: "CharacterNameString", value: MetaTokenType.CharacterNameString },

    CallStatement: { name: "CallStatement", value: MetaTokenType.CallStatement },
    JumpStatement: { name: "JumpStatement", value: MetaTokenType.JumpStatement },

    PlayAudioStatement: { name: "PlayAudioStatement", value: MetaTokenType.PlayAudioStatement },
    StopAudioStatement: { name: "StopAudioStatement", value: MetaTokenType.StopAudioStatement },

    LabelStatement: { name: "LabelStatement", value: MetaTokenType.LabelStatement },
    LabelCall: { name: "LabelCall", value: MetaTokenType.LabelCall },
    LabelAccess: { name: "LabelAccess", value: MetaTokenType.LabelAccess },

    AtStatement: { name: "AtStatement", value: MetaTokenType.AtStatement },
    AsStatement: { name: "AsStatement", value: MetaTokenType.AsStatement },
    WithStatement: { name: "WithStatement", value: MetaTokenType.WithStatement },

    ATLBlock: { name: "ATLBlock", value: MetaTokenType.ATLBlock },
    ATLChoiceBlock: { name: "ATLChoiceBlock", value: MetaTokenType.ATLChoiceBlock },
    ATLContains: { name: "ATLContains", value: MetaTokenType.ATLContains },
    ATLWith: { name: "ATLWith", value: MetaTokenType.ATLWith },
    ATLEvent: { name: "ATLEvent", value: MetaTokenType.ATLEvent },
    ATLFunction: { name: "ATLFunction", value: MetaTokenType.ATLFunction },
    ATLWarper: { name: "ATLWarper", value: MetaTokenType.ATLWarper },
    ATLOn: { name: "ATLOn", value: MetaTokenType.ATLOn },
};

export const tokenTypeToStringMap = Object.fromEntries(Object.entries(tokenTypeDefinitions).map(([, v]) => [v.value, v.name]));
