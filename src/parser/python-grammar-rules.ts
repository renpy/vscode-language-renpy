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
    AssignmentOperationNode,
    BinaryOperationNode,
    ExpressionNode,
    IdentifierNode,
    LiteralNode,
    MemberAccessNode,
    StatementNode,
    UnaryOperationNode,
} from "./ast-nodes";
import { GrammarRule } from "./grammar-rule";
import { DocumentParser } from "./parser";
import { AssignmentExpressionNode, LambdaExpressionNode, PythonClassDefinitionNode } from "./python-ast-nodes";

/**
 * expression =
 *   | disjunction 'if' disjunction 'else' expression
 *   | disjunction
 *   | lambdef;
 */
export class PythonExpressionRule extends GrammarRule<ExpressionNode> {
    private disjunctionParser = new DisjunctionRule();
    private lambdefParser = new LambdefRule();

    public test(parser: DocumentParser): boolean {
        return this.disjunctionParser.test(parser) || this.lambdefParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // First check if it's a conditional expression
        if (this.disjunctionParser.test(parser)) {
            const condition = parser.require(this.disjunctionParser);
            if (condition === null) {
                return null;
            }

            // Check if it's a conditional expression (ternary)
            if (parser.optionalToken(KeywordTokenType.If)) {
                const test = parser.require(this.disjunctionParser);
                if (test === null) {
                    return null;
                }

                if (!parser.requireToken(KeywordTokenType.Else)) {
                    return null;
                }

                const elseExpr = parser.require(this);
                if (elseExpr === null) {
                    return null;
                }

                // Create a conditional expression node (similar to ternary)
                // We need to use BinaryOperationNode for now as there's no specific conditional node
                // Structure: (test ? condition : elseExpr)
                return new BinaryOperationNode(
                    test,
                    KeywordTokenType.If, // Using 'if' as the operator
                    new BinaryOperationNode(condition, KeywordTokenType.Else, elseExpr)
                );
            }

            // It's just a disjunction
            return condition;
        }

        // Try lambda definition
        return parser.require(this.lambdefParser);
    }
}

/**
 * disjunction =
 *   | conjunction ('or' conjunction )+
 *   | conjunction;
 */
export class DisjunctionRule extends GrammarRule<ExpressionNode> {
    private conjunctionParser = new ConjunctionRule();

    public test(parser: DocumentParser): boolean {
        return this.conjunctionParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.conjunctionParser);
        if (left === null) {
            return null;
        }

        while (parser.optionalToken(OperatorTokenType.Or)) {
            const right = parser.require(this.conjunctionParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, OperatorTokenType.Or, right);
        }

        return left;
    }
}

/**
 * conjunction =
 *   | inversion ('and' inversion )+
 *   | inversion;
 */
export class ConjunctionRule extends GrammarRule<ExpressionNode> {
    private inversionParser = new InversionRule();

    public test(parser: DocumentParser): boolean {
        return this.inversionParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.inversionParser);
        if (left === null) {
            return null;
        }

        while (parser.optionalToken(OperatorTokenType.And)) {
            const right = parser.require(this.inversionParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, OperatorTokenType.And, right);
        }

        return left;
    }
}

/**
 * inversion =
 *   | 'not' inversion
 *   | comparison;
 */
export class InversionRule extends GrammarRule<ExpressionNode> {
    private comparisonParser = new ComparisonRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(OperatorTokenType.Not) || this.comparisonParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (parser.optionalToken(OperatorTokenType.Not)) {
            const operand = parser.require(this);
            if (operand === null) {
                return null;
            }

            return new UnaryOperationNode(OperatorTokenType.Not, operand);
        }

        return parser.require(this.comparisonParser);
    }
}

/**
 * comparison =
 *   | bitwise_or compare_op_bitwise_or_pair+
 *   | bitwise_or;
 */
export class ComparisonRule extends GrammarRule<ExpressionNode> {
    private bitwiseOrParser = new BitwiseOrRule();

    public test(parser: DocumentParser): boolean {
        return this.bitwiseOrParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.bitwiseOrParser);
        if (left === null) {
            return null;
        }

        // Check for comparison operators
        while (this.isComparisonOperator(parser)) {
            const operator = this.parseComparisonOperator(parser);
            if (operator === null) {
                return null;
            }

            const right = parser.require(this.bitwiseOrParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, operator, right);
        }

