import { LogLevel, Position, Range as VSRange, TextDocument } from "vscode";
import { Vector } from "src/types";
import { EnumToString } from "src/utilities";
import { LogCategory, logCatMessage, logMessage } from "../logger";

import {
    CharacterTokenType,
    EntityTokenType,
    EscapedCharacterTokenType,
    KeywordTokenType,
    LiteralTokenType,
    MetaTokenType,
    OperatorTokenType,
    TokenType,
    TokenTypeIndex,
    TypeOfTokenType,
} from "./renpy-tokens";
import { TokenMatchPattern, TokenPattern, TokenRangePattern, TokenRepoPattern } from "./token-pattern-types";

export class Range {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    public overlaps(other: Range): boolean {
        return this.start <= other.end && other.start <= this.end;
    }

    public contains(position: number): boolean {
        return position >= this.start && position <= this.end;
    }

    public toVSRange(document: TextDocument): VSRange {
        const start = document.positionAt(this.start);
        const end = document.positionAt(this.end);
        return new VSRange(start, end);
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

    public toString() {
        return `L${this.line + 1}:C${this.character + 1}`;
    }
}

export class Token {
    readonly type: TokenType;
    readonly metaTokens: Vector<TokenType>;
    readonly startPos: TokenPosition;
    readonly endPos: TokenPosition;

    constructor(tokenType: TokenType, startPos: TokenPosition, endPos: TokenPosition) {
        this.type = tokenType;
        this.startPos = startPos;
        this.endPos = endPos;
        this.metaTokens = new Vector<TokenType>();
    }

    public getVSRange() {
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
        return this.type >= TokenTypeIndex.KeywordStart && this.type < TokenTypeIndex.EntityStart;
    }

    public isEntity() {
        return this.type >= TokenTypeIndex.EntityStart && this.type < TokenTypeIndex.ConstantStart;
    }

    public isConstant() {
        return this.type >= TokenTypeIndex.ConstantStart && this.type < TokenTypeIndex.OperatorsStart;
    }

    public isOperator() {
        return this.type >= TokenTypeIndex.OperatorsStart && this.type < TokenTypeIndex.CharactersStart;
    }

    public isCharacter() {
        return this.type >= TokenTypeIndex.CharactersStart && this.type < TokenTypeIndex.EscapedCharacterStart;
    }

    public isEscapedCharacter() {
        return this.type >= TokenTypeIndex.EscapedCharacterStart && this.type < TokenTypeIndex.MetaStart;
    }

    public isMetaToken() {
        return this.type >= TokenTypeIndex.MetaStart && this.type < TokenTypeIndex.UnknownCharacterID;
    }

    public isUnknownCharacter() {
        return this.type === CharacterTokenType.Unknown;
    }

    public isInvalid() {
        return this.hasMetaToken(MetaTokenType.Invalid);
    }

    public addMetaToken() {
        this.metaTokens.pushBack(this.type);
    }

    public removeMetaToken(metaToken: MetaTokenType) {
        this.metaTokens.erase(metaToken);
    }

    public hasMetaToken(metaToken: TokenType) {
        return this.metaTokens.contains(metaToken);
    }

    public getValue(document: TextDocument) {
        return document.getText(this.getVSRange());
    }

    public toString() {
        let metaTokenString = "";

        if (!this.metaTokens.isEmpty()) {
            this.metaTokens.forEach((metaToken) => {
                metaTokenString += `, ${tokenTypeToString(metaToken)}`;
            });
        }

        return `${tokenTypeToString(this.type)}${metaTokenString}: (${this.startPos}) -> (${this.endPos})`;
    }
}

export function isRangePattern(p: TokenPattern): p is TokenRangePattern {
    return (p as TokenRangePattern).begin != null;
}

export function isMatchPattern(p: TokenPattern): p is TokenMatchPattern {
    return (p as TokenMatchPattern).match != null;
}

export function isRepoPattern(p: TokenPattern): p is TokenRepoPattern {
    return !isRangePattern(p) && (p as TokenRepoPattern).patterns != null;
}

export class TreeNode {
    public token: Token | null;
    public children: Vector<TreeNode>;
    public parent: TreeNode | null;

