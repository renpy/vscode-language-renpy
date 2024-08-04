import { CharacterTokenType, EntityTokenType, KeywordTokenType, MetaTokenType, OperatorTokenType } from "../tokenizer/renpy-tokens";
import { DefaultStatementNode, DefineStatementNode, ExpressionNode, IdentifierNode, LabelStatementNode, LiteralNode, SayStatementNode, StatementNode } from "./ast-nodes";
import { AssignmentOperationRule, GrammarRule, IntegerLiteralRule, PythonExpressionRule, IdentifierRule, StringLiteralRule, SimpleExpressionRule, ParametersRule } from "./grammar-rules";
import { DocumentParser } from "./parser";

const integerParser = new IntegerLiteralRule();
const stringParser = new StringLiteralRule();
const identifierParser = new IdentifierRule();
const pythonExpressionParser = new PythonExpressionRule();
const simpleExpressionParser = new SimpleExpressionRule();
const parametersParser = new ParametersRule();

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
        return parser.test(MetaTokenType.SayStatement) || stringParser.test(parser);
    }

    public parse(parser: DocumentParser): StatementNode | null {
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

/**
 * IDENTIFIER = "\p{XID_Start}", {"\p{XID_Continue}"}; (* Based on Python specification. See: https://docs.python.org/3/reference/lexical_analysis.html#identifiers *)
 * WORD = IDENTIFIER;
 * NAME = WORD - RENPY_KEYWORD;
 * DOTTED_NAME = NAME, {".", NAME};
 * LABEL_NAME = [NAME?, "."], NAME;
 */
export class LabelNameRule extends GrammarRule<IdentifierNode> {
    public test(parser: DocumentParser): boolean {
        return parser.anyOfToken([EntityTokenType.FunctionName, CharacterTokenType.Dot]); // TODO: Incomplete
    }

    public parse(parser: DocumentParser): IdentifierNode {
        let dot = false;

        if (parser.test(CharacterTokenType.Dot)) {
            dot = parser.requireToken(CharacterTokenType.Dot);
        } else {
            parser.requireToken(EntityTokenType.FunctionName);
            dot = parser.optionalToken(CharacterTokenType.Dot);
        }

        if (dot) {
            parser.requireToken(EntityTokenType.FunctionName);
        } else {
            parser.optionalToken(EntityTokenType.FunctionName);
        }

        return new IdentifierNode(parser.locationFromCurrent(), parser.currentValue());
    }
}

/**
 * label = "label", LABEL_NAME, parameters?, "hide"?, begin_block;
 */
export class LabelStatementRule extends GrammarRule<LabelStatementNode> {
    private blockParser = new RenpyBlockRule();
    private labelNameParser = new LabelNameRule();

    public test(parser: DocumentParser): boolean {
        return parser.test(KeywordTokenType.Label);
    }

    public parse(parser: DocumentParser): LabelStatementNode | null {
        parser.requireToken(KeywordTokenType.Label);

        const identifier = parser.require(this.labelNameParser);
        if (identifier === null) {
            return null;
        }

        const parameters = parser.optional(parametersParser);
        const hide = parser.optionalToken(KeywordTokenType.Hide);
        const block = parser.require(this.blockParser);
        if (block === null) {
            return null;
        }

        return new LabelStatementNode(identifier, parameters, hide, block);
    }
}

/*
begin_block = ":", NEWLINE, INDENT, block;
block = statement+, DEDENT;
*/
export class RenpyBlockRule extends GrammarRule<StatementNode[]> {
    public test(parser: DocumentParser): boolean {
        return parser.test(CharacterTokenType.Colon);
    }

    public parse(parser: DocumentParser): StatementNode[] | null {
        if (!parser.requireToken(CharacterTokenType.Colon)) {
            return null;
        }
        if (!parser.requireToken(CharacterTokenType.NewLine)) {
            return null;
        }

        // TODO: Implement INDENT and DEDENT
        if (!parser.test(MetaTokenType.RenpyBlock)) {
            parser.expectEOL();
            return null;
        }

        const statements: StatementNode[] = [];
        while (parser.test(MetaTokenType.RenpyBlock) && parser.hasNext()) {
            parser.skipEmptyLines();

            if (statementParser.test(parser)) {
                const statement = parser.require(statementParser);
                parser.expectEOL();

                if (statement !== null) {
                    statements.push(statement);
                }
            }

            if (parser.test(MetaTokenType.RenpyBlock) && parser.hasNext()) {
                parser.next();
            }
        }

        /*if (!parser.requireToken(CharacterTokenType.Dedent)) {
            return null;
        }*/

        return statements;
    }
}

export class RenpyStatementRule extends GrammarRule<StatementNode> {
    rules = [new DefineStatementRule(), new DefaultStatementRule(), new LabelStatementRule(), new SayStatementRule()];

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

const statementParser = new RenpyStatementRule();