        return left;
    }

    private isComparisonOperator(parser: DocumentParser): boolean {
        return parser.peekAnyOf([
            OperatorTokenType.Equals,
            OperatorTokenType.NotEquals,
            OperatorTokenType.LessThanEquals,
            OperatorTokenType.LessThan,
            OperatorTokenType.GreaterThanEquals,
            OperatorTokenType.GreaterThan,
            KeywordTokenType.In,
            OperatorTokenType.Not,
            OperatorTokenType.Is,
        ]);
    }

    private parseComparisonOperator(parser: DocumentParser): TokenType | null {
        if (parser.optionalToken(OperatorTokenType.Equals)) {
            return OperatorTokenType.Equals;
        } else if (parser.optionalToken(OperatorTokenType.NotEquals)) {
            return OperatorTokenType.NotEquals;
        } else if (parser.optionalToken(OperatorTokenType.LessThanEquals)) {
            return OperatorTokenType.LessThanEquals;
        } else if (parser.optionalToken(OperatorTokenType.LessThan)) {
            return OperatorTokenType.LessThan;
        } else if (parser.optionalToken(OperatorTokenType.GreaterThanEquals)) {
            return OperatorTokenType.GreaterThanEquals;
        } else if (parser.optionalToken(OperatorTokenType.GreaterThan)) {
            return OperatorTokenType.GreaterThan;
        } else if (parser.optionalToken(OperatorTokenType.Not)) {
            if (parser.optionalToken(KeywordTokenType.In)) {
                return OperatorTokenType.NotIn; // Using NotIn for 'not in'
            }
            return null;
        } else if (parser.optionalToken(KeywordTokenType.In)) {
            return KeywordTokenType.In;
        } else if (parser.optionalToken(OperatorTokenType.Is)) {
            if (parser.optionalToken(OperatorTokenType.Not)) {
                return OperatorTokenType.IsNot; // Using IsNot for 'is not'
            }
            return OperatorTokenType.Is;
        }
        return null;
    }
}

/**
 * bitwise_or =
 *   | bitwise_or '|' bitwise_xor
 *   | bitwise_xor;
 */
export class BitwiseOrRule extends GrammarRule<ExpressionNode> {
    private bitwiseXorParser = new BitwiseXorRule();

    public test(parser: DocumentParser): boolean {
        return this.bitwiseXorParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.bitwiseXorParser);
        if (left === null) {
            return null;
        }

        while (parser.optionalToken(OperatorTokenType.BitwiseOr)) {
            const right = parser.require(this.bitwiseXorParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, OperatorTokenType.BitwiseOr, right);
        }

        return left;
    }
}

/**
 * bitwise_xor =
 *   | bitwise_xor '^' bitwise_and
 *   | bitwise_and;
 */
export class BitwiseXorRule extends GrammarRule<ExpressionNode> {
    private bitwiseAndParser = new BitwiseAndRule();

    public test(parser: DocumentParser): boolean {
        return this.bitwiseAndParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.bitwiseAndParser);
        if (left === null) {
            return null;
        }

        while (parser.optionalToken(OperatorTokenType.BitwiseXOr)) {
            const right = parser.require(this.bitwiseAndParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, OperatorTokenType.BitwiseXOr, right);
        }

        return left;
    }
}

/**
 * bitwise_and =
 *   | bitwise_and '&' shift_expr
 *   | shift_expr;
 */
export class BitwiseAndRule extends GrammarRule<ExpressionNode> {
    private shiftExprParser = new ShiftExprRule();

    public test(parser: DocumentParser): boolean {
        return this.shiftExprParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.shiftExprParser);
        if (left === null) {
            return null;
        }

        while (parser.optionalToken(OperatorTokenType.BitwiseAnd)) {
            const right = parser.require(this.shiftExprParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, OperatorTokenType.BitwiseAnd, right);
        }

        return left;
    }
}

/**
 * shift_expr =
 *   | shift_expr '<<' sum
 *   | shift_expr '>>' sum
 *   | sum;
 */
export class ShiftExprRule extends GrammarRule<ExpressionNode> {
    private sumParser = new SumRule();

    public test(parser: DocumentParser): boolean {
        return this.sumParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.sumParser);
        if (left === null) {
            return null;
        }

        while (parser.peekAnyOf([OperatorTokenType.BitwiseLeftShift, OperatorTokenType.BitwiseRightShift])) {
            const operator = parser.peek(OperatorTokenType.BitwiseLeftShift)
                ? OperatorTokenType.BitwiseLeftShift
                : OperatorTokenType.BitwiseRightShift;
            parser.optionalToken(operator);

            const right = parser.require(this.sumParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, operator, right);
        }

        return left;
    }
}

/**
 * sum =
 *   | sum '+' term
 *   | sum '-' term
 *   | term;
 */
export class SumRule extends GrammarRule<ExpressionNode> {
    private termParser = new TermRule();

