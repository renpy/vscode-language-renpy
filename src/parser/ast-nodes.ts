import { tokenTypeToString } from "../tokenizer/token-definitions";
import { TokenType } from "../tokenizer/renpy-tokens";
import { Vector } from "../utilities/vector";
import { Location as VSLocation, Range as VSRange } from "vscode";
import { RpyProgram } from "src/interpreter/program";

VSRange.prototype.toString = function () {
    return `[L${this.start.line + 1}:C${this.start.character + 1}, L${this.end.line + 1}:C${this.end.character + 1}]`;
};

VSLocation.prototype.toString = function () {
    return `${this.uri.toString()} @ ${this.range.toString()}`;
};

export abstract class ASTNode {
    private static _printIndent = 0;

    public toString(): string {
        const object = { type: this.constructor.name, ...this };
        let output = "{\n";
        ASTNode._printIndent += 2;
        Object.entries(object).forEach(([key, v]) => {
            output += " ".repeat(ASTNode._printIndent);
            const tokenString = tokenTypeToString(v);
            const hasToString = v && v.toString !== Object.prototype.toString;
            const value = tokenString || (hasToString ? v.toString() : JSON.stringify(v));
            output += `${key}: ${value}\n`;
        });
        ASTNode._printIndent -= 2;
        output += " ".repeat(ASTNode._printIndent);
        output += "}";
        return output;
    }

    // public abstract process(): void;
}
export abstract class StatementNode extends ASTNode {
    public visit(program: RpyProgram) {
        return; // Do nothing by default
    }
}
export abstract class ExpressionNode extends ASTNode {}

export class AST {
    public nodes: Vector<ASTNode> = new Vector<ASTNode>();

    public append(node: ASTNode | null) {
        if (node !== null) {
            this.nodes.pushBack(node);
        }
    }

    public visit(program: RpyProgram) {
        this.nodes.forEach((node) => {
            if (node instanceof StatementNode) {
                try {
                    node.visit(program);
                } catch (e) {
                    program.errorList.pushBack({ message: `Internal compiler error: ${(e as Error).message}`, errorLocation: null });
                }
            }
        });
    }

    public toString(): string {
        return this.nodes.toString();
    }
}

export class IfClauseNode extends StatementNode {
    public condition: ExpressionNode;
    public block: StatementNode[];