    constructor(token: Token | null = null) {
        this.token = token;
        this.children = new Vector<TreeNode>();
        this.parent = null;
    }

    public addChild(child: TreeNode): void {
        child.parent = this;
        this.children.pushBack(child);
    }

    public hasChildren(): boolean {
        return !this.children.isEmpty();
    }

    public isEmpty(): boolean {
        return this.token == null && !this.hasChildren();
    }

    public clear() {
        this.token = null;
        this.parent = null;
        this.children.clear();
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

    /**
     * Flatten the node by building a Vector of Token's.
     * Each child token should be added to the vector, in the order they appear in the source code (aka. the token.startPos).
     * The current token.type should be added to it's children, using the metaTokens field.
     * We should ensure the entire range of the current token is covered.
     * If it's not covered by all children, we should create a new token filling the gaps and assigning the current token type
     */
    public flatten(): Vector<Token> {
        const tokens = new Vector<Token>();

        // Step 2: Recursively flatten each child node and add its tokens to the vector
        this.children.forEach((child) => {
            const childTokens = child.flatten();
            childTokens.forEach((token) => {
                tokens.pushBack(token);
            });
        });

        // Sort the tokens by their start position
        tokens.sort((a, b) => a.startPos.charStartOffset - b.startPos.charStartOffset);

        if (!this.token) {
            return tokens;
        }

        // Step 3: Add the current token's type to its children using the metaTokens field
        tokens.forEach((token) => {
            token.metaTokens.pushBack(this.token!.type);
        });

        // Step 4: Ensure that the entire range of the current token is covered by its children
        let currentEnd = this.token.startPos;
        for (const token of tokens) {
            const start = token.startPos;
            if (start.charStartOffset > currentEnd.charStartOffset) {
                // There is a gap between the current end position and the start of the next token range
                const gapToken = new Token(this.token.type, currentEnd, start);

                if (gapToken.isMetaToken()) {
                    logCatMessage(
                        LogLevel.Error,
                        LogCategory.Parser,
                        `Attempting to assign meta token "${tokenTypeToString(gapToken.type)}" to token gap @ (${gapToken.startPos}) -> (${gapToken.endPos}). Update the token pattern to assign a value token to this gap!"`
                    );
                }

                tokens.pushBack(gapToken);
            }
            currentEnd = currentEnd.charStartOffset > token.endPos.charStartOffset ? currentEnd : token.endPos;
        }
        if (currentEnd.charStartOffset < this.token.endPos.charStartOffset) {
            // The last token range does not extend to the end of the match
            const gapToken = new Token(this.token.type, currentEnd, this.token.endPos);
            tokens.pushBack(gapToken);
        }

        return tokens;
    }
}

export class TokenTree {
    public root: TreeNode;

    constructor() {
        this.root = new TreeNode();
    }

    public clear() {
        this.root.clear();
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

    public getIterator(): TokenListIterator {
        return new TokenListIterator(this.flatten());
    }

    public flatten(): Vector<Token> {
        return this.root.flatten();
    }
}

/**
 * Special iterator type, where the iterator can be manipulated while iterating.
 * This will allow us to advance based on conditions
 */
export class TokenListIterator {
    private readonly _tokens: Vector<Token>;
    private _index = 0;
    private _blacklist: Set<TokenType> = new Set<TokenType>();
    public readonly EOF_TOKEN = new Token(MetaTokenType.EOF, new TokenPosition(0, 0, -1), new TokenPosition(0, 0, -1));

    constructor(tokens: Vector<Token>) {
        this._tokens = tokens;
    }

    /**
     * Advances the iterator to the next node that has a valid token that is not blacklisted
     */
    public next() {
        if (!this.hasNext()) {
            throw new Error("next() was called on an iterator that has no more nodes to visit.");
        }

        // Move to the next node
        this._index++;

        // We should also skip any nodes with blacklisted tokens
        while (this.isBlacklisted() && this.hasNext()) {
            this._index++;
        }
    }

