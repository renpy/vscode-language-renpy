import { ASTNode } from "./ast-nodes";
import { DocumentParser } from "./parser";

export abstract class GrammarRule<T extends ASTNode> {
    public abstract test(parser: DocumentParser): boolean;
    public abstract parse(parser: DocumentParser): T | null;
}
