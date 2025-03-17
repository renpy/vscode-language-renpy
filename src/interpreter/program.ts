import { Location as VSLocation } from "vscode";
import { Vector } from "../utilities/vector";

export class RpySymbol {
    public readonly definitionLocation: VSLocation;
    public identifier: string;
    public references = new Vector<VSLocation>();

    constructor(definitionLocation: VSLocation, identifier: string) {
        this.definitionLocation = definitionLocation;
        this.identifier = identifier;
    }

    public addReference(reference: VSLocation) {
        this.references.pushBack(reference);
    }
}

export interface CompileError {
    message: string;
    errorLocation: VSLocation | null;
}

export interface DuplicateDefinitionError extends CompileError {
    existingSymbol: RpySymbol;
    duplicateSymbol: RpySymbol;
}

export class Scope {
    private program: RpyProgram;
    public parent: Scope | null = null;
    public symbols = new Map<string, RpySymbol>();
    public labels = new Map<string, RpySymbol>();

    public parentLabel: RpySymbol | null = null;

    constructor(program: RpyProgram) {
        this.program = program;
    }

    /**
     * Define a new symbol in this scope, throwing an error if a symbol could be resolved with the same identifier.
     * @param identifier The identifier of the symbol to define.
     * @param definitionLocation The location of the symbol's definition.
     * @param noShadow Whether to throw an error if a symbol with the same identifier already exists in a parent scope.
     */
    public defineSymbol(identifier: string, definitionLocation: VSLocation, noShadow = true): RpySymbol | null {
        const symbol = new RpySymbol(definitionLocation, identifier);

        if (this.symbols.has(identifier)) {
            const error: DuplicateDefinitionError = {
                message: `A symbol with the identifier "${identifier}" has already been defined.`,
                existingSymbol: this.symbols.get(identifier)!,
                duplicateSymbol: symbol,
                errorLocation: definitionLocation,
            };
            this.program.errorList.pushBack(error);
            return null;
        } else if (noShadow && this.resolve(identifier)) {
            const error: DuplicateDefinitionError = {
                message: `A symbol with the identifier "${identifier}" has already been defined in this scope.`,
                existingSymbol: this.resolve(identifier)!,
                duplicateSymbol: symbol,
                errorLocation: definitionLocation,
            };
            this.program.errorList.pushBack(error);

            return null;
        }

        this.symbols.set(identifier, symbol);
        return symbol;
    }

    /**
     * Return the symbol with the given identifier, recursively searching parent scopes if necessary or null if no symbol is found.
     * @param identifier The identifier of the symbol to resolve.
     */
    public resolve(identifier: string): RpySymbol | null {
        const symbol = this.symbols.get(identifier);
        if (symbol) {
            return symbol;
        } else if (this.parent) {
            return this.parent.resolve(identifier);
        } else {
            return null;
        }
    }

    /**
     * Define a new symbol in this scope, throwing an error if a symbol could be resolved with the same identifier.
     * @param identifier The identifier of the symbol to define.
     * @param definitionLocation The location of the symbol's definition.
     * @param noShadow Whether to throw an error if a symbol with the same identifier already exists in a parent scope.
     */
    public defineLabel(identifier: string, definitionLocation: VSLocation, noShadow = true): RpySymbol | null {
        if (this.labels.has(identifier)) {
            const error: DuplicateDefinitionError = {
                message: `A label with the identifier "${identifier}" has already been defined.`,
                existingSymbol: this.symbols.get(identifier)!,
                duplicateSymbol: new RpySymbol(definitionLocation, identifier),
                errorLocation: definitionLocation,
            };
            this.program.errorList.pushBack(error);
            return null;
        } else if (noShadow && this.resolve(identifier)) {
            const error: DuplicateDefinitionError = {
                message: `A label with the identifier "${identifier}" has already been defined in this scope.`,
                existingSymbol: this.resolve(identifier)!,
                duplicateSymbol: new RpySymbol(definitionLocation, identifier),
                errorLocation: definitionLocation,
            };
            this.program.errorList.pushBack(error);

            return null;
        }

        const label = new RpySymbol(definitionLocation, identifier);
        this.labels.set(identifier, label);
        return label;
    }

    /**
     * Return the symbol with the given identifier, recursively searching parent scopes if necessary or null if no symbol is found.
     * @param identifier The identifier of the symbol to resolve.
     */
    public resolveLabel(identifier: string): RpySymbol | null {
        const label = this.labels.get(identifier);
        if (label) {
            return label;
        } else if (this.parent) {
            return this.parent.resolve(identifier);
        } else {
            return null;
        }
    }
}

export class RpyProgram {
    public readonly globalScope = new Scope(this);
    public errorList = new Vector<CompileError>();
}
