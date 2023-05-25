// Workspace and file functions
"use strict";

import { Position, Range as VSRange } from "vscode";
import { CharacterTokenType, MetaTokenType, TokenType, TokenTypeIndex } from "./renpy-tokens";
import { TokenPattern, TokenRangePattern, TokenMatchPattern, TokenRepoPattern } from "./token-pattern-types";
import { Vector } from "../utilities/vector";

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

    // README: The tokenizer abuses the fact that 'startPos' and 'endPos' are reference objects to move the positions!
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
            console.warn(`Empty token detected at L: ${start.line + 1}, C: ${start.character + 1} !`);
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

    public count(): number {
        return this.root.count();
    }
}
