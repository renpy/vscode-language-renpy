// Diagnostics (warnings and errors)
import { commands, Diagnostic, DiagnosticCollection, DiagnosticSeverity, Disposable, ExtensionContext, FileType, languages, LogLevel, Range, TextDocument, Uri, window, workspace } from "vscode";
import { NavigationData } from "./navigation-data";
import { getAllOpenTabInputTextUri } from "./utilities/functions";
import { extractFilename } from "./workspace";
import { LogCategory, logCatMessage } from "./logger";

// Renpy Store Variables (https://www.renpy.org/doc/html/store_variables.html)
// These variables do not begin with '_' but should be ignored by store warnings because they are pre-defined by Ren'Py
const renpyStore = [
    "adv",
    "default_mouse",
    "main_menu",
    "menu",
    "mouse_visible",
    "name_only",
    "narrator",
    "say",
    "save_name",
    "persistent",
    "_autosave",
    "_confirm_quit",
    "_dismiss_pause",
    "_game_menu_screen",
    "_history",
    "_history_list",
    "_ignore_action",
    "_menu",
    "_quit_slot",
    "_rollback",
    "_screenshot_pattern",
    "_skipping",
    "_version",
    "_window",
    "_window_auto",
    "_window_subtitle",
    "_in_replay",
    "_live2d_fade",
];
// Python Reserved Names (https://www.renpy.org/doc/html/reserved.html)
const rxReservedPythonCheck =
    /^\s*(default|define)\s+(ArithmeticError|AssertionError|AttributeError|BaseException|BufferError|BytesWarning|DeprecationWarning|EOFError|Ellipsis|EnvironmentError|Exception|False|FloatingPointError|FutureWarning|GeneratorExit|IOError|ImportError|ImportWarning|IndentationError|IndexError|KeyError|KeyboardInterrupt|LookupError|MemoryError|NameError|None|NoneType|NotImplemented|NotImplementedError|OSError|OverflowError|PPP|PendingDeprecationWarning|ReferenceError|RuntimeError|RuntimeWarning|StandardError|StopIteration|SyntaxError|SyntaxWarning|SystemError|SystemExit|TabError|True|TypeError|UnboundLocalError|UnicodeDecodeError|UnicodeEncodeError|UnicodeError|UnicodeTranslateError|UnicodeWarning|UserWarning|ValueError|Warning|ZeroDivisionError|abs|all|any|apply|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|copyright|credits|delattr|dict|dir|divmod|enumerate|eval|execfile|exit|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|license|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|quit|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\s*=/g;
// Obsolete Methods
const rxObsoleteCheck =
    /[\s(=]+(LiveCrop|LiveComposite|Tooltip|im\.Rotozoom|im\.ImageBase|im\.ramp|im\.Map|im\.Flip|im\.math|im\.expands_bounds|im\.threading|im\.zipfile|im\.Recolor|im\.Color|im\.io|im\.Alpha|im\.Data|im\.Image|im\.Twocolor|im\.MatrixColor|im\.free_memory|im\.Tile|im\.FactorScale|im\.Sepia|im\.Crop|im\.AlphaMask|im\.Blur|im\.tobytes|im\.matrix|im\.Grayscale|ui\.add|ui\.bar|ui\.imagebutton|ui\.input|ui\.key|ui\.label|ui\.null|ui\.text|ui\.textbutton|ui\.timer|ui\.vbar|ui\.hotspot|ui\.hotbar|ui\.spritemanager|ui\.button|ui\.frame|ui\.transform|ui\.window|ui\.drag|ui\.fixed|ui\.grid|ui\.hbox|ui\.side|ui\.vbox|ui\.imagemap|ui\.draggroup)[^a-zA-Z]/g;

const rxVariableCheck = /^\s*(default|define)\s+([^a-zA-Z\s_][a-zA-Z0-9_]*)\s+=/g;
const rxReservedVariableCheck = /\s*(default|define)\s+(_[a-zA-Z0-9]*)\s+=/g;
const rxPersistentDefines = /^\s*(default|define)\s+persistent\.([a-zA-Z]+[a-zA-Z0-9_]*)\s*=\s*(.*$)/g;
const rxPersistentCheck = /\s+persistent\.(\w+)[^a-zA-Z]/g;
const rxStoreCheck = /\s+store\.(\w+)[^a-zA-Z_]?/g;
const rxTabCheck = /^(\t+)/g;
const rsComparisonCheck = /\s+(if|while)\s+(\w+)\s*(=)\s*(\w+)\s*/g;

const diagnosticModeEvents: Disposable[] = [];

/**
 * Init diagnostics
 * @param context extension context
 */
export function diagnosticsInit(context: ExtensionContext) {
    const diagnostics = languages.createDiagnosticCollection("renpy");
    context.subscriptions.push(diagnostics);

    // custom command - refresh diagnostics
    const refreshDiagnosticsCommand = commands.registerCommand("renpy.refreshDiagnostics", () => {
        if (window.activeTextEditor) {
            refreshDiagnostics(window.activeTextEditor.document, diagnostics);
        }
    });
    context.subscriptions.push(refreshDiagnosticsCommand);

    // Listen to diagnosticMode changes
    context.subscriptions.push(
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("renpy.diagnostics.diagnosticMode")) {
                updateDiagnosticMode(context, diagnostics);
            }
        }),
    );

    const onDidChangeTextDocument = workspace.onDidChangeTextDocument((doc) => refreshDiagnostics(doc.document, diagnostics));
    context.subscriptions.push(onDidChangeTextDocument);

    updateDiagnosticMode(context, diagnostics);
}

