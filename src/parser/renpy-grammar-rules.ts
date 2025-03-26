import { CharacterTokenType, EntityTokenType, KeywordTokenType, LiteralTokenType, MetaTokenType, OperatorTokenType } from "../tokenizer/renpy-tokens";
import {
    AssignmentOperationNode,
    CameraStatementNode,
    DefaultStatementNode,
    DefineStatementNode,
    ExpressionNode,
    HideStatementNode,
    IdentifierNode,
    ImageNameNode,
    ImageSpecifierNode,
    ImageStatementNode,
    InitStatementNode,
    JumpStatementNode,
    LabelNameNode,
    LabelStatementNode,
    LiteralNode,
    MenuItemChoiceNode,
    MenuItemSetNode,
    MenuStatementNode,
    OneLinePythonStatementNode,
    PassStatementNode,
    PythonStatementNode,
    ReturnStatementNode,
    RpyMonologueStatementNode,
    RpyPythonStatementNode,
    SayStatementNode,
    SceneStatementNode,
    ShowLayerStatementNode,
    ShowStatementNode,
    StatementNode,
    CallStatementNode,
    TransformStatementNode,
    WithStatementNode,
} from "./ast-nodes";
import { GrammarRule } from "./grammar-rule";
import {
    AssignmentOperationRule,
    IntegerLiteralRule,
    IdentifierRule,
    StringLiteralRule,
    ParametersRule,
    ArgumentsRule,
    GuardExpressionRule,
    IfStatementRule,
    WhileStatementRule,
    PythonExpressionRule,
    LiteralRule,
    MemberAccessExpressionRule,
} from "./rpy-python-grammar-rules";
import { DocumentParser, ParseErrorType } from "./parser";
import { Range } from "../tokenizer/token-definitions";

const integerParser = new IntegerLiteralRule();
const stringParser = new StringLiteralRule();
const identifierParser = new IdentifierRule();
const pythonExpressionParser = new PythonExpressionRule();
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
        return state.peek(KeywordTokenType.Define);
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
        return parser.peek(KeywordTokenType.Default);
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
 * return = "return", PYTHON_EXPRESSION?, NEWLINE;
 */
export class ReturnStatementRule extends GrammarRule<ReturnStatementNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Return);
    }

    public parse(parser: DocumentParser): ReturnStatementNode | null {
        parser.requireToken(KeywordTokenType.Return);

        const expression = parser.optional(pythonExpressionParser);

        parser.expectEOL();

        return new ReturnStatementNode(expression);
    }
}

/**
 * pass = "pass", NEWLINE;
 */
export class PassStatementRule extends GrammarRule<PassStatementNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Pass);
    }

    public parse(parser: DocumentParser): PassStatementNode | null {
        parser.requireToken(KeywordTokenType.Pass);
        parser.expectEOL();

        return new PassStatementNode();
    }
}

/**
 * with_expression = "with", simple_expression;
 */
export class WithExpressionRule extends GrammarRule<ExpressionNode> {
    private simpleExpressionParser = new SimpleExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.With);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        parser.requireToken(KeywordTokenType.With);

        const expression = parser.require(this.simpleExpressionParser);
        if (expression === null) {
            return null;
        }

        return expression;
    }
}

/**
 * with = with_expression, NEWLINE;
 */
export class WithStatementRule extends GrammarRule<WithStatementNode> {
    private withExpressionParser = new WithExpressionRule();

    public test(parser: DocumentParser): boolean {
        return this.withExpressionParser.test(parser);
    }

    public parse(parser: DocumentParser): WithStatementNode | null {
        const expression = parser.require(this.withExpressionParser);
        if (expression === null) {
            return null;
        }

        parser.expectEOL();

        return new WithStatementNode(expression);
    }
}

/**
 * expression_clause = "expression", simple_expression;
 */
export class ExpressionClauseRule extends GrammarRule<ExpressionNode> {
    private simpleExpressionParser = new SimpleExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Expression);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        parser.requireToken(KeywordTokenType.Expression);

        const expression = parser.require(this.simpleExpressionParser);
        if (expression === null) {
            return null;
        }

        return expression;
    }
}

/**
 * call =
 *    | "call", expression_clause, "pass"?, arguments?, from_expression?, NEWLINE
 *    | "call", LABEL_NAME, "pass"?, arguments?, from_expression?, NEWLINE
 *    ;
 *
 * expression_clause = "expression", simple_expression;
 * from_expression = "from", LABEL_NAME;
 */
export class CallStatementRule extends GrammarRule<CallStatementNode> {
    private labelNameParser = new LabelNameRule();
    private fromExpressionParser = new FromExpressionRule();
    private argumentsParser = new ArgumentsRule();
    private expressionClauseParser = new ExpressionClauseRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Call);
    }

    public parse(parser: DocumentParser): CallStatementNode | null {
        parser.requireToken(KeywordTokenType.Call);

        let target: ExpressionNode | LabelNameNode;

        // Handle expression_clause
        if (this.expressionClauseParser.test(parser)) {
            const expression = parser.require(this.expressionClauseParser);
            if (expression === null) {
                return null;
            }
            target = expression;
        } else {
            // Handle LABEL_NAME
            const labelName = parser.require(this.labelNameParser);
            if (labelName === null) {
                return null;
            }
            target = labelName;
        }

        // Handle optional "pass"
        const isPass = parser.optionalToken(KeywordTokenType.Pass);

        // Handle optional arguments
        const args = parser.optional(this.argumentsParser);

        // Handle optional from_expression
        const fromExpression = parser.optional(this.fromExpressionParser);

        parser.expectEOL();

        return new CallStatementNode(target, isPass, args, fromExpression);
    }
}

