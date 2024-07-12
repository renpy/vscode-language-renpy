import { EntityTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "../tokenizer/renpy-tokens";
import { DefaultStatementNode, DefineStatementNode, ExpressionNode, LiteralNode, SayStatementNode, StatementNode } from "./ast-nodes";
import { AssignmentOperationRule, GrammarRule, IntegerLiteralRule, PythonExpressionRule, IdentifierRule, StringLiteralRule, SimpleExpressionRule, MemberAccessExpressionRule } from "./grammar-rules";
import { DocumentParser } from "./parser";

const integerParser = new IntegerLiteralRule();
const stringParser = new StringLiteralRule();
const identifierParser = new IdentifierRule();
const pythonExpressionParser = new PythonExpressionRule();
const simpleExpressionParser = new SimpleExpressionRule();
const memberAccessParser = new MemberAccessExpressionRule();

/**
 * define_operator = "+=" | "|=" | "=";
 * define_python_assignment_operation = define_operator, PYTHON_EXPRESSION;
 * define_identifier = DOTTED_NAME, ["[", PYTHON_EXPRESSION, "]"];
 * define = "define", INTEGER?, define_identifier, define_python_assignment_operation, NEWLINE;
 */
export class DefineStatementRule extends GrammarRule<DefineStatementNode> {
    private allowedOperators = [OperatorTokenType.PlusAssign, OperatorTokenType.BitwiseOrAssign, OperatorTokenType.Assignment];
    private assignmentOperation = new AssignmentOperationRule(identifierParser, this.allowedOperators, pythonExpressionParser);

    public test(state: DocumentParser): boolean {
        return state.test(KeywordTokenType.Define);
    }

    public parse(parser: DocumentParser): DefineStatementNode | null {
        parser.requireToken(KeywordTokenType.Define);

        const offset = parser.optional(integerParser) ?? new LiteralNode(0);
        const assignmentOperation = parser.require(this.assignmentOperation);
        if (assignmentOperation === null) {
            return null;
        }

        parser.expectEOL();

        return new DefineStatementNode(offset, assignmentOperation);
    }
}

/**
 * default = "default", INTEGER?, DOTTED_NAME, python_assignment_operation, NEWLINE;
 */
export class DefaultStatementRule extends GrammarRule<DefaultStatementNode> {
    private assignmentOperation = new AssignmentOperationRule(identifierParser, [OperatorTokenType.Assignment], pythonExpressionParser);

    public test(parser: DocumentParser): boolean {
        return parser.test(KeywordTokenType.Default);
    }

    public parse(parser: DocumentParser): DefaultStatementNode | null {
        parser.requireToken(KeywordTokenType.Default);

        const offset = parser.optional(integerParser) ?? new LiteralNode(0);
        const assignmentOperation = parser.require(this.assignmentOperation);
        if (assignmentOperation === null) {
            return null;
        }

        parser.expectEOL();

        return new DefaultStatementNode(offset, assignmentOperation);
    }
}

/**
say_who = simple_expression;
say_what = STRING;
say_attribute = "-"?, IMAGE_NAME_COMPONENT;
say_attributes = WHITESPACE.say_attribute+;
say_temporary_attributes = "@", say_attributes;
say = say_who?, say_attributes?, say_temporary_attributes?, say_what;
*/
export class SayStatementRule extends GrammarRule<StatementNode> {
    private sayAttributesParser = new SayAttributesRule();
    public test(parser: DocumentParser): boolean {
        return parser.test(MetaTokenType.SayStatement);
    }

    public parse(parser: DocumentParser): StatementNode | null {
        parser.debugPrintLine();

        const who = parser.optional(simpleExpressionParser);
        const attributes = parser.optional(this.sayAttributesParser);
        let temporaryAttributes: ExpressionNode | null = null;
        if (parser.test(KeywordTokenType.At)) {
            parser.next();
            temporaryAttributes = parser.require(this.sayAttributesParser);
        }
        const what = parser.require(stringParser);
        if (what === null) {
            return null;
        }
        return new SayStatementNode(who, attributes, temporaryAttributes, what);
    }
}

/**
say_attribute = "-"?, IMAGE_NAME_COMPONENT;
say_attributes = WHITESPACE.say_attribute+;
 */
export class SayAttributesRule extends GrammarRule<ExpressionNode> {
    public test(parser: DocumentParser): boolean {
        return parser.test(OperatorTokenType.Minus) || parser.test(EntityTokenType.ImageName);
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        const attributes: ExpressionNode[] = [];
        while (this.test(parser)) {
            const minus = parser.optionalToken(OperatorTokenType.Minus);
            if (!parser.requireToken(EntityTokenType.ImageName)) {
                return null;
            }
            const name = parser.currentValue();
            attributes.push(new LiteralNode(minus ? "-" + name : name));
        }
        return attributes;
    }
}

export class RenpyStatementRule extends GrammarRule<StatementNode> {
    rules = [new DefineStatementRule(), new DefaultStatementRule(), new SayStatementRule()];

    public test(state: DocumentParser): boolean {
        for (const rule of this.rules) {
            if (rule.test(state)) {
                return true;
            }
        }

        return false;
    }

    public parse(parser: DocumentParser): StatementNode | null {
        return parser.anyOf(this.rules);
    }
}
