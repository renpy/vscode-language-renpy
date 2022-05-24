// Workspace and file functions
"use strict";

import { Position, Range } from "vscode";

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

    // README: The tokenizer abuses that 'startPos' and 'endPos' are reference objects to move the positions!
    readonly startPos: TokenPosition;
    readonly endPos: TokenPosition;

    constructor(tokenType: TokenType, startPos: TokenPosition, endPos: TokenPosition) {
        this.tokenType = tokenType;
        this.startPos = startPos;
        this.endPos = endPos;
    }

    public getRange() {
        const start = new Position(this.startPos.line, this.startPos.character);
        const end = new Position(this.endPos.line, this.endPos.character);

        if (start.isEqual(end)) {
            console.warn(`Empty token detected at L: ${start.line + 1}, C: ${start.character + 1} !`);
        }

        return new Range(start, end);
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