/**
 * from_expression = "from", LABEL_NAME;
 */
export class FromExpressionRule extends GrammarRule<LabelNameNode> {
    private labelNameParser = new LabelNameRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.From);
    }

    public parse(parser: DocumentParser): LabelNameNode | null {
        parser.requireToken(KeywordTokenType.From);
        return parser.require(this.labelNameParser);
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
    private simpleExpressionParser = new SimpleExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(MetaTokenType.SayStatement) || stringParser.test(parser);
    }

    public parse(parser: DocumentParser): StatementNode | null {
        const who = parser.optional(this.simpleExpressionParser);
        const attributes = parser.optional(this.sayAttributesParser);
        let temporaryAttributes: ExpressionNode | null = null;
        if (parser.peek(KeywordTokenType.At)) {
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
        return parser.peekAnyOf([OperatorTokenType.Minus, EntityTokenType.ImageName]);
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
 * LABEL_NAME = [NAME?, "."], NAME;
 */
export class LabelNameRule extends GrammarRule<LabelNameNode> {
    public test(parser: DocumentParser): boolean {
        return parser.anyOfToken([EntityTokenType.FunctionName, CharacterTokenType.Dot]); // TODO: Incomplete
    }

    public parse(parser: DocumentParser): LabelNameNode {
        const start = parser.peekNext().startPos.charStartOffset;

        let globalName: string | null = null;
        let localName: string | null = null;

        if (parser.optionalToken(CharacterTokenType.Dot)) {
            parser.requireToken(EntityTokenType.FunctionName);
            localName = parser.currentValue();
        } else {
            parser.requireToken(EntityTokenType.FunctionName);
            globalName = parser.currentValue();

            if (parser.optionalToken(CharacterTokenType.Dot)) {
                parser.requireToken(EntityTokenType.FunctionName);
                localName = parser.currentValue();
            }
        }
        const end = parser.current().endPos.charStartOffset;

        const location = parser.locationFromRange(new Range(start, end).toVSRange(parser.document));

        return new LabelNameNode(location, globalName, localName);
    }
}

/**
 * label = "label", LABEL_NAME, parameters?, "hide"?, begin_block;
 */
export class LabelStatementRule extends GrammarRule<LabelStatementNode> {
    private blockParser = new RenpyBlockRule();
    private labelNameParser = new LabelNameRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Label);
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

/**
 * IMAGE_NAME_COMPONENT = WORD_CHAR+;
 * image_name_component_def = !"-", IMAGE_NAME_COMPONENT;
 */
export class ImageNameComponentRule extends GrammarRule<IdentifierNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(EntityTokenType.ImageName);
    }

    public parse(parser: DocumentParser): IdentifierNode {
        const start = parser.peekNext().startPos.charStartOffset;
        parser.requireToken(EntityTokenType.ImageName);
        const value = parser.currentValue();
        const end = parser.current().endPos.charStartOffset;
        const location = parser.locationFromRange(new Range(start, end).toVSRange(parser.document));
        return new IdentifierNode(location, value);
    }
}

/**
 * IMAGE_NAME = WHITESPACE.IMAGE_NAME_COMPONENT+;
 * image_name_def = WHITESPACE.image_name_component_def+;
 */
export class ImageNameRule extends GrammarRule<ImageNameNode> {
    private componentParser = new ImageNameComponentRule();

    public test(parser: DocumentParser): boolean {
        return this.componentParser.test(parser);
    }

    public parse(parser: DocumentParser): ImageNameNode | null {
        const start = parser.peekNext().startPos.charStartOffset;

        const components: IdentifierNode[] = [];

        while (this.componentParser.test(parser)) {
            const component = parser.require(this.componentParser);

            if (component === null) {
                return null;
            }

            components.push(component);
        }

        if (components.length === 0) {
            // TODO: better error handling
            // throw new Error("Expected at least one image name component.");
            parser.addError(ParseErrorType.UnexpectedToken, EntityTokenType.ImageName);
            return null;
        }

        const end = parser.current().endPos.charStartOffset;
        const location = parser.locationFromRange(new Range(start, end).toVSRange(parser.document));
        return new ImageNameNode(location, components);
    }
}

/**
 * image =
 *     | "image", image_name_def, begin_atl_block
 *     | "image", image_name_def, python_assignment_operation, NEWLINE
 *     ;
 */
