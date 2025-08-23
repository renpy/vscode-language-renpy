import {
    CharacterTokenType,
    EntityTokenType,
    KeywordTokenType,
    LiteralTokenType,
    MetaTokenType,
    OperatorTokenType,
    TokenType,
} from "../tokenizer/renpy-tokens";

import {
    ArgumentNode,
    AssignmentOperationNode,
    ElseClauseNode,
    ExpressionNode,
    IdentifierNode,
    IfClauseNode,
    IfStatementNode,
    LiteralNode,
    MemberAccessNode,
    ParameterNode,
    WhileStatementNode,
} from "./ast-nodes";
import { GrammarRule } from "./grammar-rule";
import { DocumentParser } from "./parser";
import { PythonExpressionRule as FullPythonExpressionRule } from "./python-grammar-rules";
import { RenpyBlockRule } from "./renpy-grammar-rules";

/** TODO: Allow other expressions than just identifiers
 * MemberAccessExpression
 *  : Identifier, { ".", Identifier }+
 *  ;
 */
export class MemberAccessExpressionRule extends GrammarRule<ExpressionNode> {
    private identifierParser = new IdentifierRule();

    public test(parser: DocumentParser): boolean {
        return this.identifierParser.test(parser);
    }

    public parse(parser: DocumentParser): IdentifierNode | MemberAccessNode | null {
        let left: IdentifierNode | MemberAccessNode | null = parser.require(this.identifierParser); // TODO: For now only support identifiers on the left side of the dot
        if (!left) {
            return null;
        }

        while (parser.peek(CharacterTokenType.Dot)) {
            parser.next();
            const right = parser.require(this.identifierParser);
            if (!right) {
                return null;
            }
            left = new MemberAccessNode(left, right);
        }

        return left;
    }
}

export class PythonExpressionMetaRule extends GrammarRule<ExpressionNode> {
    public test(parser: DocumentParser) {
        return parser.peek(MetaTokenType.PythonExpression);
    }

    public parse(parser: DocumentParser) {
        let expression = "";
        while (parser.peek(MetaTokenType.PythonExpression)) {
            parser.next();
            expression += parser.currentValue();
        }
        return new LiteralNode(expression);
    }
}

/**
 * This class implements a Python expression parser that can handle the full Python
 * expression grammar as defined in the EBNF grammar file.
 *
 * In complex expressions, it delegates to the proper Python expression parser from
 * python-grammar-rules.ts, but it still supports meta expressions like PythonExpressionMetaRule
 * for backward compatibility.
 */
export class PythonExpressionRule extends GrammarRule<ExpressionNode> {
    private fullExprParser = new FullPythonExpressionRule();
    private metaRules = [new StringLiteralRule(), new MemberAccessExpressionRule(), new PythonExpressionMetaRule()];

    public test(parser: DocumentParser) {
        if (this.fullExprParser.test(parser)) {
            return true;
        }

        for (const rule of this.metaRules) {
            if (rule.test(parser)) {
                return true;
            }
        }

        return false;
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // Try the full parser first
        if (this.fullExprParser.test(parser)) {
            return parser.require(this.fullExprParser);
        }

        // If that fails, try meta rules
        for (const rule of this.metaRules) {
            if (rule.test(parser)) {
                return parser.require<ExpressionNode>(rule);
            }
        }

        return null;
    }
}

/**
 * Literal
 *   : IntegerLiteral
 *   | FloatLiteral
 *   | BooleanLiteral
 *   | StringLiteral
 *   ;
 */
export class LiteralRule extends GrammarRule<ExpressionNode> {
    private rules = [new IntegerLiteralRule(), new FloatLiteralRule(), new BooleanLiteralRule(), new StringLiteralRule()];

    public test(parser: DocumentParser): boolean {
        for (const rule of this.rules) {
            if (rule.test(parser)) {
                return true;
            }
        }

        return false;
    }