    public test(parser: DocumentParser): boolean {
        return this.termParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.termParser);
        if (left === null) {
            return null;
        }

        while (parser.peekAnyOf([OperatorTokenType.Plus, OperatorTokenType.Minus])) {
            const operator = parser.peek(OperatorTokenType.Plus) ? OperatorTokenType.Plus : OperatorTokenType.Minus;
            parser.optionalToken(operator);

            const right = parser.require(this.termParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, operator, right);
        }

        return left;
    }
}

/**
 * term =
 *   | term '*' factor
 *   | term '/' factor
 *   | term '//' factor
 *   | term '%' factor
 *   | term '@' factor
 *   | factor;
 */
export class TermRule extends GrammarRule<ExpressionNode> {
    private factorParser = new FactorRule();

    public test(parser: DocumentParser): boolean {
        return this.factorParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.factorParser);
        if (left === null) {
            return null;
        }

        while (
            parser.peekAnyOf([
                OperatorTokenType.Multiply,
                OperatorTokenType.Divide,
                OperatorTokenType.FloorDivide,
                OperatorTokenType.Modulo,
                CharacterTokenType.AtSymbol,
            ])
        ) {
            let operator: TokenType;
            if (parser.optionalToken(OperatorTokenType.Multiply)) {
                operator = OperatorTokenType.Multiply;
            } else if (parser.optionalToken(OperatorTokenType.Divide)) {
                operator = OperatorTokenType.Divide;
            } else if (parser.optionalToken(OperatorTokenType.FloorDivide)) {
                operator = OperatorTokenType.FloorDivide;
            } else if (parser.optionalToken(OperatorTokenType.Modulo)) {
                operator = OperatorTokenType.Modulo;
            } else {
                parser.optionalToken(CharacterTokenType.AtSymbol);
                operator = CharacterTokenType.AtSymbol;
            }

            const right = parser.require(this.factorParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, operator, right);
        }

        return left;
    }
}

/**
 * factor =
 *   | '+' factor
 *   | '-' factor
 *   | '~' factor
 *   | power;
 */
export class FactorRule extends GrammarRule<ExpressionNode> {
    private powerParser = new PowerRule();

    public test(parser: DocumentParser): boolean {
        return parser.peekAnyOf([OperatorTokenType.Plus, OperatorTokenType.Minus, OperatorTokenType.BitwiseNot]) || this.powerParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // Unary operators
        if (parser.peekAnyOf([OperatorTokenType.Plus, OperatorTokenType.Minus, OperatorTokenType.BitwiseNot])) {
            let operator: TokenType;
            if (parser.optionalToken(OperatorTokenType.Plus)) {
                operator = OperatorTokenType.Plus;
            } else if (parser.optionalToken(OperatorTokenType.Minus)) {
                operator = OperatorTokenType.Minus;
            } else {
                parser.optionalToken(OperatorTokenType.BitwiseNot);
                operator = OperatorTokenType.BitwiseNot;
            }

            const operand = parser.require(this);
            if (operand === null) {
                return null;
            }

            return new UnaryOperationNode(operator, operand);
        }

        // Otherwise, just parse power
        return parser.require(this.powerParser);
    }
}

/**
 * power =
 *   | await_primary '**' factor
 *   | await_primary;
 */
export class PowerRule extends GrammarRule<ExpressionNode> {
    private awaitPrimaryParser = new AwaitPrimaryRule();
    private factorParser = new FactorRule();

    public test(parser: DocumentParser): boolean {
        return this.awaitPrimaryParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        let left = parser.require(this.awaitPrimaryParser);
        if (left === null) {
            return null;
        }

        if (parser.optionalToken(OperatorTokenType.Exponentiate)) {
            const right = parser.require(this.factorParser);
            if (right === null) {
                return null;
            }

            left = new BinaryOperationNode(left, OperatorTokenType.Exponentiate, right);
        }

        return left;
    }
}

/**
 * await_primary =
 *   | AWAIT primary
 *   | primary;
 */
export class AwaitPrimaryRule extends GrammarRule<ExpressionNode> {
    private primaryParser = new PrimaryRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Await) || this.primaryParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (parser.optionalToken(KeywordTokenType.Await)) {
            const primary = parser.require(this.primaryParser);
            if (primary === null) {
                return null;
            }

            return new UnaryOperationNode(KeywordTokenType.Await, primary);
        }

        return parser.require(this.primaryParser);
    }
}

/**
 * primary =
 *   | primary '.' NAME
 *   | primary genexp
 *   | primary '(' [arguments] ')'
 *   | primary '[' slices ']'
 *   | atom;
 */
export class PrimaryRule extends GrammarRule<ExpressionNode> {
    private atomParser = new AtomRule();

