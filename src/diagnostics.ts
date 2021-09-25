// Diagnostics (warnings and errors)
'use strict';

import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, Range, TextDocument, window, workspace } from "vscode";
import { NavigationData } from "./navigationdata";
import { extractFilename } from "./workspace";

// Renpy Store Variables (https://www.renpy.org/doc/html/store_variables.html)
// These variables do not begin with '_' but should be ignored by store warnings because they are pre-defined by Ren'Py
const renpy_store = ['adv','default_mouse','main_menu','menu','mouse_visible','name_only','narrator','say','save_name'];

/**
 * Analyzes the text document for problems. 
 * @param doc text document to analyze
 * @param diagnostics diagnostic collection
 */
 export function refreshDiagnostics(doc: TextDocument, diagnosticCollection: DiagnosticCollection): void {
    if (doc.languageId !== 'renpy') {
        return;
    }

    const diagnostics: Diagnostic[] = [];
    const config = workspace.getConfiguration('renpy');

    //Filenames must begin with a letter or number,
    //and may not begin with "00", as Ren'Py uses such files for its own purposes.
    const filename = extractFilename(doc.uri.path);
    if (filename) {
        if (!filename.match(/^[a-zA-Z0-9]/) || filename.startsWith('00')) {
            let invalidRange = new Range(0, 0, doc.lineCount, 0);
            let range = doc.validateRange(invalidRange);
            const diagnostic = new Diagnostic(range, "Filenames must begin with a letter or number, but may not begin with '00' as Ren'Py uses such files for its own purposes.", DiagnosticSeverity.Error);
            diagnostics.push(diagnostic);
        }
    }

    // check Document text for errors and warnings
    const dataLoaded = NavigationData.data && NavigationData.data.location;

    // check for persistent variables that have not been defined/defaulted
    let persistents = [];
    if (dataLoaded) {
        const gameObjects = NavigationData.data.location['persistent'];
        for (let key in gameObjects) {
            persistents.push(key);
        }
    }

    let firstIndentation = 0;
    const rxVariableCheck = /^\s*(default|define)\s+([^a-zA-Z\s][a-zA-Z0-9_]*)\s+=/g;
    const rxObsoleteCheck = /[\s\(=]+(LiveCrop|LiveComposite|Tooltip|im\.Rotozoom|im\.ImageBase|im\.ramp|im\.Map|im\.Flip|im\.math|im\.expands_bounds|im\.threading|im\.zipfile|im\.Recolor|im\.Color|im\.io|im\.Alpha|im\.Data|im\.Image|im\.Twocolor|im\.MatrixColor|im\.free_memory|im\.Tile|im\.FactorScale|im\.Sepia|im\.Crop|im\.AlphaMask|im\.Blur|im\.tobytes|im\.matrix|im\.Grayscale|ui\.add|ui\.bar|ui\.imagebutton|ui\.input|ui\.key|ui\.label|ui\.null|ui\.text|ui\.textbutton|ui\.timer|ui\.vbar|ui\.hotspot|ui\.hotbar|ui\.spritemanager|ui\.button|ui\.frame|ui\.transform|ui\.window|ui\.drag|ui\.fixed|ui\.grid|ui\.hbox|ui\.side|ui\.vbox|ui\.imagemap|ui\.draggroup)[^a-zA-Z]/g;
    const rxPersistentDefines = /^\s*(default|define)\s*persistent.(\w*)\s.*=\s*(.*$)/g;
    const rxPersistentCheck = /\s+persistent\.(\w+)[^a-zA-Z]/g;
    const rxStoreCheck = /\s+store\.(\w+)[^a-zA-Z]/g;
    const rxTabCheck = /^(\t+)/g;
    
    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
		const line = doc.lineAt(lineIndex).text;
        //const line = NavigationData.filterStringLiterals(doc.lineAt(lineIndex).text);

        // check line for invalid define/default variable names
        // Variables must begin with a letter or number, and may not begin with '_'

        let matches;
        while ((matches = rxVariableCheck.exec(line)) !== null) {
            const offset = matches.index + matches[0].indexOf(matches[2]);
            const range = new Range(lineIndex, offset, lineIndex, offset + matches[2].length);
            const diagnostic = new Diagnostic(range, `"${matches[2]}": Variables must begin with a letter (and may contain numbers, letters, or underscores). Variables may not begin with '_' as Ren'Py reserves such variables for its own purposes.`, DiagnosticSeverity.Error);
            diagnostics.push(diagnostic);
        }

        const checkSpacing: string = config.warnOnIndentationAndSpacingIssues;
        if (checkSpacing.toLowerCase() !== "disabled") {
            let severity = DiagnosticSeverity.Error;
            if (checkSpacing.toLowerCase() === "warning") {
                severity = DiagnosticSeverity.Warning;
            }
            matches = line.match(rxTabCheck);
            if (matches) {
                const offset = matches.indexOf(matches[0]);
                const range = new Range(lineIndex, offset, lineIndex, offset + matches[0].length);
                const diagnostic = new Diagnostic(range, `Tab characters are not allowed. Indentation must consist only of spaces in Ren'Py scripts. (4 spaces is strongly recommended.)`, severity);
                diagnostics.push(diagnostic);
            } else {
                const indention = line.length - line.trimLeft().length;
                if (indention > 0 && firstIndentation === 0) {
                    firstIndentation = indention;
                }
    
                if (indention > 0 && indention % firstIndentation !== 0) {
                    const range = new Range(lineIndex, 0, lineIndex, indention);
                    const diagnostic = new Diagnostic(range, `Inconsistent spacing detected (${indention} given, expected a multiple of ${firstIndentation}). Indentation must consist only of spaces in Ren'Py scripts. Each indentation level must consist of the same number of spaces. (4 spaces is strongly recommended.)`, severity);
                    diagnostics.push(diagnostic);
                }
            }
        }

        // check line for obsolete methods
        if (config.warnOnObsoleteMethods) {
            while ((matches = rxObsoleteCheck.exec(line)) !== null) {
                const offset = matches.index + matches[0].indexOf(matches[1]);
                const range = new Range(lineIndex, offset, lineIndex, offset + matches[1].length);
                const diagnostic = new Diagnostic(range, `"${matches[1]}": This function is obsolete or outdated.`, DiagnosticSeverity.Warning);
                diagnostics.push(diagnostic);
            }
        }

        // check store prefixed variables have been defaulted
        const defaults = NavigationData.gameObjects['define_types'];
        if (defaults) {
            const filtered = Object.keys(defaults).filter(key => defaults[key].define === 'default');
            while ((matches = rxStoreCheck.exec(line)) !== null) {
                if (!matches[1].startsWith('_') && !filtered.includes(matches[1]) && !renpy_store.includes(matches[1])) {
                    const offset = matches.index + matches[0].indexOf(matches[1]);
                    const range = new Range(lineIndex, offset, lineIndex, offset + matches[1].length);
                    const diagnostic = new Diagnostic(range, `"store.${matches[1]}": Use of a store variable that has not been defaulted.`, DiagnosticSeverity.Warning);
                    diagnostics.push(diagnostic);
                }
            }
        }

        // check persistents
        if (config.warnOnUndefinedPersistents) {
            while ((matches = rxPersistentCheck.exec(line)) !== null) {
                if (line.match(rxPersistentDefines)) {
                    if (!persistents.includes(matches[1])) {
                        persistents.push(matches[1]);
                        continue;
                    }
                }
                if (!matches[1].startsWith('_') && !persistents.includes(matches[1])) {
                    const offset = matches.index + matches[0].indexOf(matches[1]);
                    const range = new Range(lineIndex, offset, lineIndex, offset + matches[1].length);
                    const diagnostic = new Diagnostic(range, `"persistent.${matches[1]}": This persistent variable has not been defaulted or defined.`, DiagnosticSeverity.Warning);
                    diagnostics.push(diagnostic);
                }
            }
        }
	}

	diagnosticCollection.set(doc.uri, diagnostics);
}

export function subscribeToDocumentChanges(context: ExtensionContext, diagnostics: DiagnosticCollection): void {
	if (window.activeTextEditor) {
		refreshDiagnostics(window.activeTextEditor.document, diagnostics);
	}

	context.subscriptions.push(
		window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, diagnostics);
			}
		})
	);

	context.subscriptions.push(
		workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, diagnostics))
	);

	context.subscriptions.push(
		workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri))
	);
}