export class ImageStatementRule extends GrammarRule<ImageStatementNode> {
    private imageNameParser = new ImageNameRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Image);
    }

    public parse(parser: DocumentParser): ImageStatementNode | null {
        parser.requireToken(KeywordTokenType.Image);

        const imageName = parser.require(this.imageNameParser);
        if (imageName === null) {
            return null;
        }

        let block: StatementNode[] | null = null;
        let assignment: AssignmentOperationNode | null = null;

        if (parser.peek(MetaTokenType.ATLBlock)) {
            block = parser.require(new ATLBlockRule());
            if (block === null) {
                return null;
            }
        } else {
            if (!parser.requireToken(OperatorTokenType.Assignment)) {
                return null;
            }

            const pythonExpression = parser.require(pythonExpressionParser);
            if (pythonExpression === null) {
                return null;
            }

            assignment = new AssignmentOperationNode(imageName, OperatorTokenType.Assignment, pythonExpression);

            parser.expectEOL();
        }

        return new ImageStatementNode(imageName, block, assignment);
    }
}

/*
begin_block = ":", NEWLINE, INDENT, block;
block = statement+, DEDENT;
*/
export class RenpyBlockRule extends GrammarRule<StatementNode[]> {
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

        if (!parser.peek(MetaTokenType.RenpyBlock)) {
            return null;
        }

        parser.skipEmptyLines();
        const blockIndent = parser.getIndent();

        const statements: StatementNode[] = [];
        while (parser.peek(MetaTokenType.RenpyBlock)) {
            const indent = parser.getIndent();
            if (indent < blockIndent) {
                break;
            }

            if (statementParser.test(parser)) {
                const statement = parser.require(statementParser);

                if (statement !== null) {
                    statements.push(statement);
                }
            }

            parser.expectEOL();
            parser.skipEmptyLines();
        }

        // We need to rollback to the last new line token. (Side effect of the tokenizer also marking the last new line as a block).
        if (parser.current().type === CharacterTokenType.NewLine) {
            parser.previous();
        }

        return statements;
    }
}

/*
begin_block = ":", NEWLINE, INDENT, block;
block = statement+, DEDENT;
*/
export class ATLBlockRule extends GrammarRule<StatementNode[]> {
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

        if (!parser.peek(MetaTokenType.ATLBlock)) {
            return null;
        }

        const statements: StatementNode[] = [];
        while (parser.peek(MetaTokenType.ATLBlock)) {
            // TODO: Use ATL statements instead
            if (statementParser.test(parser)) {
                const statement = parser.require(statementParser);

                if (statement !== null) {
                    statements.push(statement);
                }
            }
            parser.expectEOL();

            parser.skipEmptyLines();
        }

        // We need to rollback to the last new line token. (Side effect of the tokenizer also marking the last new line and a block).
        if (parser.current().type === CharacterTokenType.NewLine) {
            parser.previous();
        }

        return statements;
    }
}

/**
 * jump =
 *    | "jump", expression_clause, NEWLINE
 *    | "jump", LABEL_NAME, NEWLINE
 *    ;
 */
export class JumpStatementRule extends GrammarRule<JumpStatementNode> {
    private labelNameParser = new LabelNameRule();
    private expressionClauseParser = new ExpressionClauseRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Jump);
    }

    public parse(parser: DocumentParser): JumpStatementNode | null {
        parser.requireToken(KeywordTokenType.Jump);

        let target: ExpressionNode | LabelNameNode;

        // Handle expression_clause
        if (this.expressionClauseParser.test(parser)) {
            const expression = parser.require(this.expressionClauseParser);
            if (expression === null) {
                return null;
            }
            target = expression;
        } else {
            // Handle LABEL_NAME
            const labelName = parser.require(this.labelNameParser);
            if (labelName === null) {
                return null;
            }
            target = labelName;
        }

        parser.expectEOL();

        return new JumpStatementNode(target);
    }
}

/**
 * menuitem_set = "set", PYTHON_EXPRESSION, NEWLINE;
 */
export class MenuItemSetRule extends GrammarRule<MenuItemSetNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Set);
    }

    public parse(parser: DocumentParser): MenuItemSetNode | null {
        parser.requireToken(KeywordTokenType.Set);

        const expression = parser.require(pythonExpressionParser);
        if (expression === null) {
            return null;
        }

        parser.expectEOL();

        return new MenuItemSetNode(expression);
    }
}

/**
 * menuitem_choice = STRING, arguments?, guard_expression?, begin_block;
 */
export class MenuItemChoiceRule extends GrammarRule<MenuItemChoiceNode> {
    private argumentsParser = new ArgumentsRule();
    private guardExpressionParser = new GuardExpressionRule();
    private blockParser = new RenpyBlockRule();

    public test(parser: DocumentParser): boolean {
        return stringParser.test(parser);
    }

    public parse(parser: DocumentParser): MenuItemChoiceNode | null {
        const caption = parser.require(stringParser);
        if (caption === null) {
            return null;
        }

        // Optional arguments
        const args = parser.optional(this.argumentsParser);

        // Optional guard expression
        const condition = parser.optional(this.guardExpressionParser);

        // Required block
        const block = parser.require(this.blockParser);
        if (block === null) {
            return null;
        }

        return new MenuItemChoiceNode(caption, args, condition, block);
    }
}

/**
 * menuitem_caption = say;
 * menuitem_block_statement = menuitem_set | with | menuitem_caption | menuitem_choice;
 * menu_block = menuitem_block_statement+;
 */
export class MenuBlockRule extends GrammarRule<StatementNode[]> {
    private menuItemSetParser = new MenuItemSetRule();
    private withParser = new WithStatementRule();
    private menuItemCaptionParser = new SayStatementRule();
    private menuItemChoiceParser = new MenuItemChoiceRule();