    public test(parser: DocumentParser): boolean {
        return this.atomParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        const left = parser.require(this.atomParser);
        if (left === null) {
            return null;
        }

        // TODO: Implement full primary expression parsing with attribute access,
        // function calls, and subscript operations

        return left;
    }
}

/**
 * atom =
 *   | NAME
 *   | 'True'
 *   | 'False'
 *   | 'None'
 *   | strings
 *   | NUMBER
 *   | (tuple | group | genexp)
 *   | (list | listcomp)
 *   | (dict | set | dictcomp | setcomp)
 *   | '...';
 */
export class AtomRule extends GrammarRule<ExpressionNode> {
    private identifierParser = new IdentifierRule();

    public test(parser: DocumentParser): boolean {
        return (
            this.identifierParser.test(parser) ||
            parser.peekAnyOf([
                KeywordTokenType.True,
                KeywordTokenType.False,
                KeywordTokenType.None,
                // TODO: Add more atom types
            ])
        );
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (this.identifierParser.test(parser)) {
            return parser.require(this.identifierParser);
        }

        // TODO: Implement full atom parsing

        return null;
    }
}

/**
 * lambdef =
 *   | 'lambda' [lambda_params] ':' expression;
 */
export class LambdefRule extends GrammarRule<ExpressionNode> {
    private lambdaParamsParser = new LambdaParamsRule();
    private expressionParser: PythonExpressionRule;

    constructor() {
        super();
        // To avoid circular dependency
        this.expressionParser = new PythonExpressionRule();
    }

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Lambda);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        const startLocation = parser.locationFromNext();

        if (!parser.requireToken(KeywordTokenType.Lambda)) {
            return null;
        }

        // Optional lambda parameters
        let parameters: IdentifierNode[] = [];
        if (!parser.peek(CharacterTokenType.Colon)) {
            const parsedParams = parser.optional(this.lambdaParamsParser);
            if (parsedParams !== null) {
                parameters = parsedParams;
            }
        }

        // Required colon
        if (!parser.requireToken(CharacterTokenType.Colon)) {
            return null;
        }

        // Required expression
        const body = parser.require(this.expressionParser);
        if (body === null) {
            return null;
        }

        return new LambdaExpressionNode(startLocation, parameters, body);
    }
}

/**
 * lambda_params = lambda_parameters
 */
export class LambdaParamsRule extends GrammarRule<IdentifierNode[]> {
    private lambdaParametersRule = new LambdaParametersRule();

    public test(parser: DocumentParser): boolean {
        return this.lambdaParametersRule.test(parser);
    }

    public parse(parser: DocumentParser): IdentifierNode[] | null {
        return parser.require(this.lambdaParametersRule);
    }
}

/**
 * lambda_parameters =
 *   | lambda_param_no_default+ lambda_param_with_default* [lambda_star_etc]
 *   | lambda_param_with_default+ [lambda_star_etc]
 *   | lambda_star_etc
 */
export class LambdaParametersRule extends GrammarRule<IdentifierNode[]> {
    private identifierRule = new IdentifierRule();

    public test(parser: DocumentParser): boolean {
        return this.identifierRule.test(parser);
    }

    public parse(parser: DocumentParser): IdentifierNode[] | null {
        const parameters: IdentifierNode[] = [];

        // For simplicity, we'll parse a comma-separated list of identifiers
        // This is a simplification of the EBNF grammar for lambda parameters

        do {
            const param = parser.require(this.identifierRule);
            if (param === null) {
                return null;
            }
            parameters.push(param);
        } while (parser.optionalToken(CharacterTokenType.Comma));

        return parameters;
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

/**
 * assignment_expression = NAME ':=' ~ expression;
 */
export class AssignmentExpressionRule extends GrammarRule<AssignmentExpressionNode> {
    private identifierParser = new IdentifierRule();
    private expressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        if (!this.identifierParser.test(parser)) {
            return false;
        }

        parser.next(); // Skip past the identifier

        // Check for ':='
        const hasWalrusOperator = parser.peek(OperatorTokenType.ColonAssignment);

        parser.previous();
        return hasWalrusOperator;
    }

    public parse(parser: DocumentParser): AssignmentExpressionNode | null {
        const identifier = parser.require(this.identifierParser);
        if (identifier === null) {
            return null;
        }

        if (!parser.requireToken(OperatorTokenType.ColonAssignment)) {
            return null;
        }

        const value = parser.require(this.expressionParser);
        if (value === null) {
            return null;
        }

        return new AssignmentExpressionNode(parser.locationFromCurrent(), identifier, value);
    }
}

/**
 * named_expression =
 *     | assignment_expression
 *     | expression !':=';
 */
export class NamedExpressionRule extends GrammarRule<ExpressionNode> {
    private assignmentExpressionParser = new AssignmentExpressionRule();
    private expressionParser = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return this.assignmentExpressionParser.test(parser) || this.expressionParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (this.assignmentExpressionParser.test(parser)) {
            return parser.require(this.assignmentExpressionParser);
        }