/**
 * Analyzes the text document for problems.
 * @param doc text document to analyze
 * @param diagnostics diagnostic collection
 */
function refreshDiagnostics(doc: TextDocument, diagnosticCollection: DiagnosticCollection): void {
    if (doc.languageId !== "renpy") {
        return;
    }

    const diagnostics: Diagnostic[] = [];
    const config = workspace.getConfiguration("renpy.diagnostics");

    //Filenames must begin with a letter or number,
    //and may not begin with "00", as Ren'Py uses such files for its own purposes.
    const checkFilenames: string = config.warnOnInvalidFilenameIssues;
    if (checkFilenames.toLowerCase() !== "disabled") {
        let severity = DiagnosticSeverity.Error;
        if (checkFilenames.toLowerCase() === "warning") {
            severity = DiagnosticSeverity.Warning;
        }

        const filename = extractFilename(doc.uri.path);
        if (filename) {
            if ((!filename.match(/^[a-zA-Z0-9]/) || filename.startsWith("00")) && !doc.uri.path.includes("renpy/common")) {
                const invalidRange = new Range(0, 0, doc.lineCount, 0);
                const range = doc.validateRange(invalidRange);
                const diagnostic = new Diagnostic(range, "Filenames must begin with a letter or number, but may not begin with '00' as Ren'Py uses such files for its own purposes.", severity);
                diagnostics.push(diagnostic);
            }
        }
    }

    // check Document text for errors and warnings
    const dataLoaded = NavigationData.data && NavigationData.data.location;

    // check for persistent variables that have not been defined/defaulted
    const persistents = [];
    if (dataLoaded) {
        const gameObjects = NavigationData.data.location["persistent"];
        for (const key in gameObjects) {
            persistents.push(key);
        }
    }

    let firstIndentation = 0;

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
        const line = NavigationData.filterStringLiterals(doc.lineAt(lineIndex).text);

        if (line.trim().length === 0) {
            continue;
        }

        // check for inconsistent spacing
        let matches;
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
                const indention = line.length - line.trimStart().length;
                if (indention > 0 && firstIndentation === 0) {
                    firstIndentation = indention;
                }

                if (indention > 0 && indention % firstIndentation !== 0) {
                    const range = new Range(lineIndex, 0, lineIndex, indention);
                    const diagnostic = new Diagnostic(
                        range,
                        `Inconsistent spacing detected (${indention} given, expected a multiple of ${firstIndentation}). Indentation must consist only of spaces in Ren'Py scripts. Each indentation level must consist of the same number of spaces. (4 spaces is strongly recommended.)`,
                        severity,
                    );
                    diagnostics.push(diagnostic);
                }
            }
        }

        if (config.warnOnInvalidVariableNames) {
            checkInvalidVariableNames(diagnostics, line, lineIndex);
        }

        if (config.warnOnReservedVariableNames) {
            checkReservedRenpyNames(diagnostics, line, lineIndex);
            checkReservedPythonNames(diagnostics, line, lineIndex);
        }

        checkComparisonVsAssignment(diagnostics, line, lineIndex);

        checkStrayDollarSigns(diagnostics, line, lineIndex);

        if (config.warnOnUndefinedStoreVariables) {
            checkStoreVariables(diagnostics, line, lineIndex);
        }

        if (config.warnOnObsoleteMethods) {
            checkObsoleteMethods(diagnostics, line, lineIndex);
        }

        if (config.warnOnUndefinedPersistents) {
            checkUndefinedPersistent(diagnostics, persistents, line, lineIndex);
        }
    }

    diagnosticCollection.set(doc.uri, diagnostics);
}