    constructor(condition: ExpressionNode, block: StatementNode[]) {
        super();
        this.condition = condition;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class ElseClauseNode extends StatementNode {
    public block: StatementNode[];

    constructor(block: StatementNode[]) {
        super();
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class IfStatementNode extends StatementNode {
    public ifClause: IfClauseNode;
    public elifClauses: IfClauseNode[];
    public elseClause: ElseClauseNode | null;

    constructor(ifClause: IfClauseNode, elifClauses: IfClauseNode[], elseClause: ElseClauseNode | null) {
        super();
        this.ifClause = ifClause;
        this.elifClauses = elifClauses;
        this.elseClause = elseClause;
    }

    public override visit(program: RpyProgram) {
        this.ifClause.visit(program);
        this.elifClauses.forEach((clause) => clause.visit(program));
        if (this.elseClause !== null) {
            this.elseClause.visit(program);
        }
    }
}

export class WhileStatementNode extends StatementNode {
    public condition: ExpressionNode;
    public block: StatementNode[];

    constructor(condition: ExpressionNode, block: StatementNode[]) {
        super();
        this.condition = condition;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class AssignmentStatementNode extends StatementNode {
    public name: string;
    public value: ExpressionNode;

    constructor(name: string, value: ExpressionNode) {
        super();
        this.name = name;
        this.value = value;
    }
}

export class ExpressionStatementNode extends StatementNode {
    public expression: ExpressionNode;

    constructor(expression: ExpressionNode) {
        super();
        this.expression = expression;
    }
}

export class FunctionDefinitionNode extends StatementNode {
    public readonly srcLocation: VSLocation;
    public readonly name: string;
    public readonly args: ExpressionNode[];

    constructor(srcLocation: VSLocation, name: string, args: ExpressionNode[]) {
        super();
        this.srcLocation = srcLocation;
        this.name = name;
        this.args = args;
    }
}

export class FunctionCallNode extends StatementNode {
    public readonly srcLocation: VSLocation;
    public readonly name: string;
    public readonly args: ExpressionNode[];

    constructor(srcLocation: VSLocation, name: string, args: ExpressionNode[]) {
        super();
        this.srcLocation = srcLocation;
        this.name = name;
        this.args = args;
    }
}

export class ClassDefinitionNode extends StatementNode {
    public readonly srcLocation: VSLocation;
    public name: string;
    public body: StatementNode[];

    constructor(srcLocation: VSLocation, name: string, body: StatementNode[]) {
        super();
        this.srcLocation = srcLocation;
        this.name = name;
        this.body = body;
    }

    public override visit(program: RpyProgram) {
        this.body.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class BinaryOperationNode extends ExpressionNode {
    public left: ExpressionNode;
    public operator: TokenType;
    public right: ExpressionNode;

    constructor(left: ExpressionNode, operator: TokenType, right: ExpressionNode) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

export class UnaryOperationNode extends ExpressionNode {
    public operator: TokenType;
    public operand: ExpressionNode;

    constructor(operator: TokenType, operand: ExpressionNode) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
}

type LiteralValue = string | number | boolean;

export class LiteralNode extends ExpressionNode {
    public value: LiteralValue;

    constructor(value: LiteralValue) {
        super();
        this.value = value;
    }
}

export class IdentifierNode extends ExpressionNode {
    public readonly srcLocation: VSLocation;
    public name: string;

    constructor(srcLocation: VSLocation, name: string) {
        super();
        this.srcLocation = srcLocation;
        this.name = name;
    }
}

/**
 * Represents a member access operation, such as `foo.bar`, `get_foo().bar` or `foo.get_bar()`.
 */
export class MemberAccessNode extends ExpressionNode {
    public left: IdentifierNode | MemberAccessNode;
    public right: IdentifierNode | MemberAccessNode;

    constructor(left: IdentifierNode | MemberAccessNode, right: IdentifierNode | MemberAccessNode) {
        super();
        this.left = left;
        this.right = right;
    }
}

export class AssignmentOperationNode extends ExpressionNode {
    public left: ExpressionNode;
    public operation: TokenType;
    public right: ExpressionNode;

    constructor(variable: ExpressionNode, operation: TokenType, value: ExpressionNode) {
        super();
        this.left = variable;
        this.operation = operation;
        this.right = value;
    }
}

export class DefineStatementNode extends StatementNode {
    public assignmentOperation: AssignmentOperationNode | null;
    public offset: LiteralNode;

    constructor(offset: LiteralNode, assignmentOperation: AssignmentOperationNode | null) {
        super();
        this.offset = offset;
        this.assignmentOperation = assignmentOperation;
    }

    public override visit(program: RpyProgram) {
        if (this.assignmentOperation === null) {
            throw new Error("Should remove the option for this to be null. Parser should error if it is null.");
        }

        if (!(this.assignmentOperation.left instanceof IdentifierNode)) {
            throw new Error("Expected identifier node");
        }

        const variableName = this.assignmentOperation.left.name;
        program.globalScope.defineSymbol(variableName, this.assignmentOperation.left.srcLocation);
    }
}

export class DefaultStatementNode extends StatementNode {
    public assignmentOperation: AssignmentOperationNode;
    public offset: LiteralNode;

    constructor(offset: LiteralNode, assignmentOperation: AssignmentOperationNode) {
        super();
        this.offset = offset;
        this.assignmentOperation = assignmentOperation;
    }

    public override visit(program: RpyProgram) {
        if (!(this.assignmentOperation.left instanceof IdentifierNode)) {
            throw new Error("Expected identifier node");
        }

        const variableName = this.assignmentOperation.left.name;
        program.globalScope.defineSymbol(variableName, this.assignmentOperation.left.srcLocation);
    }
}

export class SayStatementNode extends StatementNode {
    public who: ExpressionNode | null;
    public attributes: ExpressionNode | null;
    public temporaryAttributes: ExpressionNode | null;
    public what: LiteralNode;

    constructor(who: ExpressionNode | null, attributes: ExpressionNode | null, temporaryAttributes: ExpressionNode | null, what: LiteralNode) {
        super();
        this.who = who;
        this.attributes = attributes;
        this.temporaryAttributes = temporaryAttributes;
        this.what = what;
    }

    public override visit(program: RpyProgram) {
        if (this.who instanceof IdentifierNode) {
            const variableName = this.who.name;
            const definitionSymbol = program.globalScope.resolve(variableName);
            if (definitionSymbol === null) {
                program.errorList.pushBack({ message: `Undefined variable '${variableName}'`, errorLocation: this.who.srcLocation });
            }

            definitionSymbol?.references.pushBack(this.who.srcLocation);
        } else if (this.who instanceof MemberAccessNode) {
            /*const variableName = this.who.left.name;
            const definitionSymbol = program.globalScope.resolve(variableName);
            if (definitionSymbol === null) {
                program.errorList.pushBack({ message: `Undefined variable ${variableName}`, errorLocation: this.who.left.srcLocation });
            }

            definitionSymbol?.references.pushBack(this.who.left.srcLocation);*/
            // TODO: Implement member access using 'storage scopes'
        }
    }
}

export class ParameterNode extends ASTNode {
    public name: IdentifierNode;
    public value: ExpressionNode | null;

    constructor(name: IdentifierNode, value: ExpressionNode | null) {
        super();
        this.name = name;
        this.value = value;
    }
}

export class LabelNameNode extends ExpressionNode {
    public readonly srcLocation: VSLocation;
    public globalName: string | null;
    public localName: string | null;

    constructor(srcLocation: VSLocation, globalName: string | null, localName: string | null) {
        super();
        this.srcLocation = srcLocation;
        this.globalName = globalName;
        this.localName = localName;
    }
}

export class LabelStatementNode extends StatementNode {
    public labelName: LabelNameNode;
    public parameters: ParameterNode[] | null;
    public hide: boolean;
    public block: StatementNode[];

    constructor(labelName: LabelNameNode, parameters: ParameterNode[] | null, hide: boolean, block: StatementNode[]) {
        super();
        this.labelName = labelName;
        this.parameters = parameters;
        this.hide = hide;
        this.block = block;
    }

    private processDefinition(program: RpyProgram) {
        // If we have a local name without global. `program.globalScope` requires parentLabel to be defined.
        // If we have a global name and a local name, check if the global name is equal to `program.globalScope`

        let globalName = this.labelName.globalName;
        const localName = this.labelName.localName;

        if (globalName === null) {
            // .local label
            if (localName === null) {
                program.errorList.pushBack({ message: "Expected a local label name", errorLocation: this.labelName.srcLocation });
                return;
            }
            if (program.globalScope.parentLabel === null) {
                program.errorList.pushBack({ message: "Expected a parent label to be defined", errorLocation: this.labelName.srcLocation });
                return;
            }

            globalName = program.globalScope.parentLabel.identifier;

            program.globalScope.defineLabel(`${globalName}.${localName}`, this.labelName.srcLocation);
        } else {
            if (program.globalScope.parentLabel !== null) {
                program.errorList.pushBack({ message: "Cannot define a global label within a label", errorLocation: this.labelName.srcLocation });
                return;
            }

            if (localName) {
                // full global.local name
                program.globalScope.defineLabel(`${globalName}.${localName}`, this.labelName.srcLocation);
            } else {
                // global name
                const symbol = program.globalScope.defineLabel(`${globalName}`, this.labelName.srcLocation);

                program.globalScope.parentLabel = symbol;
            }
        }
    }

    public override visit(program: RpyProgram) {
        this.processDefinition(program);

        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });

        program.globalScope.parentLabel = null;
    }
}

export class ImageNameNode extends ExpressionNode {
    public readonly srcLocation: VSLocation;
    public nameComponents: IdentifierNode[] | null;

    constructor(srcLocation: VSLocation, nameComponents: IdentifierNode[] | null) {
        super();
        this.srcLocation = srcLocation;
        this.nameComponents = nameComponents;
    }
}

export class ImageStatementNode extends StatementNode {
    public imageName: ImageNameNode;
    public block: StatementNode[] | null;
    public assignment: AssignmentOperationNode | null;

    constructor(imageName: ImageNameNode, block: StatementNode[] | null, assignment: AssignmentOperationNode | null) {
        super();
        this.imageName = imageName;
        this.block = block;
        this.assignment = assignment;
    }

    public override visit(program: RpyProgram) {
        this.block?.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class ReturnStatementNode extends StatementNode {
    public expression: ExpressionNode | null;

    constructor(expression: ExpressionNode | null) {
        super();
        this.expression = expression;
    }
}

export class PassStatementNode extends StatementNode {
    constructor() {
        super();
    }
}

export class CallStatementNode extends StatementNode {
    public target: ExpressionNode | LabelNameNode;
    public isPass: boolean;
    public arguments: ExpressionNode[] | null;
    public fromExpression: LabelNameNode | null;

    constructor(target: ExpressionNode | LabelNameNode, isPass: boolean, args: ExpressionNode[] | null, fromExpression: LabelNameNode | null) {
        super();
        this.target = target;
        this.isPass = isPass;
        this.arguments = args;
        this.fromExpression = fromExpression;
    }
}

export class WithStatementNode extends StatementNode {
    public expression: ExpressionNode;

    constructor(expression: ExpressionNode) {
        super();
        this.expression = expression;
    }
}

export class JumpStatementNode extends StatementNode {
    public target: ExpressionNode | LabelNameNode;

    constructor(target: ExpressionNode | LabelNameNode) {
        super();
        this.target = target;
    }
}

export class MenuItemSetNode extends StatementNode {
    public expression: ExpressionNode;

    constructor(expression: ExpressionNode) {
        super();
        this.expression = expression;
    }
}

export class MenuItemChoiceNode extends StatementNode {
    public caption: LiteralNode;
    public arguments: ExpressionNode[] | null;
    public condition: ExpressionNode | null;
    public block: StatementNode[];

    constructor(caption: LiteralNode, args: ExpressionNode[] | null, condition: ExpressionNode | null, block: StatementNode[]) {
        super();
        this.caption = caption;
        this.arguments = args;
        this.condition = condition;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class MenuStatementNode extends StatementNode {
    public labelName: LabelNameNode | null;
    public arguments: ExpressionNode[] | null;
    public items: StatementNode[];

    constructor(labelName: LabelNameNode | null, args: ExpressionNode[] | null, items: StatementNode[]) {
        super();
        this.labelName = labelName;
        this.arguments = args;
        this.items = items;
    }

    public override visit(program: RpyProgram) {
        this.items.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class ImageSpecifierNode extends ASTNode {
    public target: ExpressionNode | ImageNameNode;
    public clauses: ExpressionNode[];

    constructor(target: ExpressionNode | ImageNameNode, clauses: ExpressionNode[]) {
        super();
        this.target = target;
        this.clauses = clauses;
    }
}

export class SceneStatementNode extends StatementNode {
    public imageSpecifier: ImageSpecifierNode | null;
    public withExpr: ExpressionNode | null;
    public onlayer: ExpressionNode | null;
    public block: StatementNode[] | null;

    constructor(imageSpecifier: ImageSpecifierNode | null, withExpr: ExpressionNode | null, onlayer: ExpressionNode | null, block: StatementNode[] | null) {
        super();
        this.imageSpecifier = imageSpecifier;
        this.withExpr = withExpr;
        this.onlayer = onlayer;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block?.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class ShowStatementNode extends StatementNode {
    public imageSpecifier: ImageSpecifierNode;
    public withExpr: ExpressionNode | null;
    public block: StatementNode[] | null;

    constructor(imageSpecifier: ImageSpecifierNode, withExpr: ExpressionNode | null, block: StatementNode[] | null) {
        super();
        this.imageSpecifier = imageSpecifier;
        this.withExpr = withExpr;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block?.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class ShowLayerStatementNode extends StatementNode {
    public layerName: string;
    public atExpression: ExpressionNode | null;
    public block: StatementNode[] | null;

    constructor(layerName: string, atExpression: ExpressionNode | null, block: StatementNode[] | null) {
        super();
        this.layerName = layerName;
        this.atExpression = atExpression;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block?.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class HideStatementNode extends StatementNode {
    public imageSpecifier: ImageSpecifierNode;
    public withExpr: ExpressionNode | null;

    constructor(imageSpecifier: ImageSpecifierNode, withExpr: ExpressionNode | null) {
        super();
        this.imageSpecifier = imageSpecifier;
        this.withExpr = withExpr;
    }
}

export class CameraStatementNode extends StatementNode {
    public name: string | null;
    public atExpression: ExpressionNode | null;
    public block: StatementNode[] | null;

    constructor(name: string | null, atExpression: ExpressionNode | null, block: StatementNode[] | null) {
        super();
        this.name = name;
        this.atExpression = atExpression;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block?.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class TransformStatementNode extends StatementNode {
    public offset: LiteralNode | null;
    public name: string;
    public parameters: ParameterNode[] | null;
    public block: StatementNode[];

    constructor(offset: LiteralNode | null, name: string, parameters: ParameterNode[] | null, block: StatementNode[]) {
        super();
        this.offset = offset;
        this.name = name;
        this.parameters = parameters;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class OneLinePythonStatementNode extends StatementNode {
    public expression: ExpressionNode;

    constructor(expression: ExpressionNode) {
        super();
        this.expression = expression;
    }
}

export class PythonStatementNode extends StatementNode {
    public isEarly: boolean;
    public isHide: boolean;
    public inName: string | null;
    public block: StatementNode[];

    constructor(isEarly: boolean, isHide: boolean, inName: string | null, block: StatementNode[]) {
        super();
        this.isEarly = isEarly;
        this.isHide = isHide;
        this.inName = inName;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class InitStatementNode extends StatementNode {
    public offset: LiteralNode | null;
    public statement: StatementNode | null;
    public block: StatementNode[] | null;

    constructor(offset: LiteralNode | null, statement: StatementNode | null, block: StatementNode[] | null) {
        super();
        this.offset = offset;
        this.statement = statement;
        this.block = block;
    }

    public override visit(program: RpyProgram) {
        this.block?.forEach((node) => {
            if (node instanceof StatementNode) {
                node.visit(program);
            }
        });
    }
}

export class RpyMonologueStatementNode extends StatementNode {
    public quotationType: string; // "double", "single", or "none"

    constructor(quotationType: string) {
        super();
        this.quotationType = quotationType;
    }
}

export class RpyPythonStatementNode extends StatementNode {
    constructor() {
        super();
    }
}
