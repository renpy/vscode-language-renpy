/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { LogLevel, TextDocument, Uri, Location as VSLocation, Range as VSRange, workspace } from "vscode";
import { AST, ASTNode } from "./ast-nodes";
import { GrammarRule } from "./grammar-rules";
import { Tokenizer } from "../tokenizer/tokenizer";
import { CharacterTokenType, MetaTokenType, TokenType } from "../tokenizer/renpy-tokens";
import { Token, TokenPosition, TokenListIterator, tokenTypeToStringMap, Range } from "../tokenizer/token-definitions";
import { Vector } from "../utilities/vector";
import { LogCategory, logCatMessage } from "../logger";
import { RpyProgram } from "../interpreter/program";
import { RenpyStatementRule } from "./renpy-grammar-rules";

// eslint-disable-next-line no-shadow
export const enum ParseErrorType {
    UnexpectedToken,
    ExpectedEndOfLine,
    UnexpectedEndOfFile,
    InvalidMonologueType,
}

export interface ParseError {
    type: ParseErrorType;
    currentToken: Token;
    nextToken: Token;
    expectedTokenType: TokenType | null;
    errorRange: Range;
}

type DocumentCache = { readonly documentVersion: number; readonly program: RpyProgram };

export class Parser {
    private static _documentCache = new Map<Uri, DocumentCache>();

    public static async parseDocument(document: TextDocument) {
        const cachedTokens = this._documentCache.get(document.uri);
        if (cachedTokens?.documentVersion === document.version) {
            return cachedTokens.program;
        }

        return await this.runParser(document);
    }

    private static async runParser(document: TextDocument) {
        logCatMessage(LogLevel.Info, LogCategory.Parser, `Running parser on document: "${workspace.asRelativePath(document.uri, true)}"`);

        const parser = new DocumentParser(document);
        await parser.initialize();

        const statementParser = new RenpyStatementRule();
        const ast = new AST();

        while (parser.hasNext()) {
            parser.skipEmptyLines();

            if (statementParser.test(parser)) {
                ast.append(statementParser.parse(parser));
                parser.expectEOL();
            }

            if (parser.hasNext()) {
                parser.next();
            }
        }

        // TODO: Store parse errors so they can be accessed later.

        const program = new RpyProgram();
        ast.visit(program);

        this._documentCache.set(document.uri, { documentVersion: document.version, program });
        return program;
    }
}

export class DocumentParser {
    private _document: TextDocument;
    private _it: TokenListIterator = null!;
    private _currentToken: Token = null!;
    private _blacklist: Set<TokenType> = new Set<TokenType>();
    private _errors: Vector<ParseError> = new Vector<ParseError>();
    private _parsed = false;

    private readonly INVALID_TOKEN = new Token(MetaTokenType.Invalid, new TokenPosition(0, 0, -1), new TokenPosition(0, 0, -1));

    constructor(document: TextDocument) {
        this._document = document;
    }

    public get document() {
        return this._document;
    }

    public locationFromCurrent(): VSLocation {
        return new VSLocation(this._document.uri, this.current().getVSRange());
    }

    public locationFromNext(): VSLocation {
        return new VSLocation(this._document.uri, this.peekNext().getVSRange());
    }

    public locationFromRange(range: VSRange): VSLocation {
        return new VSLocation(this._document.uri, range);
    }

    // TODO: This should not be user facing code, will lead to bugs. Same for the tokenizer.
    public async initialize() {
        if (this._parsed) {
            throw new Error("DocumentParser.parse() called twice.");
        }

        this._parsed = true;
        const tokens = await Tokenizer.tokenizeDocument(this._document);
        this._it = tokens.getIterator();
        this.setFilter(new Set([MetaTokenType.Comment, CharacterTokenType.Whitespace]));

        this._currentToken = this.INVALID_TOKEN;
    }

    /**
     * Check if the current token is blacklisted
     */
    private isBlacklisted() {
        if (this._blacklist.has(this._it.tokenType)) {
            return true;
        }

        return this._it.metaTokens.any((token) => {
            return this._blacklist.has(token);
        });
    }

    /**
     * Add a blacklist to the token iterator. This will prevent the iterator from visiting nodes that match the filter.
     */
    public setFilter(blacklist: Set<TokenType>) {
        this._blacklist = blacklist;
    }

    /**
     * Returns the current token blacklist
     */
    public getFilter() {
        return this._blacklist;
    }

    public get index() {
        return this._it.index;
    }

