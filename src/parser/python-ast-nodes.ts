import { Location as VSLocation } from "vscode";

import { ExpressionNode, IdentifierNode } from "./ast-nodes";

export class AssignmentExpressionNode extends ExpressionNode {
    public readonly srcLocation: VSLocation;
    public target: IdentifierNode;
    public value: ExpressionNode;

    constructor(srcLocation: VSLocation, target: IdentifierNode, value: ExpressionNode) {
        super();
        this.srcLocation = srcLocation;
        this.target = target;
        this.value = value;
    }
}

/**
 * Represents a lambda function expression (anonymous function)
 * e.g. `lambda x, y: x + y`
 */
export class LambdaExpressionNode extends ExpressionNode {
    public readonly srcLocation: VSLocation;
    public parameters: IdentifierNode[];
    public body: ExpressionNode;

    constructor(srcLocation: VSLocation, parameters: IdentifierNode[], body: ExpressionNode) {
        super();
        this.srcLocation = srcLocation;
        this.parameters = parameters;
        this.body = body;
    }
}

/**
 * Represents a class definition in Python
 * e.g. `class MyClass(BaseClass): ...`
 */
export class PythonClassDefinitionNode extends ExpressionNode {
    public readonly srcLocation: VSLocation;
    public name: string;
    public baseClasses: ExpressionNode[] | null;

    constructor(srcLocation: VSLocation, name: string, baseClasses: ExpressionNode[] | null) {
        super();
        this.srcLocation = srcLocation;
        this.name = name;
        this.baseClasses = baseClasses;
    }
}