    public parse(parser: DocumentParser): LiteralNode | null {
        for (const rule of this.rules) {
            if (rule.test(parser)) {
                return rule.parse(parser) as LiteralNode;
            }
        }

        return null;
    }
}

/**
 * IntegerLiteral
 *   : "-"?, LiteralTokenType.Integer
 *   ;
 */
export class IntegerLiteralRule extends GrammarRule<LiteralNode> {
    public test(parser: DocumentParser): boolean {
        if (parser.peek(OperatorTokenType.Minus)) {
            parser.next();
            const isInteger = parser.peek(LiteralTokenType.Integer);
            parser.previous();
            return isInteger;
        }

        return parser.peek(LiteralTokenType.Integer);
    }

    public parse(parser: DocumentParser): LiteralNode {
        const isNegative = parser.optionalToken(OperatorTokenType.Minus);
        parser.requireToken(LiteralTokenType.Integer);
        const strValue = (isNegative ? "-" : "").concat(parser.currentValue());
        return new LiteralNode(parseInt(strValue));
    }
}

/**
 * StringLiteral
 *   : LiteralTokenType.String
 *   ;
 */
export class StringLiteralRule extends GrammarRule<LiteralNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(MetaTokenType.StringBegin);
    }

    public parse(parser: DocumentParser): LiteralNode | null {
        if (!parser.requireToken(MetaTokenType.StringBegin)) {
            return null;
        }

        const content = "";
        // TODO: Implement string interpolate expressions
        for (let i = 0; i < 1000 && parser.hasNext() && !parser.peek(MetaTokenType.StringEnd); ++i) {
            if (!parser.requireToken(LiteralTokenType.String)) {
                return null;
            }
            content.concat(parser.currentValue());
        }

        if (!parser.requireToken(MetaTokenType.StringEnd)) {
            return null;
        }
        return new LiteralNode(content);
    }
}

/**
 * FloatLiteral
 *  : "-"?, LiteralTokenType.Float
 * ;
 * */
export class FloatLiteralRule extends GrammarRule<LiteralNode> {
    public test(parser: DocumentParser): boolean {
        if (parser.peek(OperatorTokenType.Minus)) {
            parser.next();
            const isFloat = parser.peek(LiteralTokenType.Float);
            parser.previous();
            return isFloat;
        }

        return parser.peek(LiteralTokenType.Float);
    }

    public parse(parser: DocumentParser): LiteralNode {
        const isNegative = parser.optionalToken(OperatorTokenType.Minus);
        parser.requireToken(LiteralTokenType.Float);
        const strValue = (isNegative ? "-" : "").concat(parser.currentValue());
        return new LiteralNode(parseFloat(strValue));
    }
}

/**
 * BooleanLiteral
 *  : LiteralTokenType.Boolean
 * ;
 * */
export class BooleanLiteralRule extends GrammarRule<LiteralNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(LiteralTokenType.Boolean);
    }

    public parse(parser: DocumentParser): LiteralNode {
        parser.requireToken(LiteralTokenType.Boolean);
        const boolValue = /true/i.test(parser.currentValue());
        return new LiteralNode(boolValue);
    }
}

export class IdentifierRule extends GrammarRule<IdentifierNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(EntityTokenType.Identifier);
    }

    public parse(parser: DocumentParser): IdentifierNode {
        parser.requireToken(EntityTokenType.Identifier);
        return new IdentifierNode(parser.locationFromCurrent(), parser.currentValue());
    }
}

export class AssignmentOperationRule extends GrammarRule<AssignmentOperationNode> {
    private _leftParser: GrammarRule<ExpressionNode>;
    private _operators: TokenType[];
    private _rightParser: GrammarRule<ExpressionNode>;

    constructor(leftParser: GrammarRule<ExpressionNode>, operators: TokenType[], rightParser: GrammarRule<ExpressionNode>) {
        super();
        this._leftParser = leftParser;
        this._operators = operators;
        this._rightParser = rightParser;
    }