    /**
     * Moves the iterator to the next token.
     */
    public next() {
        if (!this._it.hasNext()) {
            this.addError(ParseErrorType.UnexpectedEndOfFile);
            return;
        }

        this._currentToken = this._it.token;
        this._it.next();

        // We should also skip any nodes with blacklisted tokens
        while (this.isBlacklisted() && this.hasNext()) {
            this._it.next();
        }
    }

    /**
     * Moves the iterator to the previous token.
     */
    public previous() {
        if (!this._it.hasPrevious()) {
            return;
        }

        this._it.previous();

        // We should also revert any nodes with blacklisted tokens
        while (this.isBlacklisted() && this.hasPrevious()) {
            this._it.previous();
        }

        // TODO: Should this also revert to the previous token?
        this._currentToken = this._it.token;
    }

    /**
     * Moves the token iterator to the given index.
     * @param index The index to move to.
     */
    public seek(index: number) {
        this._it.seek(index);
        this._currentToken = this._it.token;
    }

    /**
     * Returns true if there are more nodes to visit
     */
    public hasPrevious() {
        return this._it.hasPrevious();
    }

    /**
     * Returns true if there are more nodes to visit
     */
    public hasNext(): boolean {
        return this._it.hasNext();
    }

    /**
     * Returns the current token's value.
     * @returns The current token's value.
     */
    public currentValue(): string {
        return this.current().getValue(this._document);
    }

    /**
     * Returns the current token.
     * @returns The current token.
     */
    public current() {
        return this._currentToken;
    }

    /**
     * Peeks the next token.
     * @returns The next token.
     */
    public peekNext() {
        return this._it.token;
    }

    /**
     * Peeks the next token and checks if it is the given token type.
     * @param tokenType The token type to check for.
     * @returns True if the next token is the given token type.
     */
    public peek(tokenType: TokenType) {
        return this.peekNext().type === tokenType || this.peekNext().hasMetaToken(tokenType);
    }