        return parser.require(this.expressionParser);
    }
}

/**
 * class_def =
 *    | decorators class_def_raw
 *    | class_def_raw;
 *
 * class_def_raw =
 *    | 'class' NAME ['(' [arguments] ')' ] ':' block;
 */
export class ClassDefRule extends GrammarRule<ExpressionNode> {
    private decoratorsParser = new DecoratorsRule();
    private argumentsParser = new PythonArgumentsRule();

    public test(parser: DocumentParser): boolean {
        return this.decoratorsParser.test(parser) || parser.peek(KeywordTokenType.Class);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        const startLocation = parser.locationFromNext();

        // Handle optional decorators
        const hasDecorators = this.decoratorsParser.test(parser);
        if (hasDecorators) {
            // For now we'll parse but ignore decorators
            parser.require(this.decoratorsParser);
        }

        // Class keyword
        if (!parser.requireToken(KeywordTokenType.Class)) {
            return null;
        }

        // Class name
        if (!parser.requireToken(EntityTokenType.Identifier)) {
            return null;
        }
        const className = parser.currentValue();

        // Optional base classes in parentheses
        let baseClasses: ExpressionNode[] | null = null;
        if (parser.peek(CharacterTokenType.OpenParentheses)) {
            parser.requireToken(CharacterTokenType.OpenParentheses);

            // Parse arguments (base classes)
            if (!parser.peek(CharacterTokenType.CloseParentheses)) {
                const args = parser.optional(this.argumentsParser);
                if (args !== null) {
                    baseClasses = args;
                }
            }

            if (!parser.requireToken(CharacterTokenType.CloseParentheses)) {
                return null;
            }
        }

        // Colon
        if (!parser.requireToken(CharacterTokenType.Colon)) {
            return null;
        }

        // Note: We're not parsing the block contents here as it would be handled
        // by the parent compound statement parser. We're just validating the class
        // declaration syntax up to the colon.

        return new PythonClassDefinitionNode(startLocation, className, baseClasses);
    }
}

/**
 * decorators = ('@' named_expression NEWLINE )+;
 */
export class DecoratorsRule extends GrammarRule<ExpressionNode[]> {
    private namedExpressionParser = new NamedExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(CharacterTokenType.AtSymbol);
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        const decorators: ExpressionNode[] = [];

        while (parser.peek(CharacterTokenType.AtSymbol)) {
            parser.requireToken(CharacterTokenType.AtSymbol);

            const expr = parser.require(this.namedExpressionParser);
            if (expr === null) {
                return null;
            }

            decorators.push(expr);

            if (!parser.peek(CharacterTokenType.NewLine)) {
                return null;
            }
            parser.next(); // Consume newline
        }

        return decorators;
    }
}

/**
 * arguments =
 *    | args [','] &')';
 *
 * args =
 *    | ','.(starred_expression | ( assignment_expression | expression !':=') !'=')+ [',' kwargs ]
 *    | kwargs;
 */
export class PythonArgumentsRule extends GrammarRule<ExpressionNode[]> {
    private pythonStarredExpressionRule = new PythonStarredExpressionRule();
    private assignmentExpressionRule = new AssignmentExpressionRule();
    private expressionRule = new PythonExpressionRule();
    private pythonKwargsRule = new PythonKwargsRule();

    public test(parser: DocumentParser): boolean {
        return (
            this.pythonStarredExpressionRule.test(parser) ||
            this.assignmentExpressionRule.test(parser) ||
            this.expressionRule.test(parser) ||
            this.pythonKwargsRule.test(parser)
        );
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        const args: ExpressionNode[] = [];

        // First try to parse positional and starred arguments
        if (this.pythonStarredExpressionRule.test(parser) || this.assignmentExpressionRule.test(parser) || this.expressionRule.test(parser)) {
            do {
                // Try starred expression first
                if (this.pythonStarredExpressionRule.test(parser)) {
                    const starredExpr = parser.require(this.pythonStarredExpressionRule);
                    if (starredExpr === null) {
                        return null;
                    }
                    args.push(starredExpr);
                }
                // Then try assignment expression
                else if (this.assignmentExpressionRule.test(parser)) {
                    const assignExpr = parser.require(this.assignmentExpressionRule);
                    if (assignExpr === null) {
                        return null;
                    }
                    args.push(assignExpr);
                }
                // Finally try regular expression
                else {
                    const expr = parser.require(this.expressionRule);
                    if (expr === null) {
                        return null;
                    }
                    args.push(expr);
                }
            } while (parser.optionalToken(CharacterTokenType.Comma) && !parser.peek(CharacterTokenType.CloseParentheses));

            // Check for kwargs after positional args
            if (this.pythonKwargsRule.test(parser)) {
                const kwargs = parser.require(this.pythonKwargsRule);
                if (kwargs !== null) {
                    args.push(...kwargs);
                }
            }
        }
        // If no positional args, try just kwargs
        else if (this.pythonKwargsRule.test(parser)) {
            const kwargs = parser.require(this.pythonKwargsRule);
            if (kwargs === null) {
                return null;
            }
            args.push(...kwargs);
        }

        return args;
    }
}