    public test(parser: DocumentParser): boolean {
        return this._leftParser.test(parser);
    }

    public parse(parser: DocumentParser): AssignmentOperationNode | null {
        const left = parser.require(this._leftParser);
        if (left === null) {
            return null;
        }

        if (!parser.anyOfToken(this._operators)) {
            return null;
        }
        const operator = parser.current().type;

        const right = parser.require(this._rightParser);
        if (right === null) {
            return null;
        }

        return new AssignmentOperationNode(left, operator, right);
    }
}

/*
 * parameters = "(", [",".parameter+], ")";
 * parameter = NAME, [python_assignment_operation];
 * python_assignment_operation = "=", PYTHON_EXPRESSION;
 */
export class ParametersRule extends GrammarRule<ParameterNode[]> {
    private parameterParser = new ParameterRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(CharacterTokenType.OpenParentheses);
    }

    public parse(parser: DocumentParser): ParameterNode[] | null {
        if (!parser.requireToken(CharacterTokenType.OpenParentheses)) {
            return null;
        }

        const parameters: ParameterNode[] = [];
        if (!parser.peek(CharacterTokenType.CloseParentheses)) {
            do {
                const param = parser.require(this.parameterParser);
                if (param === null) {
                    return null;
                }
                parameters.push(param);
            } while (parser.optionalToken(CharacterTokenType.Comma));
        }

        if (!parser.requireToken(CharacterTokenType.CloseParentheses)) {
            return null;
        }

        return parameters;
    }
}

/**
 * parameter = NAME, [python_assignment_operation];
 * python_assignment_operation = "=", PYTHON_EXPRESSION;
 */
export class ParameterRule extends GrammarRule<ParameterNode> {
    private identifierParser = new IdentifierRule();
    private pythonExpressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return this.identifierParser.test(parser) || this.pythonExpressionParser.test(parser);
    }

    public parse(parser: DocumentParser): ParameterNode | null {
        // TODO: Implement NAME
        const identifier = parser.require(this.identifierParser);
        if (identifier === null) {
            return null;
        }

        let value: ExpressionNode | null = null;
        if (parser.optionalToken(OperatorTokenType.Assignment)) {
            value = parser.require(this.pythonExpressionParser);
            if (value === null) {
                return null;
            }
        }

        return new ParameterNode(identifier, value);
    }
}

/**
 * arguments = "(", [",".argument+], ")";
 * argument = [NAME, "="], PYTHON_EXPRESSION;
 */
export class ArgumentsRule extends GrammarRule<ArgumentNode[]> {
    private argumentParser = new ArgumentRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(CharacterTokenType.OpenParentheses);
    }

    public parse(parser: DocumentParser): ArgumentNode[] | null {
        if (!parser.requireToken(CharacterTokenType.OpenParentheses)) {
            return null;
        }

        const args: ArgumentNode[] = [];
        if (!parser.peek(CharacterTokenType.CloseParentheses)) {
            do {
                const arg = parser.require(this.argumentParser);
                if (arg === null) {
                    return null;
                }
                args.push(arg);
            } while (parser.optionalToken(CharacterTokenType.Comma));
        }

        if (!parser.requireToken(CharacterTokenType.CloseParentheses)) {
            return null;
        }

        return args;
    }
}

/**
 * argument = [NAME, "="], PYTHON_EXPRESSION;
 */
export class ArgumentRule extends GrammarRule<ArgumentNode> {
    private identifierParser = new IdentifierRule();
    private pythonExpressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return this.identifierParser.test(parser) || this.pythonExpressionParser.test(parser);
    }

    public parse(parser: DocumentParser): ArgumentNode | null {
        const identifier = parser.optional(this.identifierParser);
        if (identifier !== null) {
            if (!parser.requireToken(OperatorTokenType.Assignment)) {
                return null;
            }
        }

        const value = parser.require(this.pythonExpressionParser);
        if (value === null) {
            return null;
        }

        return new ArgumentNode(identifier, value);
    }
}