    public test(parser: DocumentParser): boolean {
        return this.menuItemSetParser.test(parser) || this.withParser.test(parser) || this.menuItemCaptionParser.test(parser) || this.menuItemChoiceParser.test(parser);
    }

    public parse(parser: DocumentParser): StatementNode[] | null {
        const items: StatementNode[] = [];

        // Parse at least one menuitem_block_statement
        do {
            // Try each type of menu item statement
            if (this.menuItemSetParser.test(parser)) {
                const setItem = parser.require(this.menuItemSetParser);
                if (setItem !== null) {
                    items.push(setItem);
                }
            } else if (this.withParser.test(parser)) {
                const withItem = parser.require(this.withParser);
                if (withItem !== null) {
                    items.push(withItem);
                }
            } else if (this.menuItemCaptionParser.test(parser)) {
                const captionItem = parser.require(this.menuItemCaptionParser);
                if (captionItem !== null) {
                    items.push(captionItem);
                }
            } else if (this.menuItemChoiceParser.test(parser)) {
                const choiceItem = parser.require(this.menuItemChoiceParser);
                if (choiceItem !== null) {
                    items.push(choiceItem);
                }
            } else {
                // No match for any menu item type
                break;
            }
        } while (this.test(parser));

        if (items.length === 0) {
            return null;
        }

        return items;
    }
}

/**
 * menu = "menu", LABEL_NAME?, arguments?, menu_block;
 */
export class MenuStatementRule extends GrammarRule<MenuStatementNode> {
    private labelNameParser = new LabelNameRule();
    private argumentsParser = new ArgumentsRule();
    private menuBlockParser = new MenuBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Menu);
    }

    public parse(parser: DocumentParser): MenuStatementNode | null {
        parser.requireToken(KeywordTokenType.Menu);

        // Optional label name
        const labelName = parser.optional(this.labelNameParser);

        // Optional arguments
        const args = parser.optional(this.argumentsParser);

        // Required menu block
        const items = parser.require(this.menuBlockParser);
        if (items === null) {
            return null;
        }

        return new MenuStatementNode(labelName, args, items);
    }
}

/**
 * at_expression = "at", simple_expression_list;
 */
export class AtExpressionRule extends GrammarRule<ExpressionNode[]> {
    private simpleExpressionListParser = new SimpleExpressionListRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.At);
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        parser.requireToken(KeywordTokenType.At);
        return parser.require(this.simpleExpressionListParser);
    }
}

/**
 * simple_expression_list = simple_expression, {",", simple_expression};
 */
export class SimpleExpressionListRule extends GrammarRule<ExpressionNode[]> {
    private simpleExpressionParser = new SimpleExpressionRule();

    public test(parser: DocumentParser): boolean {
        return this.simpleExpressionParser.test(parser);
    }

    public parse(parser: DocumentParser): ExpressionNode[] | null {
        const expressions: ExpressionNode[] = [];

        const firstExpr = parser.require(this.simpleExpressionParser);
        if (firstExpr === null) {
            return null;
        }

        expressions.push(firstExpr);

        while (parser.optionalToken(CharacterTokenType.Comma)) {
            const nextExpr = parser.require(this.simpleExpressionParser);
            if (nextExpr === null) {
                return null;
            }
            expressions.push(nextExpr);
        }

        return expressions;
    }
}

/**
 * as_expression = "as", NAME;
 */
export class AsExpressionRule extends GrammarRule<IdentifierNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.As);
    }

    public parse(parser: DocumentParser): IdentifierNode | null {
        parser.requireToken(KeywordTokenType.As);

        const start = parser.peekNext().startPos.charStartOffset;
        if (!parser.requireToken(EntityTokenType.FunctionName)) {
            return null;
        }
        const name = parser.currentValue();
        const end = parser.current().endPos.charStartOffset;

        const location = parser.locationFromRange(new Range(start, end).toVSRange(parser.document));
        return new IdentifierNode(location, name);
    }
}

/**
 * onlayer_expression = "onlayer", NAME;
 */
export class OnlayerExpressionRule extends GrammarRule<IdentifierNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Onlayer);
    }

    public parse(parser: DocumentParser): IdentifierNode | null {
        parser.requireToken(KeywordTokenType.Onlayer);

        const start = parser.peekNext().startPos.charStartOffset;
        if (!parser.requireToken(EntityTokenType.FunctionName)) {
            return null;
        }
        const name = parser.currentValue();
        const end = parser.current().endPos.charStartOffset;

        const location = parser.locationFromRange(new Range(start, end).toVSRange(parser.document));
        return new IdentifierNode(location, name);
    }
}

/**
 * zorder_expression = "zorder", simple_expression;
 */
export class ZorderExpressionRule extends GrammarRule<ExpressionNode> {
    private simpleExpressionParser = new SimpleExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Zorder);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        parser.requireToken(KeywordTokenType.Zorder);
        return parser.require(this.simpleExpressionParser);
    }
}

/**
 * behind_expression = "behind", ",".NAME+;
 */