/**
 * PythonStarredExpressionRule handles the '*expression' syntax in argument lists
 */
export class PythonStarredExpressionRule extends GrammarRule<ExpressionNode> {
    private expressionRule = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(OperatorTokenType.Multiply);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (!parser.requireToken(OperatorTokenType.Multiply)) {
            return null;
        }

        const expression = parser.require(this.expressionRule);
        if (expression === null) {
            return null;
        }

        return new UnaryOperationNode(OperatorTokenType.Multiply, expression);
    }
}

/**
 * kwargs =
 *    | ','.kwarg_or_starred+ ',' ','.kwarg_or_double_starred+
 *    | ','.kwarg_or_starred+
 *    | ','.kwarg_or_double_starred+;
 */
export class PythonKwargsRule extends GrammarRule<ExpressionNode[]> {
    private pythonKwargOrStarredRule = new PythonKwargOrStarredRule();
    private pythonKwargOrDoubleStarredRule = new PythonKwargOrDoubleStarredRule();

    public test(parser: DocumentParser): boolean {
        return this.pythonKwargOrStarredRule.test(parser) || this.pythonKwargOrDoubleStarredRule.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        const kwargs: ExpressionNode[] = [];

        // First try kwarg_or_starred
        if (this.pythonKwargOrStarredRule.test(parser)) {
            do {
                const kwarg = parser.require(this.pythonKwargOrStarredRule);
                if (kwarg === null) {
                    return null;
                }
                kwargs.push(kwarg);
            } while (parser.optionalToken(CharacterTokenType.Comma) && this.pythonKwargOrStarredRule.test(parser));

            // If there's another comma after kwarg_or_starred, look for kwarg_or_double_starred
            if (parser.peek(CharacterTokenType.Comma) && parser.peekNext() && this.pythonKwargOrDoubleStarredRule.test(parser)) {
                parser.requireToken(CharacterTokenType.Comma);

                // Parse kwarg_or_double_starred items
                do {
                    const doubleStarred = parser.require(this.pythonKwargOrDoubleStarredRule);
                    if (doubleStarred === null) {
                        return null;
                    }
                    kwargs.push(doubleStarred);
                } while (parser.optionalToken(CharacterTokenType.Comma) && this.pythonKwargOrDoubleStarredRule.test(parser));
            }
        }
        // If no kwarg_or_starred, try just kwarg_or_double_starred
        else if (this.pythonKwargOrDoubleStarredRule.test(parser)) {
            do {
                const doubleStarred = parser.require(this.pythonKwargOrDoubleStarredRule);
                if (doubleStarred === null) {
                    return null;
                }
                kwargs.push(doubleStarred);
            } while (parser.optionalToken(CharacterTokenType.Comma) && this.pythonKwargOrDoubleStarredRule.test(parser));
        }

        return kwargs;
    }
}

/**
 * kwarg_or_starred =
 *    | NAME '=' expression
 *    | starred_expression;
 */
export class PythonKwargOrStarredRule extends GrammarRule<ExpressionNode> {
    private identifierRule = new IdentifierRule();
    private expressionRule = new PythonExpressionRule();
    private starredExpressionRule = new PythonStarredExpressionRule();

    public test(parser: DocumentParser): boolean {
        if (this.starredExpressionRule.test(parser)) {
            return true;
        }

        if (!this.identifierRule.test(parser)) {
            return false;
        }

        // Look ahead to check if there's an equals sign after the identifier
        parser.next();
        const hasEquals = parser.peek(OperatorTokenType.Assignment);
        parser.previous();

        return hasEquals;
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // Check for starred expression first
        if (this.starredExpressionRule.test(parser)) {
            return parser.require(this.starredExpressionRule);
        }

        // Otherwise, it's a NAME '=' expression
        const identifier = parser.require(this.identifierRule);
        if (identifier === null) {
            return null;
        }

        if (!parser.requireToken(OperatorTokenType.Assignment)) {
            return null;
        }

        const value = parser.require(this.expressionRule);
        if (value === null) {
            return null;
        }

        return new AssignmentOperationNode(identifier, OperatorTokenType.Assignment, value);
    }
}