function refreshOpenDocuments(diagnosticCollection: DiagnosticCollection) {
    diagnosticCollection.clear();
    const tabInputTextUris = getAllOpenTabInputTextUri();
    tabInputTextUris.forEach(async (uri) => {
        await diagnoseFromUri(uri, diagnosticCollection);
    });
}

async function diagnoseFromUri(uri: Uri, diagnosticCollection: DiagnosticCollection) {
    try {
        const fileInfo = await workspace.fs.stat(uri);

        if (fileInfo.type === FileType.File) {
            workspace.openTextDocument(uri).then((document) => refreshDiagnostics(document, diagnosticCollection));
        }
    } catch (error) {
        logCatMessage(LogLevel.Error, LogCategory.Default, error as string);
    }
}

function onDeleteFromWorkspace(uri: Uri, diagnosticCollection: DiagnosticCollection) {
    diagnosticCollection.forEach((diagnosticUri) => {
        if (diagnosticUri.fsPath.startsWith(uri.fsPath)) {
            diagnosticCollection.delete(diagnosticUri);
        }
    });
}

function updateDiagnosticMode(context: ExtensionContext, diagnosticCollection: DiagnosticCollection): void {
    diagnosticModeEvents.forEach((e) => e.dispose());
    if (workspace.getConfiguration("renpy.diagnostics").get<string>("diagnosticMode") === "openFilesOnly") {
        context.subscriptions.push(window.onDidChangeVisibleTextEditors(() => refreshOpenDocuments(diagnosticCollection), undefined, diagnosticModeEvents));
        // There is no guarantee that this event fires when an editor tab is closed
        context.subscriptions.push(
            workspace.onDidCloseTextDocument(
                (doc) => {
                    if (diagnosticCollection.has(doc.uri)) {
                        diagnosticCollection.delete(doc.uri);
                    }
                },
                undefined,
                diagnosticModeEvents,
            ),
        );
        refreshOpenDocuments(diagnosticCollection);
    } else {
        const fsWatcher = workspace.createFileSystemWatcher("**/*");
        diagnosticModeEvents.push(fsWatcher);
        fsWatcher.onDidChange((uri) => diagnoseFromUri(uri, diagnosticCollection));
        fsWatcher.onDidCreate((uri) => diagnoseFromUri(uri, diagnosticCollection));
        fsWatcher.onDidDelete((uri) => onDeleteFromWorkspace(uri, diagnosticCollection));
        workspace.findFiles("**/*.rpy").then((uris) => uris.forEach((uri) => diagnoseFromUri(uri, diagnosticCollection)));
    }
}

function checkObsoleteMethods(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    let matches;
    while ((matches = rxObsoleteCheck.exec(line)) !== null) {
        const offset = matches.index + matches[0].indexOf(matches[1]);
        const range = new Range(lineIndex, offset, lineIndex, offset + matches[1].length);
        const diagnostic = new Diagnostic(range, `"${matches[1]}": This function is obsolete or outdated.`, DiagnosticSeverity.Warning);
        diagnostics.push(diagnostic);
    }
}

function checkComparisonVsAssignment(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    // check for equality/assignment errors
    let matches;
    while ((matches = rsComparisonCheck.exec(line)) !== null) {
        const offset = matches.index + matches[0].indexOf(matches[3]);
        const range = new Range(lineIndex, offset, lineIndex, offset + matches[3].length);
        const diagnostic = new Diagnostic(range, `"=" is the assignment operator. Use "==" for comparison.`, DiagnosticSeverity.Warning);
        diagnostics.push(diagnostic);
    }
}