    /**
     * Peeks the next token and checks if it is any of the given token types.
     * @param tokenTypes List of token types to check for.
     * @returns True if the next token is any of the given token types.
     */
    public peekAnyOf(tokenTypes: TokenType[]) {
        for (const tokenType of tokenTypes) {
            if (this.peek(tokenType)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Peeks the next token and checks if it has the given value.
     * @param value The value to check for.
     * @returns True if the next token has the given value.
     */
    public peekValue(value: string) {
        const next = this.peekNext();

        if (next.type === MetaTokenType.EOF) {
            return "";
        }

        return next.getValue(this._document) === value;
    }

    /**
     * Parses the given token type and returns true if the token was parsed.
     * @param tokenType The token type to parse.
     * @returns True if the token was parsed.
     */
    public requireToken(tokenType: TokenType) {
        if (this.peek(tokenType)) {
            this.next();
            return true;
        }
        this.addError(ParseErrorType.UnexpectedToken, tokenType);
        return false;
    }

    /**
     * Optionally parses the given token type and returns true if the token was parsed.
     * @param tokenType The token type to parse.
     * @returns True if the token was parsed.
     */
    public optionalToken(tokenType: TokenType) {
        if (this.peek(tokenType)) {
            this.next();
            return true;
        }
        return false;
    }

    /**
     * Optionally parses the given rule and returns the AST node if the rule matches the current token.
     * @param rule The rule to parse.
     * @returns The parsed AST node or null if the rule did not match.
     */
    public optional<T extends ASTNode>(rule: GrammarRule<T>): T | null {
        if (!rule.test(this)) {
            return null;
        }
        return rule.parse(this);
    }

    /**
     * Parses the given rule and returns the AST node if the rule matches the current token.
     * @param rule The rule to parse.
     * @returns The parsed AST node or null if the rule did not match.
     */
    public require<T extends ASTNode>(rule: GrammarRule<T>): T | null {
        return rule.parse(this);
    }

    /**
     * Checks if the next token is any of the given token types. If it is, the token is consumed and true is returned.
     * @param tokenTypes List of token types to check for.
     * @returns True if the next token is any of the given token types.
     */
    public anyOfToken(tokenTypes: TokenType[]) {
        for (const tokenType of tokenTypes) {
            if (this.peek(tokenType)) {
                this.next();
                return true;
            }
        }
        this.addError(ParseErrorType.UnexpectedToken);
        return false;
    }

    /**
     * Parses the first rule that matches the current token.
     * @param rules List of rules to test and parse.
     * @returns The parsed AST node or null if no rule matched.
     */
    public anyOf<T extends ASTNode>(rules: GrammarRule<T>[]): T | null {
        for (const rule of rules) {
            if (rule.test(this)) {
                return rule.parse(this);
            }
        }
        this.addError(ParseErrorType.ExpectedEndOfLine);
        return null;
    }

    public getIndent(): number {
        // Use iterator version to avoid blacklisted tokens
        this._it.previous();
        const previousToken = this._it.token;
        this._it.next();

        if (previousToken.type === CharacterTokenType.NewLine) {
            return 0;
        }

        if (previousToken.type !== CharacterTokenType.Whitespace) {
            throw new Error("Internal parser error: Expected whitespace token.");
        }

        return previousToken.getValue(this._document).length;
    }

    /**
     * Skips all whitespace tokens until the next non-whitespace token is found.
     */
    public skipWhitespace() {
        while (this.peek(CharacterTokenType.Whitespace)) {
            this.next();
        }
    }

    /**
     * Skips all empty lines until the next non-empty line is found.
     */
    public skipEmptyLines() {
        while (this.peek(CharacterTokenType.NewLine)) {
            this.next();
        }
    }

    /**
     * Skips all tokens until the next end of line token is found.
     */
    public skipToEOL() {
        while (!this.peekAnyOf([CharacterTokenType.NewLine, MetaTokenType.EOF])) {
            this.next();
        }
    }

    /**
     * Expect an end of line token. If any other token is found, an error is added to the error list.
     * @returns True if the next token is a NewLine or EOF token.
     */
    public expectEOL() {
        const isEndOfLine = this.peekAnyOf([CharacterTokenType.NewLine, MetaTokenType.EOF]);
        if (!isEndOfLine) {
            const start = this.peekNext();

            this.skipToEOL();

            const end = this.current();

            this._errors.pushBack({
                type: ParseErrorType.ExpectedEndOfLine,
                currentToken: start,
                nextToken: end,
                expectedTokenType: null,
                errorRange: new Range(start.startPos.charStartOffset, end.endPos.charStartOffset),
            });
        }
        return isEndOfLine;
    }

    public get errors() {
        return this._errors;
    }

    public addError(errorType: ParseErrorType, expectedToken: TokenType | null = null, errorRange: Range | null = null) {
        const nextToken = this.peekNext();
        this._errors.pushBack({
            type: errorType,
            currentToken: this.current(),
            nextToken: nextToken,
            expectedTokenType: expectedToken,
            errorRange: errorRange ?? new Range(nextToken.startPos.charStartOffset, nextToken.endPos.charStartOffset),
        });
    }

    public printErrors() {
        for (const error of this._errors) {
            logCatMessage(LogLevel.Error, LogCategory.Parser, this.getErrorMessage(error));
        }
    }

    /**
     * Prints all token types from the current token to the end of the line.
     */
    public debugPrintLine() {
        const itStart = this.index;
        let output = "Next line tokens: [\n";
        while (this.hasNext() && !this.peekAnyOf([CharacterTokenType.NewLine, MetaTokenType.EOF])) {
            output += `  ${this.peekNext().toString()},\n`;
            this.next();
        }
        output = output.slice(0, -2); // Remove the last comma and space.
        output += "\n]";
        this.seek(itStart);
        logCatMessage(LogLevel.Debug, LogCategory.Parser, output);
    }

    public getErrorMessage(error: ParseError) {
        switch (error.type) {
            case ParseErrorType.UnexpectedEndOfFile:
                return "Unexpected end of file";
            case ParseErrorType.UnexpectedToken:
                return `Syntax error: Expected token of type '${this.getTokenTypeString(error.expectedTokenType)}', but got '${this.getTokenTypeString(error.nextToken.type)}'\n\tat: (${error.nextToken.startPos}) -> (${error.nextToken.endPos})`;
            case ParseErrorType.ExpectedEndOfLine:
                return `Syntax error: Expected end of line.\n\tat: (${error.currentToken.startPos}) -> (${error.nextToken.endPos})`;
            case ParseErrorType.InvalidMonologueType:
                return `Syntax error: Invalid monologue type. Expected one of: double, single, or none.\n\tat: (${error.errorRange.start}) -> (${error.errorRange.end})`;
        }
    }

    public getTokenTypeString(tokenType: TokenType | null) {
        if (tokenType === null) {
            return "None";
        }

        return tokenTypeToStringMap[tokenType];
    }
}