    /**
     * Advances the iterator to the next node that has a valid token that is not blacklisted
     */
    public previous() {
        if (!this.hasPrevious()) {
            throw new Error("previous() was called on an iterator that has no more nodes to visit.");
        }

        // Move to the next node
        this._index--;

        // We should also revert any nodes with blacklisted tokens
        while (this.isBlacklisted() && this.hasPrevious()) {
            this._index--;
        }
    }

    public clone() {
        const newIterator = new TokenListIterator(this._tokens);
        newIterator._index = this._index;
        newIterator._blacklist = new Set(this._blacklist);
        return newIterator;
    }

    public get token() {
        if (this._index >= this._tokens.size) {
            return this.EOF_TOKEN;
        }
        return this._tokens.at(this._index);
    }

    public get tokenType() {
        return this.token.type;
    }

    public get metaTokens() {
        return this.token.metaTokens;
    }

    /**
     * Check is the current token is blacklisted
     */
    private isBlacklisted() {
        if (this._blacklist.has(this.tokenType)) {
            return true;
        }

        return this.metaTokens.any((token) => {
            return this._blacklist.has(token);
        });
    }

    /**
     * Add a filter to the iterator. This will prevent the iterator from visiting nodes that match the filter.
     */
    public setFilter(blacklist: Set<TokenType>) {
        this._blacklist = blacklist;
    }

    /**
     * Returns the current filter
     */
    public getFilter() {
        return this._blacklist;
    }

    /**
     * Returns true if there are more nodes to visit
     */
    public hasNext() {
        return this._index < this._tokens.size;
    }