function checkReservedRenpyNames(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    // check for default/define variables that are Ren'Py reserved names
    let matches;
    while ((matches = rxReservedVariableCheck.exec(line)) !== null) {
        const offset = matches.index + matches[0].indexOf(matches[2]);
        const range = new Range(lineIndex, offset, lineIndex, offset + matches[2].length);
        const diagnostic = new Diagnostic(range, `"${matches[2]}": Variables may not begin with a single underscore '_' as Ren'Py reserves such variables for its own purposes.`, DiagnosticSeverity.Warning);
        diagnostics.push(diagnostic);
    }
}

function checkReservedPythonNames(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    // check for default/define variables that are Python reserved names
    let matches;
    while ((matches = rxReservedPythonCheck.exec(line)) !== null) {
        const offset = matches.index + matches[0].indexOf(matches[2]);
        const range = new Range(lineIndex, offset, lineIndex, offset + matches[2].length);
        const diagnostic = new Diagnostic(range, `"${matches[2]}": is a Python reserved name, type, or function. Using it as a variable can lead to obscure problems or unpredictable behavior.`, DiagnosticSeverity.Warning);
        diagnostics.push(diagnostic);
    }
}

function checkStrayDollarSigns(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    // check for '$' character not at the beginning of the line
    if (line.trim().indexOf("$") >= 1) {
        const offset = line.indexOf("$");
        const range = new Range(lineIndex, offset, lineIndex, offset + 1);
        const diagnostic = new Diagnostic(range, `"$" starts a one-line Python statement, but was found in the middle of the line.`, DiagnosticSeverity.Warning);
        diagnostics.push(diagnostic);
    }
}

function checkInvalidVariableNames(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    // check line for invalid define/default variable names
    // Variables must begin with a letter or number, and may not begin with '_'
    let matches;
    while ((matches = rxVariableCheck.exec(line)) !== null) {
        if (!renpyStore.includes(matches[2])) {
            const offset = matches.index + matches[0].indexOf(matches[2]);
            const range = new Range(lineIndex, offset, lineIndex, offset + matches[2].length);
            const diagnostic = new Diagnostic(range, `"${matches[2]}": Variables must begin with a letter (and may contain numbers, letters, or underscores).`, DiagnosticSeverity.Error);
            diagnostics.push(diagnostic);
        }
    }
}

function checkStoreVariables(diagnostics: Diagnostic[], line: string, lineIndex: number) {
    // check store prefixed variables have been defaulted
    const defaults = NavigationData.gameObjects["define_types"];
    let classes = [];
    let callables = [];
    if (NavigationData.data && NavigationData.data.location) {
        classes = NavigationData.data.location["class"] || [];
        callables = NavigationData.data.location["callable"] || [];
    }

    if (defaults) {
        const filtered: string[] = Object.keys(defaults).filter((key: string) => defaults[key].define === "default");
        let matches;
        while ((matches = rxStoreCheck.exec(line)) !== null) {
            if (!matches[1].startsWith("_") && !filtered.includes(matches[1]) && !renpyStore.includes(matches[1]) && !classes[matches[1]] && !callables[matches[1]]) {
                const offset = matches.index + matches[0].indexOf(matches[1]);
                const range = new Range(lineIndex, offset, lineIndex, offset + matches[1].length);
                const diagnostic = new Diagnostic(range, `"store.${matches[1]}": Use of a store variable that has not been defaulted.`, DiagnosticSeverity.Warning);
                diagnostics.push(diagnostic);
            }
        }
    }
}

function checkUndefinedPersistent(diagnostics: Diagnostic[], persistents: string[], line: string, lineIndex: number) {
    let matches: RegExpExecArray | null;
    while ((matches = rxPersistentCheck.exec(line)) !== null) {
        if (line.match(rxPersistentDefines)) {
            if (!persistents.includes(matches[1])) {
                persistents.push(matches[1]);
                continue;
            }
        }
        if (!matches[1].startsWith("_") && !persistents.includes(matches[1])) {
            const offset = matches.index + matches[0].indexOf(matches[1]);
            const range = new Range(lineIndex, offset, lineIndex, offset + matches[1].length);
            const diagnostic = new Diagnostic(range, `"persistent.${matches[1]}": This persistent variable has not been defaulted or defined.`, DiagnosticSeverity.Warning);
            diagnostics.push(diagnostic);
        }
    }
}
