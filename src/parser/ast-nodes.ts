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
            const hasToString = v.toString !== Object.prototype.toString;
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
    public process(program: RpyProgram) {
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

    public process(program: RpyProgram) {
        this.nodes.forEach((node) => {
            if (node instanceof StatementNode) {
                try {
                    node.process(program);
                } catch (e) {
                    program.errorList.pushBack(e as Error);
                }
            }
        });
    }

    public toString(): string {
        return this.nodes.toString();
    }
}

export class IfStatementNode extends StatementNode {
    public condition: ExpressionNode;
    public thenBranch: StatementNode;
    public elseBranch: StatementNode | null;

    constructor(condition: ExpressionNode, thenBranch: StatementNode, elseBranch: StatementNode | null) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
}

export class WhileStatementNode extends StatementNode {
    public condition: ExpressionNode;
    public body: StatementNode;

    constructor(condition: ExpressionNode, body: StatementNode) {
        super();
        this.condition = condition;
        this.body = body;
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

    public override process(program: RpyProgram) {
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

    public override process(program: RpyProgram) {
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
}