export class BehindExpressionRule extends GrammarRule<IdentifierNode[]> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Behind);
    }

    public parse(parser: DocumentParser): IdentifierNode[] | null {
        parser.requireToken(KeywordTokenType.Behind);

        const names: IdentifierNode[] = [];

        do {
            const start = parser.peekNext().startPos.charStartOffset;
            if (!parser.requireToken(EntityTokenType.FunctionName)) {
                return null;
            }
            const name = parser.currentValue();
            const end = parser.current().endPos.charStartOffset;

            const location = parser.locationFromRange(new Range(start, end).toVSRange(parser.document));
            names.push(new IdentifierNode(location, name));
        } while (parser.optionalToken(CharacterTokenType.Comma));

        if (names.length === 0) {
            return null;
        }

        return names;
    }
}

/**
 * image_specifier_keywords = "as" | "at" | "onlayer" | "zorder" | "behind";
 * image_specifier = [expression_clause | IMAGE_NAME], { !<image_specifier_keywords, image_specifier_clause };
 * image_specifier_clause = as_expression | at_expression | onlayer_expression | zorder_expression | behind_expression;
 */
export class ImageSpecifierRule extends GrammarRule<ImageSpecifierNode> {
    private imageNameParser = new ImageNameRule();
    private expressionClauseParser = new ExpressionClauseRule();
    private asExpressionParser = new AsExpressionRule();
    private atExpressionParser = new AtExpressionRule();
    private onlayerExpressionParser = new OnlayerExpressionRule();
    private zorderExpressionParser = new ZorderExpressionRule();
    private behindExpressionParser = new BehindExpressionRule();

    public test(parser: DocumentParser): boolean {
        return this.expressionClauseParser.test(parser) || this.imageNameParser.test(parser);
    }

    public parse(parser: DocumentParser): ImageSpecifierNode | null {
        // Parse the target (expression_clause or IMAGE_NAME)
        let target: ExpressionNode | ImageNameNode;

        if (this.expressionClauseParser.test(parser)) {
            const expr = parser.require(this.expressionClauseParser);
            if (expr === null) {
                return null;
            }
            target = expr;
        } else {
            const imageName = parser.require(this.imageNameParser);
            if (imageName === null) {
                return null;
            }
            target = imageName;
        }

        // Parse any image_specifier_clause expressions
        const clauses: ExpressionNode[] = [];

        while (this.isImageSpecifierClause(parser)) {
            if (this.asExpressionParser.test(parser)) {
                const asExpr = parser.require(this.asExpressionParser);
                if (asExpr !== null) {
                    clauses.push(asExpr);
                }
            } else if (this.atExpressionParser.test(parser)) {
                const atExprs = parser.require(this.atExpressionParser);
                if (atExprs !== null) {
                    clauses.push(...atExprs);
                }
            } else if (this.onlayerExpressionParser.test(parser)) {
                const onlayerExpr = parser.require(this.onlayerExpressionParser);
                if (onlayerExpr !== null) {
                    clauses.push(onlayerExpr);
                }
            } else if (this.zorderExpressionParser.test(parser)) {
                const zorderExpr = parser.require(this.zorderExpressionParser);
                if (zorderExpr !== null) {
                    clauses.push(zorderExpr);
                }
            } else if (this.behindExpressionParser.test(parser)) {
                const behindExprs = parser.require(this.behindExpressionParser);
                if (behindExprs !== null) {
                    clauses.push(...behindExprs);
                }
            } else {
                break;
            }
        }

        return new ImageSpecifierNode(target, clauses);
    }

    private isImageSpecifierClause(parser: DocumentParser): boolean {
        return this.asExpressionParser.test(parser) || this.atExpressionParser.test(parser) || this.onlayerExpressionParser.test(parser) || this.zorderExpressionParser.test(parser) || this.behindExpressionParser.test(parser);
    }
}

/**
 * scene =
 *    | "scene", image_specifier, with?, begin_atl_block
 *    | "scene", image_specifier, with?, NEWLINE
 *    | "scene", onlayer_expression?, NEWLINE
 *    ;
 */
export class SceneStatementRule extends GrammarRule<SceneStatementNode> {
    private imageSpecifierRule = new ImageSpecifierRule();
    private withExpressionRule = new WithExpressionRule();
    private onlayerExpressionRule = new OnlayerExpressionRule();
    private atlBlockRule = new ATLBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Scene);
    }

    public parse(parser: DocumentParser): SceneStatementNode | null {
        parser.requireToken(KeywordTokenType.Scene);

        // Check for the third form: "scene", onlayer_expression?, NEWLINE
        if (!this.imageSpecifierRule.test(parser) && (this.onlayerExpressionRule.test(parser) || parser.peek(CharacterTokenType.NewLine))) {
            const onlayer = parser.optional(this.onlayerExpressionRule);
            parser.expectEOL();
            return new SceneStatementNode(null, null, onlayer, null);
        }

        // Otherwise, we expect an image specifier
        const imageSpecifier = parser.require(this.imageSpecifierRule);
        if (imageSpecifier === null) {
            return null;
        }

        // Optional with expression
        const withExpr = parser.optional(this.withExpressionRule);

        // Check if we have an ATL block or just a newline
        if (parser.peek(CharacterTokenType.Colon)) {
            const block = parser.require(this.atlBlockRule);
            if (block === null) {
                return null;
            }
            return new SceneStatementNode(imageSpecifier, withExpr, null, block);
        } else {
            parser.expectEOL();
            return new SceneStatementNode(imageSpecifier, withExpr, null, null);
        }
    }
}