/**
 * kwarg_or_double_starred =
 *    | NAME '=' expression
 *    | '**' expression;
 */
export class PythonKwargOrDoubleStarredRule extends GrammarRule<ExpressionNode> {
    private identifierRule = new IdentifierRule();
    private expressionRule = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(OperatorTokenType.Exponentiate) || this.identifierRule.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // Check for '**' expression
        if (parser.peek(OperatorTokenType.Exponentiate)) {
            parser.requireToken(OperatorTokenType.Exponentiate);

            const expression = parser.require(this.expressionRule);
            if (expression === null) {
                return null;
            }

            return new UnaryOperationNode(OperatorTokenType.Exponentiate, expression);
        }

        // Otherwise, it's a NAME '=' expression
        const identifier = parser.require(this.identifierRule);
        if (identifier === null) {
            return null;
        }

        if (!parser.requireToken(OperatorTokenType.Assignment)) {
            return null;
        }

        const value = parser.require(this.expressionRule);
        if (value === null) {
            return null;
        }

        return new AssignmentOperationNode(identifier, OperatorTokenType.Assignment, value);
    }
}

/**
 * parameters =
 *    | slash_no_default param_no_default* param_with_default* [star_etc]
 *    | slash_with_default param_with_default* [star_etc]
 *    | param_no_default+ param_with_default* [star_etc]
 *    | param_with_default+ [star_etc]
 *    | star_etc;
 */
export class PythonParametersRule extends GrammarRule<ExpressionNode[]> {
    private pythonParamNoDefaultRule = new PythonParamNoDefaultRule();
    private pythonParamWithDefaultRule = new PythonParamWithDefaultRule();
    private pythonStarEtcRule = new PythonStarEtcRule();

    public test(parser: DocumentParser): boolean {
        return this.pythonParamNoDefaultRule.test(parser) || this.pythonParamWithDefaultRule.test(parser) || this.pythonStarEtcRule.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        const parameters: ExpressionNode[] = [];

        // For simplicity, we'll implement a subset of the parameter syntax:
        // param_no_default* param_with_default* [star_etc]

        // Parse param_no_default*
        while (this.pythonParamNoDefaultRule.test(parser)) {
            const param = parser.require(this.pythonParamNoDefaultRule);
            if (param === null) {
                return null;
            }
            parameters.push(param);
        }

        // Parse param_with_default*
        while (this.pythonParamWithDefaultRule.test(parser)) {
            const param = parser.require(this.pythonParamWithDefaultRule);
            if (param === null) {
                return null;
            }
            parameters.push(param);
        }

        // Parse optional star_etc
        if (this.pythonStarEtcRule.test(parser)) {
            const starEtc = parser.require(this.pythonStarEtcRule);
            if (starEtc !== null) {
                parameters.push(starEtc);
            }
        }

        return parameters;
    }
}

/**
 * param_no_default =
 *    | param ',' TYPE_COMMENT?
 *    | param TYPE_COMMENT? &')';
 */
export class PythonParamNoDefaultRule extends GrammarRule<ExpressionNode> {
    private pythonParamRule = new PythonParamRule();

    public test(parser: DocumentParser): boolean {
        return this.pythonParamRule.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        const param = parser.require(this.pythonParamRule);
        if (param === null) {
            return null;
        }

        // Optionally consume comma (if not at the end of parameter list)
        parser.optionalToken(CharacterTokenType.Comma);

        return param;
    }
}

/**
 * param_with_default =
 *    | param default ',' TYPE_COMMENT?
 *    | param default TYPE_COMMENT? &')';
 */
export class PythonParamWithDefaultRule extends GrammarRule<ExpressionNode> {
    private pythonParamRule = new PythonParamRule();
    private pythonDefaultRule = new PythonDefaultRule();

    public test(parser: DocumentParser): boolean {
        if (!this.pythonParamRule.test(parser)) {
            return false;
        }

        // Look ahead to see if there's a default value after the parameter
        const startIndex = parser.index;

        parser.require(this.pythonParamRule);
        const hasDefault = this.pythonDefaultRule.test(parser);

        // Restore parser position
        parser.seek(startIndex);

        return hasDefault;
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        const param = parser.require(this.pythonParamRule);
        if (param === null) {
            return null;
        }

        const defaultValue = parser.require(this.pythonDefaultRule);
        if (defaultValue === null) {
            return null;
        }

        // Create an assignment node for the parameter with default
        const assignmentNode = new AssignmentOperationNode(param, OperatorTokenType.Assignment, defaultValue);

        // Optionally consume comma (if not at the end of parameter list)
        parser.optionalToken(CharacterTokenType.Comma);

        return assignmentNode;
    }
}