    /**
     * Returns true if there are more nodes to visit
     */
    public hasPrevious() {
        return this._index > 0;
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
    Auto: { name: "Auto", value: KeywordTokenType.Auto },
    Image: { name: "Image", value: KeywordTokenType.Image },
    Layeredimage: { name: "Layeredimage", value: KeywordTokenType.Layeredimage },
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
    Layer: { name: "Layer", value: KeywordTokenType.Layer },
    Always: { name: "Always", value: KeywordTokenType.Always },
    Group: { name: "Group", value: KeywordTokenType.Group },
    Attribute: { name: "Attribute", value: KeywordTokenType.Attribute },
    Nopredict: { name: "Nopredict", value: KeywordTokenType.Nopredict },

    Take: { name: "Take", value: KeywordTokenType.Take },
    Del: { name: "Del", value: KeywordTokenType.Del },
    Clear: { name: "Clear", value: KeywordTokenType.Clear },
    Variant: { name: "Variant", value: KeywordTokenType.Variant },

    Vbox: { name: "Vbox", value: KeywordTokenType.Vbox },
    Hbox: { name: "Hbox", value: KeywordTokenType.Hbox },
    Fixed: { name: "Fixed", value: KeywordTokenType.Fixed },

    At: { name: "At", value: KeywordTokenType.At },
    As: { name: "As", value: KeywordTokenType.As },
    With: { name: "With", value: KeywordTokenType.With },
    Onlayer: { name: "Onlayer", value: KeywordTokenType.Onlayer },
    Zorder: { name: "Zorder", value: KeywordTokenType.Zorder },
    Behind: { name: "Behind", value: KeywordTokenType.Behind },

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
    Identifier: { name: "Identifier", value: EntityTokenType.Identifier },

    StyleName: { name: "StyleName", value: EntityTokenType.StyleName },
    TransformName: { name: "TransformName", value: EntityTokenType.TransformName },
    ImageName: { name: "ImageName", value: EntityTokenType.ImageName },
    TextName: { name: "TextName", value: EntityTokenType.TextName },
    AudioName: { name: "AudioName", value: EntityTokenType.AudioName },
    CharacterName: { name: "CharacterName", value: EntityTokenType.CharacterName },
    LayeredimageName: { name: "LayeredimageName", value: EntityTokenType.LayeredimageName },
    LanguageName: { name: "LanguageName", value: EntityTokenType.LanguageName },

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

    Dot: { name: "Dot", value: CharacterTokenType.Dot },
    Colon: { name: "Colon", value: CharacterTokenType.Colon },
    Semicolon: { name: "Semicolon", value: CharacterTokenType.Semicolon },
    Comma: { name: "Comma", value: CharacterTokenType.Comma },
    Hashtag: { name: "Hashtag", value: CharacterTokenType.Hashtag },
    Caret: { name: "Caret", value: CharacterTokenType.Caret },
    DollarSymbol: { name: "DollarSymbol", value: CharacterTokenType.DollarSymbol },
    AtSymbol: { name: "AtSymbol", value: CharacterTokenType.AtSymbol },
    EqualsSymbol: { name: "EqualsSymbol", value: CharacterTokenType.EqualsSymbol },
    ExclamationMark: { name: "ExclamationMark", value: CharacterTokenType.ExclamationMark },

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
    EscPercent: { name: "EscPercent", value: EscapedCharacterTokenType.EscPercent },

    Invalid: { name: "Invalid", value: MetaTokenType.Invalid },
    Deprecated: { name: "Deprecated", value: MetaTokenType.Deprecated },
    EOF: { name: "EOF", value: MetaTokenType.EOF },

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

    LayeredimageBlock: { name: "LayeredimageBlock", value: MetaTokenType.LayeredimageBlock },
    LayeredimageStatement: { name: "LayeredimageStatement", value: MetaTokenType.LayeredimageStatement },
    LayeredimageParameters: { name: "LayeredimageParameters", value: MetaTokenType.LayeredimageParameters },
    LayeredimageGroupStatement: { name: "LayeredimageGroupStatement", value: MetaTokenType.LayeredimageGroupStatement },
    LayeredimageGroupParameters: { name: "LayeredimageGroupParameters", value: MetaTokenType.LayeredimageGroupParameters },
    LayeredimageAttributeStatement: { name: "LayeredimageAttributeStatement", value: MetaTokenType.LayeredimageAttributeStatement },
    LayeredimageAttributeParameters: { name: "LayeredimageAttributeParameters", value: MetaTokenType.LayeredimageAttributeParameters },

    TranslateBlock: { name: "TranslateBlock", value: MetaTokenType.TranslateBlock },
    TranslateStatement: { name: "TranslateStatement", value: MetaTokenType.TranslateStatement },
    TranslateParameters: { name: "TranslateParameters", value: MetaTokenType.TranslateParameters },

    ScreenCall: { name: "ScreenCall", value: MetaTokenType.ScreenCall },

    RenpyBlock: { name: "RenpyBlock", value: MetaTokenType.RenpyBlock },
    CodeBlock: { name: "CodeBlock", value: MetaTokenType.CodeBlock },
    PythonLine: { name: "PythonLine", value: MetaTokenType.PythonLine },
    PythonBlock: { name: "PythonBlock", value: MetaTokenType.PythonBlock },
    PythonExpression: { name: "PythonExpression", value: MetaTokenType.PythonExpression },
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
    HideStatement: { name: "HideStatement", value: MetaTokenType.HideStatement },
    WindowStatement: { name: "WindowStatement", value: MetaTokenType.WindowStatement },

    CallStatement: { name: "CallStatement", value: MetaTokenType.CallStatement },
    CallArguments: { name: "CallArguments", value: MetaTokenType.CallArguments },
    FromClause: { name: "FromClause", value: MetaTokenType.FromClause },
    FromArguments: { name: "FromArguments", value: MetaTokenType.FromArguments },
    JumpStatement: { name: "JumpStatement", value: MetaTokenType.JumpStatement },

    PlayAudioStatement: { name: "PlayAudioStatement", value: MetaTokenType.PlayAudioStatement },
    QueueAudioStatement: { name: "QueueAudioStatement", value: MetaTokenType.QueueAudioStatement },
    StopAudioStatement: { name: "StopAudioStatement", value: MetaTokenType.StopAudioStatement },

    ScreenStatement: { name: "ScreenStatement", value: MetaTokenType.ScreenStatement },
    ScreenSensitive: { name: "ScreenSensitive", value: MetaTokenType.ScreenSensitive },
    ScreenFrame: { name: "ScreenFrame", value: MetaTokenType.ScreenFrame },
    ScreenFrameStatement: { name: "ScreenFrameStatement", value: MetaTokenType.ScreenFrameStatement },
    ScreenFixed: { name: "ScreenFixed", value: MetaTokenType.ScreenFixed },
    ScreenFixedStatement: { name: "ScreenFixedStatement", value: MetaTokenType.ScreenFixedStatement },
    ScreenWindow: { name: "ScreenWindow", value: MetaTokenType.ScreenWindow },
    ScreenWindowStatement: { name: "ScreenWindowStatement", value: MetaTokenType.ScreenWindowStatement },
    ScreenText: { name: "ScreenText", value: MetaTokenType.ScreenText },
    ScreenBlock: { name: "ScreenBlock", value: MetaTokenType.ScreenBlock },
    ScreenVboxStatement: { name: "ScreenVboxStatement", value: MetaTokenType.ScreenVboxStatement },
    ScreenHboxStatement: { name: "ScreenHboxStatement", value: MetaTokenType.ScreenHboxStatement },

    StyleStatement: { name: "StyleStatement", value: MetaTokenType.StyleStatement },
    StyleParameters: { name: "StyleParameters", value: MetaTokenType.StyleParameters },
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
    PauseStatement: { name: "PauseStatement", value: MetaTokenType.PauseStatement },
    PauseParameters: { name: "PauseParameters", value: MetaTokenType.PauseParameters },

    ATLBlock: { name: "ATLBlock", value: MetaTokenType.ATLBlock },
    ATLChoiceBlock: { name: "ATLChoiceBlock", value: MetaTokenType.ATLChoiceBlock },
    TransformBlock: { name: "TransformBlock", value: MetaTokenType.TransformBlock },
    ATLContains: { name: "ATLContains", value: MetaTokenType.ATLContains },
    ATLWith: { name: "ATLWith", value: MetaTokenType.ATLWith },
    ATLEvent: { name: "ATLEvent", value: MetaTokenType.ATLEvent },
    ATLFunction: { name: "ATLFunction", value: MetaTokenType.ATLFunction },
    ATLWarper: { name: "ATLWarper", value: MetaTokenType.ATLWarper },
    ATLOnStatement: { name: "ATLOnStatement", value: MetaTokenType.ATLOnStatement },
    ATLOnParameters: { name: "ATLOnParameters", value: MetaTokenType.ATLOnParameters },
    ATLChoiceStatement: { name: "ATLChoiceStatement", value: MetaTokenType.ATLChoiceStatement },
    ATLChoiceParameters: { name: "ATLChoiceParameters", value: MetaTokenType.ATLChoiceParameters },
    ATLBlockStatement: { name: "ATLBlockStatement", value: MetaTokenType.ATLBlockStatement },
    ATLParallelStatement: { name: "ATLParallelStatement", value: MetaTokenType.ATLParallelStatement },
    ATLContainsStatement: { name: "ATLContainsStatement", value: MetaTokenType.ATLContainsStatement },
    TransformStatement: { name: "TransformStatement", value: MetaTokenType.TransformStatement },
    TransformParameters: { name: "TransformParameters", value: MetaTokenType.TransformParameters },

    MemberAccess: { name: "MemberAccess", value: MetaTokenType.MemberAccess },
    ItemAccess: { name: "ItemAccess", value: MetaTokenType.ItemAccess },
    IndexedName: { name: "IndexedName", value: MetaTokenType.IndexedName },
    DataAttribute: { name: "DataAttribute", value: MetaTokenType.DataAttribute },
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
    InterpolateFlags: { name: "InterpolateFlags", value: MetaTokenType.InterpolateFlags },

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