/**
 * show =
 *    | "show", image_specifier, with?, begin_atl_block
 *    | "show", image_specifier, with?, NEWLINE
 *    ;
 */
export class ShowStatementRule extends GrammarRule<ShowStatementNode> {
    private imageSpecifierRule = new ImageSpecifierRule();
    private withExpressionRule = new WithExpressionRule();
    private atlBlockRule = new ATLBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Show) && !this.isShowLayer(parser);
    }

    public parse(parser: DocumentParser): ShowStatementNode | null {
        parser.requireToken(KeywordTokenType.Show);

        const imageSpecifier = parser.require(this.imageSpecifierRule);
        if (imageSpecifier === null) {
            return null;
        }

        // Optional with expression
        const withExpr = parser.optional(this.withExpressionRule);

        // Check if we have an ATL block or just a newline
        if (parser.peek(CharacterTokenType.Colon)) {
            const block = parser.require(this.atlBlockRule);
            if (block === null) {
                return null;
            }
            return new ShowStatementNode(imageSpecifier, withExpr, block);
        } else {
            parser.expectEOL();
            return new ShowStatementNode(imageSpecifier, withExpr, null);
        }
    }

    private isShowLayer(parser: DocumentParser): boolean {
        // Look ahead to check if this is a "show layer" statement
        if (parser.peek(KeywordTokenType.Show)) {
            parser.next();
            const isLayer = parser.peek(KeywordTokenType.Layer);
            parser.previous();
            return isLayer;
        }

        return false;
    }
}

/**
 * show_layer =
 *    | "show", "layer", NAME, at_expression?, begin_atl_block
 *    | "show", "layer", NAME, at_expression?, NEWLINE
 *    ;
 */
export class ShowLayerStatementRule extends GrammarRule<ShowLayerStatementNode> {
    private atExpressionRule = new AtExpressionRule();
    private atlBlockRule = new ATLBlockRule();

    public test(parser: DocumentParser): boolean {
        if (!parser.peek(KeywordTokenType.Show)) {
            return false;
        }

        parser.next();
        const isLayer = parser.peek(KeywordTokenType.Layer);
        parser.previous();

        return isLayer;
    }

    public parse(parser: DocumentParser): ShowLayerStatementNode | null {
        parser.requireToken(KeywordTokenType.Show);
        parser.requireToken(KeywordTokenType.Layer);

        // Parse layer name
        if (!parser.requireToken(EntityTokenType.FunctionName)) {
            return null;
        }
        const layerName = parser.currentValue();

        // Optional at expression
        const atExpression = parser.optional(this.atExpressionRule);

        // Check if we have an ATL block or just a newline
        if (parser.peek(CharacterTokenType.Colon)) {
            const block = parser.require(this.atlBlockRule);
            if (block === null) {
                return null;
            }
            return new ShowLayerStatementNode(layerName, atExpression, block);
        } else {
            parser.expectEOL();
            return new ShowLayerStatementNode(layerName, atExpression, null);
        }
    }
}

/**
 * hide = "hide", image_specifier, with?, NEWLINE;
 */
export class HideStatementRule extends GrammarRule<HideStatementNode> {
    private imageSpecifierRule = new ImageSpecifierRule();
    private withExpressionRule = new WithExpressionRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Hide);
    }

    public parse(parser: DocumentParser): HideStatementNode | null {
        parser.requireToken(KeywordTokenType.Hide);

        const imageSpecifier = parser.require(this.imageSpecifierRule);
        if (imageSpecifier === null) {
            return null;
        }

        // Optional with expression
        const withExpr = parser.optional(this.withExpressionRule);

        parser.expectEOL();

        return new HideStatementNode(imageSpecifier, withExpr);
    }
}

/**
 * camera =
 *    | "camera", NAME?, at_expression?, begin_atl_block
 *    | "camera", NAME?, at_expression?, NEWLINE
 *    ;
 */
export class CameraStatementRule extends GrammarRule<CameraStatementNode> {
    private atExpressionRule = new AtExpressionRule();
    private atlBlockRule = new ATLBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Camera);
    }

    public parse(parser: DocumentParser): CameraStatementNode | null {
        parser.requireToken(KeywordTokenType.Camera);

        // Optional name
        let name: string | null = null;
        if (parser.peek(EntityTokenType.FunctionName)) {
            parser.next();
            name = parser.currentValue();
        }

        // Optional at expression
        const atExpression = parser.optional(this.atExpressionRule);

        // Check if we have an ATL block or just a newline
        if (parser.peek(CharacterTokenType.Colon)) {
            const block = parser.require(this.atlBlockRule);
            if (block === null) {
                return null;
            }
            return new CameraStatementNode(name, atExpression, block);
        } else {
            parser.expectEOL();
            return new CameraStatementNode(name, atExpression, null);
        }
    }
}

/**
 * transform = "transform", INTEGER?, DOTTED_NAME, parameters?, begin_atl_block;
 */
