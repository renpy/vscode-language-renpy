import { Position, Range as VSRange } from "vscode";
import { CharacterTokenType, EntityTokenType, EscapedCharacterTokenType, KeywordTokenType, LiteralTokenType, MetaTokenType, OperatorTokenType, TokenType, TokenTypeIndex, TypeOfTokenType } from "./renpy-tokens";
import { TokenPattern, TokenRangePattern, TokenMatchPattern, TokenRepoPattern } from "./token-pattern-types";
import { Vector } from "../utilities/vector";
import { LogLevel, logMessage } from "../logger";
import { EnumToString } from "../utilities/utils";

export class Range {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    overlaps(other: Range): boolean {
        return this.start <= other.end && other.start <= this.end;
    }

    contains(position: number): boolean {
        return position >= this.start && position <= this.end;
    }
}

export class TokenPosition {
    line: number;
    character: number;
    charStartOffset: number;

    constructor(line: number, character: number, charStartOffset: number) {
        this.line = line;
        this.character = character;
        this.charStartOffset = charStartOffset;
    }

    /**
     * Move the position by one character
     */
    public next() {
        ++this.character;
        ++this.charStartOffset;
    }

    /**
     * Move the position by one character
     */
    public advance(amount: number) {
        this.character += amount;
        this.charStartOffset += amount;
    }

    /**
     * Move the position to the next line, resetting the character position to zero
     */
    public nextLine() {
        ++this.line;
        this.character = 0;
    }

    public clone(): TokenPosition {
        return new TokenPosition(this.line, this.character, this.charStartOffset);
    }

    public setValue(newValue: TokenPosition) {
        this.line = newValue.line;
        this.character = newValue.character;
        this.charStartOffset = newValue.charStartOffset;
    }
}

export class Token {
    readonly tokenType: TokenType;
    readonly startPos: TokenPosition;
    readonly endPos: TokenPosition;

    constructor(tokenType: TokenType, startPos: TokenPosition, endPos: TokenPosition) {
        this.tokenType = tokenType;
        this.startPos = startPos;
        this.endPos = endPos;
    }

    public getVSCodeRange() {
        const start = new Position(this.startPos.line, this.startPos.character);
        const end = new Position(this.endPos.line, this.endPos.character);

        if (start.isEqual(end)) {
            logMessage(LogLevel.Warning, `Empty token detected at L: ${start.line + 1}, C: ${start.character + 1} !`);
        }

        return new VSRange(start, end);
    }

    public getRange() {
        return new Range(this.startPos.charStartOffset, this.endPos.charStartOffset);
    }

    public isKeyword() {
        return this.tokenType >= TokenTypeIndex.KeywordStart && this.tokenType < TokenTypeIndex.EntityStart;
    }

    public isEntity() {
        return this.tokenType >= TokenTypeIndex.EntityStart && this.tokenType < TokenTypeIndex.ConstantStart;
    }

    public isConstant() {
        return this.tokenType >= TokenTypeIndex.ConstantStart && this.tokenType < TokenTypeIndex.OperatorsStart;
    }

    public isOperator() {
        return this.tokenType >= TokenTypeIndex.OperatorsStart && this.tokenType < TokenTypeIndex.CharactersStart;
    }

    public isCharacter() {
        return this.tokenType >= TokenTypeIndex.CharactersStart && this.tokenType < TokenTypeIndex.EscapedCharacterStart;
    }

    public isEscapedCharacter() {
        return this.tokenType >= TokenTypeIndex.EscapedCharacterStart && this.tokenType < TokenTypeIndex.MetaStart;
    }

    public isMetaToken() {
        return this.tokenType >= TokenTypeIndex.MetaStart && this.tokenType < TokenTypeIndex.UnknownCharacterID;
    }

    public isUnknownCharacter() {
        return this.tokenType === CharacterTokenType.Unknown;
    }

    public isInvalid() {
        return this.tokenType === MetaTokenType.Invalid;
    }
}

export function isRangePattern(p: TokenPattern): p is TokenRangePattern {
    return (p as TokenRangePattern).begin !== undefined;
}

export function isMatchPattern(p: TokenPattern): p is TokenMatchPattern {
    return (p as TokenMatchPattern).match !== undefined;
}

export function isRepoPattern(p: TokenPattern): p is TokenRepoPattern {
    return !isRangePattern(p) && (p as TokenRepoPattern).patterns !== undefined;
}

export class TreeNode {
    public token: Token | null;
    public children: Vector<TreeNode>;

    constructor(token: Token | null = null) {
        this.token = token;
        this.children = new Vector<TreeNode>();
    }

    public addChild(child: TreeNode): void {
        this.children.pushBack(child);
    }

    public hasChildren(): boolean {
        return !this.children.isEmpty();
    }

    public isEmpty(): boolean {
        return this.token === null && !this.hasChildren();
    }

    // Recursively iterate over all children
    public forEach(callback: (node: TreeNode) => void): void {
        this.children.forEach((child) => {
            callback(child);
            child.forEach(callback);
        });
    }

    public filter(callback: (node: TreeNode) => boolean): TreeNode[] {
        const result: TreeNode[] = [];
        this.forEach((node) => {
            if (callback(node)) {
                result.push(node);
            }
        });
        return result;
    }

    public count(): number {
        // Recursively iterate over all children
        let count = 0;
        this.forEach(() => {
            ++count;
        });
        return count;
    }
}

export class TokenTree {
    public root: TreeNode;

    constructor() {
        this.root = new TreeNode();
    }

    public isEmpty(): boolean {
        return !this.root.hasChildren();
    }

    public forEach(callback: (node: TreeNode) => void): void {
        this.root.forEach(callback);
    }

    public filter(callback: (node: TreeNode) => boolean): TreeNode[] {
        return this.root.filter(callback);
    }

    public count(): number {
        return this.root.count();
    }
}

const tokenTypeDefinitions: EnumToString<TypeOfTokenType> = {
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
    Style: { name: "Style", value: KeywordTokenType.Style },
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

    Take: { name: "Take", value: KeywordTokenType.Take },
    Del: { name: "Del", value: KeywordTokenType.Del },
    Clear: { name: "Clear", value: KeywordTokenType.Clear },
    Variant: { name: "Variant", value: KeywordTokenType.Variant },

    Vbox: { name: "Vbox", value: KeywordTokenType.Vbox },
    Hbox: { name: "Hbox", value: KeywordTokenType.Hbox },

    If: { name: "If", value: KeywordTokenType.If },
    Elif: { name: "Elif", value: KeywordTokenType.Elif },
    Else: { name: "Else", value: KeywordTokenType.Else },

    In: { name: "In", value: KeywordTokenType.In },
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
    StyleName: { name: "StyleName", value: EntityTokenType.StyleName },

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

    SimpleExpression: { name: "SimpleExpression", value: MetaTokenType.SimpleExpression },

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

    StyleStatement: { name: "StyleStatement", value: MetaTokenType.StyleStatement },
    StyleBlock: { name: "StyleBlock", value: MetaTokenType.StyleBlock },

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
    PauseParameters: { name: "PauseParameters", value: MetaTokenType.PauseParameters },

    ATLBlock: { name: "ATLBlock", value: MetaTokenType.ATLBlock },
    ATLChoiceBlock: { name: "ATLChoiceBlock", value: MetaTokenType.ATLChoiceBlock },
    TransformBlock: { name: "TransformBlock", value: MetaTokenType.TransformBlock },
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

export function tokenTypeToString(tokenType: TokenType) {
    return tokenTypeToStringMap[tokenType] as string;
}