/**
 * while = "while", PYTHON_EXPRESSION, begin_block;
 * begin_block = ":", NEWLINE, INDENT, block;
 * block = statement+, DEDENT;
 */
export class WhileStatementRule extends GrammarRule<WhileStatementNode> {
    private blockParser = new RenpyBlockRule();
    private pythonExpressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.While);
    }

    public parse(parser: DocumentParser): WhileStatementNode | null {
        parser.requireToken(KeywordTokenType.While);

        const condition = parser.require(this.pythonExpressionParser);
        if (condition === null) {
            return null;
        }

        const block = parser.require(this.blockParser);
        if (block === null) {
            return null;
        }

        return new WhileStatementNode(condition, block);
    }
}

/**
 * if_statement = if_clause, elif_clause*, else_clause?;
 * if_clause = "if", PYTHON_EXPRESSION, begin_block;
 * elif_clause = "elif", PYTHON_EXPRESSION, begin_block;
 * else_clause = "else", begin_block;
 * begin_block = ":", NEWLINE, INDENT, block;
 * block = statement+, DEDENT;
 */
export class IfStatementRule extends GrammarRule<IfStatementNode> {
    private blockParser = new RenpyBlockRule();
    private pythonExpressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.If);
    }

    public parse(parser: DocumentParser): IfStatementNode | null {
        // Parse if clause
        const ifClause = this.parseIfClause(parser);
        if (ifClause === null) {
            return null;
        }

        parser.skipEmptyLines();

        // Parse elif clauses (zero or more)
        const elifClauses: IfClauseNode[] = [];
        while (parser.peek(KeywordTokenType.Elif)) {
            const elifClause = this.parseElifClause(parser);
            if (elifClause === null) {
                return null;
            }
            elifClauses.push(elifClause);

            parser.skipEmptyLines();
        }

        // Parse optional else clause
        let elseClause: ElseClauseNode | null = null;
        if (parser.peek(KeywordTokenType.Else)) {
            elseClause = this.parseElseClause(parser);
            if (elseClause === null) {
                return null;
            }

            parser.skipEmptyLines();
        }

        // We need to rollback to the last new line token
        if (parser.current().type === CharacterTokenType.NewLine) {
            parser.previous();
        }

        return new IfStatementNode(ifClause, elifClauses, elseClause);
    }

    private parseIfClause(parser: DocumentParser): IfClauseNode | null {
        parser.requireToken(KeywordTokenType.If);

        const condition = parser.require(this.pythonExpressionParser);
        if (condition === null) {
            return null;
        }

        const block = parser.require(this.blockParser);
        if (block === null) {
            return null;
        }
        parser.expectEOL();

        return new IfClauseNode(condition, block);
    }

    private parseElifClause(parser: DocumentParser): IfClauseNode | null {
        parser.requireToken(KeywordTokenType.Elif);

        const condition = parser.require(this.pythonExpressionParser);
        if (condition === null) {
            return null;
        }

        const block = parser.require(this.blockParser);
        if (block === null) {
            return null;
        }
        parser.expectEOL();

        return new IfClauseNode(condition, block);
    }

    private parseElseClause(parser: DocumentParser): ElseClauseNode | null {
        parser.requireToken(KeywordTokenType.Else);

        const block = parser.require(this.blockParser);
        if (block === null) {
            return null;
        }
        parser.expectEOL();

        return new ElseClauseNode(block);
    }
}

/**
 * guard_expression = "if", PYTHON_EXPRESSION;
 */
export class GuardExpressionRule extends GrammarRule<ExpressionNode> {
    private pythonExpressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.If);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        parser.requireToken(KeywordTokenType.If);

        const expression = parser.require(this.pythonExpressionParser);
        if (expression === null) {
            return null;
        }

        return expression;
    }
}