export class TransformStatementRule extends GrammarRule<TransformStatementNode> {
    private parametersParser = new ParametersRule();
    private atlBlockParser = new ATLBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Transform);
    }

    public parse(parser: DocumentParser): TransformStatementNode | null {
        parser.requireToken(KeywordTokenType.Transform);

        // Optional integer offset
        const offset = parser.optional(integerParser);

        // Parse the transform name (DOTTED_NAME)
        if (!parser.requireToken(EntityTokenType.FunctionName)) {
            return null;
        }
        const name = parser.currentValue();

        // Optional parameters
        const parameters = parser.optional(this.parametersParser);

        // Parse ATL block
        const block = parser.require(this.atlBlockParser);
        if (block === null) {
            return null;
        }

        return new TransformStatementNode(offset, name, parameters, block);
    }
}

/**
 * one_line_python = "$", PYTHON_EXPRESSION, NEWLINE;
 */
export class OneLinePythonStatementRule extends GrammarRule<OneLinePythonStatementNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.DollarSign);
    }

    public parse(parser: DocumentParser): OneLinePythonStatementNode | null {
        parser.requireToken(KeywordTokenType.DollarSign);

        const expression = parser.require(pythonExpressionParser);
        if (expression === null) {
            return null;
        }

        parser.expectEOL();

        return new OneLinePythonStatementNode(expression);
    }
}

/**
 * Expression
 *   : Literal
 *   | ParenthesizedExpression
 *   ;
 */
export class ExpressionRule extends GrammarRule<ExpressionNode> {
    rules = [new LiteralRule(), new ParenthesizedExpressionRule()];

    public test(parser: DocumentParser) {
        for (const rule of this.rules) {
            if (rule.test(parser)) {
                return true;
            }
        }

        return false;
    }

    public parse(parser: DocumentParser): ExpressionNode | LiteralNode | null {
        for (const rule of this.rules) {
            if (rule.test(parser)) {
                return rule.parse(parser);
            }
        }

        return null;
    }
}

/**
 * ParenthesizedExpression
 *   : '(' Expression ')'
 *   ;
 */
export class ParenthesizedExpressionRule extends GrammarRule<ExpressionNode> {
    private expressionParser = new ExpressionRule();

    public test(parser: DocumentParser) {
        return parser.peek(CharacterTokenType.OpenParentheses);
    }

    public parse(parser: DocumentParser) {
        parser.requireToken(CharacterTokenType.OpenParentheses);
        const expression = this.expressionParser.parse(parser);
        parser.requireToken(CharacterTokenType.CloseParentheses);
        return expression;
    }
}

/**
 * simple_expression
 * : OPERATOR*, (PYTHON_STRING | NAME | FLOAT | parenthesized_python), [(".", NAME) | parenthesized_python]
 * | identifier, [(".", NAME) | parenthesized_python]
 * | member_access_expression
 * ;
 */
export class SimpleExpressionRule extends GrammarRule<ExpressionNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peekAnyOf([EntityTokenType.Identifier, MetaTokenType.MemberAccess, MetaTokenType.SimpleExpression]);
    }

    public parse(parser: DocumentParser): ExpressionNode | null {
        if (parser.peek(MetaTokenType.MemberAccess)) {
            return parser.require(new MemberAccessExpressionRule());
        }

        if (parser.peek(EntityTokenType.Identifier)) {
            return parser.require(new IdentifierRule());
        }

        let expression = "";
        while (parser.peek(MetaTokenType.SimpleExpression)) {
            parser.next();
            expression += parser.currentValue();
        }
        return new LiteralNode(expression);
    }
}

/**
 * python_in_clause = "in", DOTTED_NAME;
 * python = "python", "early"?, "hide"?, python_in_clause?, begin_python_block;
 */
export class PythonStatementRule extends GrammarRule<PythonStatementNode> {
    private pythonBlockParser = new PythonBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Python);
    }

    public parse(parser: DocumentParser): PythonStatementNode | null {
        parser.requireToken(KeywordTokenType.Python);

        // Optional "early" flag
        const isEarly = parser.optionalToken(KeywordTokenType.Early);

        // Optional "hide" flag
        const isHide = parser.optionalToken(KeywordTokenType.Hide);

        // Optional "in" clause
        let inName: string | null = null;
        if (parser.optionalToken(KeywordTokenType.In)) {
            if (!parser.requireToken(EntityTokenType.FunctionName)) {
                return null;
            }
            inName = parser.currentValue();

            // Check for dotted name format with additional components
            while (parser.optionalToken(CharacterTokenType.Dot)) {
                if (!parser.requireToken(EntityTokenType.FunctionName)) {
                    return null;
                }
                inName += "." + parser.currentValue();
            }
        }

        // Parse Python block
        const block = parser.require(this.pythonBlockParser);
        if (block === null) {
            return null;
        }

        return new PythonStatementNode(isEarly, isHide, inName, block);
    }
}

/**
 * init =
 *    | "init", "offset", "=", INTEGER?, NEWLINE
 *    | "init", label
 *    | "init", INTEGER?, begin_block
 *    | "init", INTEGER?, statement
 *    ;
 */
