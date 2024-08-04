import { DocumentParser } from "./parser";
import { LogLevel, Range, window } from "vscode";
import { RenpyStatementRule } from "./renpy-grammar-rules";
import { AST } from "./ast-nodes";
import { LogCategory, logCatMessage } from "../logger";
import { RpyProgram } from "../interpreter/program";

// Test decorations
const defDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    fontWeight: "bold",
    textDecoration: "underline wavy 1pt",
});

const errorDecorationType = window.createTextEditorDecorationType({
    color: "red",
    fontWeight: "bold",
    textDecoration: "underline wavy 1pt",
});

const refDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    textDecoration: "underline",
});

export async function testParser() {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor || activeEditor.document.languageId !== "renpy") {
        return;
    }

    const parser = new DocumentParser(activeEditor.document);
    await parser.initialize();

    const statementParser = new RenpyStatementRule();
    const ast = new AST();

    while (parser.hasNext()) {
        parser.skipEmptyLines();

        if (statementParser.test(parser)) {
            ast.append(statementParser.parse(parser));
            parser.expectEOL();
        }

        if (parser.hasNext()) {
            parser.next();
        }
    }

    const errors: Range[] = [];
    for (const error of parser.errors) {
        logCatMessage(LogLevel.Error, LogCategory.Parser, parser.getErrorMessage(error));
        errors.push(error.nextToken.getVSCodeRange());
    }
    activeEditor.setDecorations(errorDecorationType, errors);

    logCatMessage(LogLevel.Debug, LogCategory.Parser, ast.toString());

    const program = new RpyProgram();
    ast.process(program);

    const sym = program.globalScope.resolve("e");
    if (sym === null) {
        logCatMessage(LogLevel.Info, LogCategory.Parser, "Sym: null");
    } else {
        // highlight all sym.references in the active editor
        activeEditor.setDecorations(refDecorationType, sym.references.map((ref) => ref.range).toArray());
        activeEditor.setDecorations(defDecorationType, [sym.definitionLocation.range]);

        logCatMessage(LogLevel.Info, LogCategory.Parser, "Sym: " + sym.toString());
    }
}