/**
 * param = NAME annotation?;
 */
export class PythonParamRule extends GrammarRule<ExpressionNode> {
    private identifierRule = new IdentifierRule();

    public test(parser: DocumentParser): boolean {
        return this.identifierRule.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // For now, we're ignoring annotations and just parsing the parameter name
        return parser.require(this.identifierRule);
    }
}

/**
 * default = '=' expression;
 */
export class PythonDefaultRule extends GrammarRule<ExpressionNode> {
    private expressionRule = new PythonExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(OperatorTokenType.Assignment);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (!parser.requireToken(OperatorTokenType.Assignment)) {
            return null;
        }

        return parser.require(this.expressionRule);
    }
}

/**
 * star_etc =
 *    | '*' param_no_default param_maybe_default* [kwds]
 *    | '*' ',' param_maybe_default+ [kwds]
 *    | kwds;
 */
export class PythonStarEtcRule extends GrammarRule<ExpressionNode> {
    private identifierRule = new IdentifierRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(OperatorTokenType.Multiply) || parser.peek(OperatorTokenType.Exponentiate);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        // For simplicity, we'll just handle the '*' and '**' parameters
        if (parser.peek(OperatorTokenType.Multiply)) {
            parser.requireToken(OperatorTokenType.Multiply);

            // Handle '*,' case
            if (parser.optionalToken(CharacterTokenType.Comma)) {
                return new UnaryOperationNode(OperatorTokenType.Multiply, new IdentifierNode(parser.locationFromCurrent(), ""));
            }

            // Handle '*param'
            const identifier = parser.require(this.identifierRule);
            if (identifier === null) {
                return null;
            }

            parser.optionalToken(CharacterTokenType.Comma);

            return new UnaryOperationNode(OperatorTokenType.Multiply, identifier);
        }

        // Handle **kwargs
        if (parser.peek(OperatorTokenType.Exponentiate)) {
            parser.requireToken(OperatorTokenType.Exponentiate);

            const identifier = parser.require(this.identifierRule);
            if (identifier === null) {
                return null;
            }

            parser.optionalToken(CharacterTokenType.Comma);

            return new UnaryOperationNode(OperatorTokenType.Exponentiate, identifier);
        }

        return null;
    }
}

/**
 * PythonBlockRule is similar to RenpyBlockRule but specific for Python contexts.
 * It parses a block of Python statements that begins with a colon and is indented.
 */
export class PythonBlockRule extends GrammarRule<StatementNode[]> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(CharacterTokenType.Colon);
    }

    public parse(parser: DocumentParser): StatementNode[] | null {
        if (!parser.requireToken(CharacterTokenType.Colon)) {
            return null;
        }

        if (!parser.requireToken(CharacterTokenType.NewLine)) {
            return null;
        }

        if (!parser.peek(MetaTokenType.PythonBlock)) {
            return null;
        }

        parser.skipEmptyLines();
        const blockIndent = parser.getIndent();
        const statements: StatementNode[] = [];

        while (parser.peek(MetaTokenType.PythonBlock)) {
            const indent = parser.getIndent();
            if (indent < blockIndent) {
                break;
            }

            if (pythonStatementParser.test(parser)) {
                const statement = parser.require(pythonStatementParser);
                if (statement !== null) {
                    statements.push(statement);
                }
            }

            parser.expectEOL();
            parser.skipEmptyLines();
        }

        // We need to rollback to the last new line token
        if (parser.current().type === CharacterTokenType.NewLine) {
            parser.previous();
        }

        return statements;
    }
}

/**
 * PythonStatementRule is the entry point for parsing Python statements.
 * The rules list is initially empty and will be populated as we implement
 * Python statement types.
 */
export class PythonStatementRule extends GrammarRule<StatementNode> {
    // This list will be populated with Python statement rules as they are implemented
    rules: GrammarRule<StatementNode>[] = [
        // Python statement rules will be added here
    ];

    public test(parser: DocumentParser): boolean {
        for (const rule of this.rules) {
            if (rule.test(parser)) {
                return true;
            }
        }
        return false;
    }

    public parse(parser: DocumentParser): StatementNode | null {
        return parser.anyOf(this.rules);
    }
}

// Create a singleton instance of PythonStatementRule for use throughout the parser
const pythonStatementParser = new PythonStatementRule();