export class InitStatementRule extends GrammarRule<InitStatementNode> {
    private labelStatementParser = new LabelStatementRule();
    private blockParser = new RenpyBlockRule();

    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Init);
    }

    public parse(parser: DocumentParser): InitStatementNode | null {
        parser.requireToken(KeywordTokenType.Init);

        // Check for "init offset = INTEGER?" form
        if (parser.optionalToken(KeywordTokenType.Offset)) {
            if (!parser.requireToken(OperatorTokenType.Assignment)) {
                return null;
            }

            const offset = parser.optional(integerParser) ?? new LiteralNode(0);

            parser.expectEOL();

            return new InitStatementNode(offset, null, null);
        }

        // Optional integer offset for other forms
        const offset = parser.optional(integerParser);

        // Check for "init label" form
        if (this.labelStatementParser.test(parser)) {
            const statement = parser.require(this.labelStatementParser);
            return new InitStatementNode(offset, statement, null);
        }

        // Check for "init INTEGER? begin_block" form
        if (parser.peek(CharacterTokenType.Colon)) {
            const block = parser.require(this.blockParser);
            if (block === null) {
                return null;
            }
            return new InitStatementNode(offset, null, block);
        }

        // Handle "init INTEGER? statement" form
        if (statementParser.test(parser)) {
            const statement = parser.require(statementParser);
            if (statement === null) {
                return null;
            }
            return new InitStatementNode(offset, statement, null);
        }

        return null;
    }
}

/**
 * rpy_monologue = "rpy", "monologue", ("double" | "single" | "none"), NEWLINE;
 */
export class RpyMonologueStatementRule extends GrammarRule<RpyMonologueStatementNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Rpy) && this.isMonologue(parser);
    }

    private isMonologue(parser: DocumentParser): boolean {
        if (!parser.peek(KeywordTokenType.Rpy)) {
            return false;
        }

        parser.next();
        const isMonologue = parser.peek(KeywordTokenType.Monologue);
        parser.previous();

        return isMonologue;
    }

    public parse(parser: DocumentParser): RpyMonologueStatementNode | null {
        parser.requireToken(KeywordTokenType.Rpy);
        parser.requireToken(KeywordTokenType.Monologue);

        let quotationType: string;
        if (parser.optionalToken(KeywordTokenType.Double)) {
            quotationType = "double";
        } else if (parser.optionalToken(KeywordTokenType.Single)) {
            quotationType = "single";
        } else if (parser.optionalToken(KeywordTokenType.None)) {
            quotationType = "none";
        } else {
            // Error: Expected a quote type
            parser.addError(ParseErrorType.InvalidMonologueType, parser.current().type, parser.current().getRange());
            return null;
        }

        parser.expectEOL();

        return new RpyMonologueStatementNode(quotationType);
    }
}

/**
 * rpy_python = "rpy", "python", "3", NEWLINE;
 */
export class RpyPythonStatementRule extends GrammarRule<RpyPythonStatementNode> {
    public test(parser: DocumentParser): boolean {
        return parser.peek(KeywordTokenType.Rpy) && this.isPython(parser);
    }

    private isPython(parser: DocumentParser): boolean {
        if (!parser.peek(KeywordTokenType.Rpy)) {
            return false;
        }

        parser.next();
        const isPython = parser.peek(KeywordTokenType.Python);
        parser.previous();

        return isPython;
    }

    public parse(parser: DocumentParser): RpyPythonStatementNode | null {
        parser.requireToken(KeywordTokenType.Rpy);
        parser.requireToken(KeywordTokenType.Python);

        // Require the Python version number (3)
        if (!parser.requireToken(LiteralTokenType.Integer)) {
            return null;
        }

        const version = parser.currentValue();
        if (version !== "3") {
            // Error: Expected Python version 3
            return null;
        }

        parser.expectEOL();

        return new RpyPythonStatementNode();
    }
}

/**
 * begin_python_block = ":", NEWLINE, INDENT, python_block;
 * python_block = python_statement+, DEDENT;
 * python_statement = ? Python statement ?;
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

        // In this simplified version, we'll just consume the Python block as raw text
        // In a real implementation, you'd want to parse the Python code more carefully
        if (!parser.peek(MetaTokenType.PythonBlock)) {
            return null;
        }

        const statements: StatementNode[] = [];

        // Here we'd parse the Python block content
        // For now, we'll just create a dummy statement to represent the Python code
        statements.push(new OneLinePythonStatementNode(new LiteralNode("Python Block")));

        // Skip past the python block
        parser.next();

        return statements;
    }
}

export class RenpyStatementRule extends GrammarRule<StatementNode> {
    rules = [
        new IfStatementRule(),
        new WhileStatementRule(),
        new PassStatementRule(),
        new MenuStatementRule(),
        new ReturnStatementRule(),
        new JumpStatementRule(),
        new CallStatementRule(),
        new InitStatementRule(),
        new SceneStatementRule(),
        new ShowStatementRule(),
        new ShowLayerStatementRule(),
        new CameraStatementRule(),
        new HideStatementRule(),
        new WithStatementRule(),
        new ImageStatementRule(),
        new DefineStatementRule(),
        new DefaultStatementRule(),
        new TransformStatementRule(),
        new OneLinePythonStatementRule(),
        new PythonStatementRule(),
        new LabelStatementRule(),
        new RpyMonologueStatementRule(),
        // TODO: screen
        // TODO: testcase
        // TODO: translate
        // TODO: style
        new RpyPythonStatementRule(),
        new SayStatementRule(),
    ];

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
