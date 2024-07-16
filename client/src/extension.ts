// Based on https://raw.githubusercontent.com/Microsoft/vscode/master/extensions/python/src/pythonMain.ts from Microsoft vscode
//
// Licensed under MIT License. See LICENSE in the project root for license information.

import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
    ExtensionContext,
    languages,
    commands,
    window,
    TextDocument,
    Position,
    debug,
    Range,
    workspace,
    Uri,
    DebugConfiguration,
    ProviderResult,
    DebugConfigurationProviderTriggerKind,
    tasks,
    LogLevel,
    ExtensionMode,
    Diagnostic,
    Command,
    CodeAction,
    CodeActionContext,
    NotebookCell,
} from "vscode";
import { DiagnosticPullMode, ErrorHandler, LanguageClient, LanguageClientOptions, RevealOutputChannelOn, ServerOptions, TransportKind } from "vscode-languageclient/node";

import { colorProvider } from "./color";
import { getStatusBarText, NavigationData } from "./navigation-data";
import { cleanUpPath, getAudioFolder, getImagesFolder, getNavigationJsonFilepath, getWorkspaceFolder, stripWorkspaceFromFile } from "./workspace";
import { diagnosticsInit } from "./diagnostics";
import { semanticTokensProvider } from "./semantics";
import { hoverProvider } from "./hover";
import { completionProvider } from "./completion";
import { definitionProvider } from "./definition";
import { symbolProvider } from "./outline";
import { referencesProvider } from "./references";
import { registerDebugDecorator, unregisterDebugDecorator } from "./tokenizer/debug-decorator";
import { Tokenizer } from "./tokenizer/tokenizer";
import { signatureProvider } from "./signature";
import { initializeLoggingSystems, logMessage, logToast, updateStatusBar } from "./logger";
import { Configuration } from "./configuration";
import { RenpyAdapterDescriptorFactory, RenpyConfigurationProvider } from "./debugger";
import { RenpyTaskProvider } from "./task-provider";
import { testParser } from "./parser/parser-test";

let extensionMode: ExtensionMode = null!;
let client: LanguageClient;

export function isShippingBuild(): boolean {
    return extensionMode !== ExtensionMode.Development;
}

export async function activate(context: ExtensionContext): Promise<void> {
    extensionMode = context.extensionMode;
    initializeLoggingSystems(context);
    updateStatusBar("$(sync~spin) Loading Ren'Py extension...");

    startServer(context);

    testParser();

    Configuration.initialize(context);

    // Subscribe to supported language features
    context.subscriptions.push(hoverProvider);
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(symbolProvider);
    context.subscriptions.push(signatureProvider);
    context.subscriptions.push(completionProvider);
    context.subscriptions.push(colorProvider);
    context.subscriptions.push(referencesProvider);
    context.subscriptions.push(semanticTokensProvider);

    // diagnostics (errors and warnings)
    const diagnostics = languages.createDiagnosticCollection("renpy");
    context.subscriptions.push(diagnostics);

    // A TextDocument was saved
    context.subscriptions.push(
        workspace.onDidSaveTextDocument((document) => {
            if (document.languageId !== "renpy") {
                return;
            }

            if (Configuration.isAutoSaveDisabled()) {
                // only trigger document refreshes if file autoSave is off
                return;
            }

            if (Configuration.compileOnDocumentSave()) {
                if (!NavigationData.isCompiling) {
                    ExecuteRenpyCompile();
                }
            }

            if (!NavigationData.isImporting) {
                updateStatusBar("$(sync~spin) Initializing Ren'Py static data...");
                try {
                    const uri = Uri.file(document.fileName);
                    const filename = stripWorkspaceFromFile(uri.path);
                    NavigationData.clearScannedDataForFile(filename);
                    NavigationData.scanDocumentForClasses(filename, document);
                    updateStatusBar(getStatusBarText());
                } catch (error) {
                    updateStatusBar("Failed to load Ren'Py static data...");
                    logMessage(LogLevel.Error, error as string);
                }
            }
        }),
    );

    // diagnostics (errors and warnings)
    diagnosticsInit(context);

    // custom command - refresh data
    const refreshCommand = commands.registerCommand("renpy.refreshNavigationData", async () => {
        updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
        try {
            await NavigationData.refresh(true);
        } catch (error) {
            logMessage(LogLevel.Error, error as string);
        } finally {
            updateStatusBar(getStatusBarText());
        }
    });
    context.subscriptions.push(refreshCommand);

    // custom command - jump to location
    const gotoFileLocationCommand = commands.registerCommand("renpy.jumpToFileLocation", (args) => {
        const uri = Uri.file(cleanUpPath(args.uri.path));
        const range = new Range(args.range[0].line, args.range[0].character, args.range[0].line, args.range[0].character);
        try {
            window.showTextDocument(uri, { selection: range });
        } catch (error) {
            logToast(LogLevel.Warning, `Could not jump to the location (error: ${error})`);
        }
    });
    context.subscriptions.push(gotoFileLocationCommand);

    const migrateOldFilesCommand = commands.registerCommand("renpy.migrateOldFiles", async () => {
        if (workspace !== null) {
            const altURIs = await workspace.findFiles("**/*.rpyc", null, 50);
            altURIs.forEach(async (uri) => {
                const sourceFile = Uri.parse(uri.toString().replace(".rpyc", ".rpy"));
                try {
                    await workspace.fs.stat(sourceFile);
                } catch (error) {
                    const endOfPath = uri.toString().replace("game", "old-game").lastIndexOf("/");
                    const properLocation = Uri.parse(uri.toString().replace("game", "old-game"));
                    const oldDataDirectory = Uri.parse(properLocation.toString().substring(0, endOfPath));
                    workspace.fs.createDirectory(oldDataDirectory);
                    workspace.fs
                        .readFile(uri)
                        .then((data) => workspace.fs.writeFile(properLocation, data))
                        .then(() => workspace.fs.delete(uri));
                }
            });
        }
    });
    context.subscriptions.push(migrateOldFilesCommand);

    // custom command - toggle token debug view
    let isShowingTokenDebugView = false;
    const toggleTokenDebugViewCommand = commands.registerCommand("renpy.toggleTokenDebugView", async () => {
        if (!isShowingTokenDebugView) {
            logToast(LogLevel.Info, "Enabled token debug view");
            Tokenizer.clearTokenCache();
            await registerDebugDecorator(context);
        } else {
            logToast(LogLevel.Info, "Disabled token debug view");
            unregisterDebugDecorator();
        }
        isShowingTokenDebugView = !isShowingTokenDebugView;
    });
    context.subscriptions.push(toggleTokenDebugViewCommand);

    // custom command - call renpy to run workspace
    const runCommand = commands.registerCommand("renpy.runCommand", () => {
        //EsLint recommends config be removed as it has already been declared in a previous scope
        const rpyPath = Configuration.getRenpyExecutablePath();

        if (!isValidExecutable(rpyPath)) {
            logToast(LogLevel.Error, "Ren'Py executable location not configured or is invalid.");
            return;
        }

        debug.startDebugging(
            undefined,
            {
                type: "renpy",
                name: "Run Project",
                request: "launch",
                program: rpyPath,
            },
            { noDebug: true },
        );

        //call renpy
        const result = RunWorkspaceFolder();
        if (result) {
            logToast(LogLevel.Info, "Ren'Py is running successfully");
        }
    });
    context.subscriptions.push(runCommand);

    // custom command - call renpy to compile
    const compileCommand = commands.registerCommand("renpy.compileNavigationData", () => {
        // check Settings has the path to Ren'Py executable
        // Call Ren'Py with the workspace folder and the json-dump argument
        const config = workspace.getConfiguration("renpy");
        if (!config) {
            logToast(LogLevel.Error, "Ren'Py executable location not configured or is invalid.");
        } else {
            if (isValidExecutable(config.renpyExecutableLocation)) {
                // call renpy
                const result = ExecuteRenpyCompile();
                if (result) {
                    logToast(LogLevel.Info, "Ren'Py compilation has completed.");
                }
            } else {
                logToast(LogLevel.Error, "Ren'Py executable location not configured or is invalid.");
            }
        }
    });
    context.subscriptions.push(compileCommand);

    const filepath = getNavigationJsonFilepath();
    const jsonFileExists = fs.existsSync(filepath);
    if (!jsonFileExists) {
        logMessage(LogLevel.Warning, "Navigation.json file is missing.");
    }

    // Detect file system change to the navigation.json file and trigger a refresh
    updateStatusBar("$(sync~spin) Initializing Ren'Py static data...");
    try {
        await NavigationData.init(context.extensionPath);
        updateStatusBar(getStatusBarText());
    } catch (error) {
        updateStatusBar("Failed to load Ren'Py static data...");
        logMessage(LogLevel.Error, error as string);
    }

    try {
        fs.watch(getNavigationJsonFilepath(), async (event, filename) => {
            if (!filename) {
                return;
            }

            logMessage(LogLevel.Debug, `${filename} changed`);
            updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
            try {
                await NavigationData.refresh();
            } catch (error) {
                logMessage(LogLevel.Error, `${Date()}: error refreshing NavigationData: ${error}`);
            } finally {
                updateStatusBar(getStatusBarText());
            }
        });
    } catch (error) {
        logMessage(LogLevel.Error, `Watch navigation.json file error: ${error}`);
    }

    if (Configuration.shouldWatchFoldersForChanges()) {
        logMessage(LogLevel.Info, "Starting Watcher for images folder.");
        try {
            fs.watch(getImagesFolder(), { recursive: true }, async (event, filename) => {
                if (filename && event === "rename") {
                    logMessage(LogLevel.Debug, `${filename} created/deleted`);
                    await NavigationData.scanForImages();
                }
            });
        } catch (error) {
            logMessage(LogLevel.Error, `Watch image folder error: ${error}`);
        }

        logMessage(LogLevel.Info, "Starting Watcher for audio folder.");
        try {
            fs.watch(getAudioFolder(), { recursive: true }, async (event, filename) => {
                if (filename && event === "rename") {
                    logMessage(LogLevel.Debug, `${filename} created/deleted`);
                    await NavigationData.scanForAudio();
                }
            });
        } catch (error) {
            logMessage(LogLevel.Error, `Watch audio folder error: ${error}`);
        }
    }

    const factory = new RenpyAdapterDescriptorFactory();
    context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory("renpy", factory));
    const provider = new RenpyConfigurationProvider();
    context.subscriptions.push(debug.registerDebugConfigurationProvider("renpy", provider));
    context.subscriptions.push(
        debug.registerDebugConfigurationProvider(
            "renpy",
            {
                provideDebugConfigurations(): ProviderResult<DebugConfiguration[]> {
                    return [
                        {
                            type: "renpy",
                            request: "launch",
                            name: "Ren'Py: Launch",
                            command: "run",
                            args: [],
                        },
                    ];
                },
            },
            DebugConfigurationProviderTriggerKind.Dynamic,
        ),
    );

    const taskProvider = new RenpyTaskProvider();
    context.subscriptions.push(tasks.registerTaskProvider("renpy", taskProvider));

    logMessage(LogLevel.Info, "Ren'Py extension activated!");
}

export function deactivate(): Thenable<void> | undefined {
    logMessage(LogLevel.Info, "Ren'Py extension deactivating");
    fs.unwatchFile(getNavigationJsonFilepath());

    return stopServer();
}

export function getKeywordPrefix(document: TextDocument, position: Position, range: Range): string | undefined {
    if (range.start.character <= 0) {
        return;
    }
    const rangeBefore = new Range(new Position(range.start.line, range.start.character - 1), new Position(range.end.line, range.start.character));
    const spaceBefore = document.getText(rangeBefore);
    if (spaceBefore === ".") {
        const prevPosition = new Position(position.line, range.start.character - 1);
        const prevRange = document.getWordRangeAtPosition(prevPosition);
        if (prevRange) {
            const prevWord = document.getText(prevRange);
            if (prevWord === "music" || prevWord === "sound") {
                // check for renpy.music.* or renpy.sound.*
                const newPrefix = getKeywordPrefix(document, prevPosition, prevRange);
                if (newPrefix === "renpy") {
                    return `${newPrefix}.${prevWord}`;
                }
            }
            if (prevWord !== "store") {
                return prevWord;
            }
        }
    }
    return;
}

export function isValidExecutable(renpyExecutableLocation: string): boolean {
    if (!renpyExecutableLocation || renpyExecutableLocation === "") {
        return false;
    }
    return fs.existsSync(renpyExecutableLocation);
}

function startServer(context: ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc },
    };

    const defaultErrorHandler: ErrorHandler = client.createDefaultErrorHandler();
    let serverCalledProcessExit: boolean = false;
    // see https://github.com/microsoft/vscode-eslint/blob/edc9685bcda26462dc52decce213167af8d2b25d/client/src/client.ts#L87

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for renpy documents
        documentSelector: [{ scheme: "file", language: "renpy" }],
        revealOutputChannelOn: RevealOutputChannelOn.Debug,
        initializationOptions: {},
        progressOnInitialization: true,
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher("**/package.json"),
        },
        initializationFailedHandler: (error) => {
            client.error("Server initialization failed.", error);
            client.outputChannel.show(true);
            return false;
        },
        errorHandler: {
            error: (error, message, count) => {
                return defaultErrorHandler.error(error, message, count);
            },
            closed: () => {
                if (serverCalledProcessExit) {
                    return { action: CloseAction.DoNotRestart };
                }
                return defaultErrorHandler.closed();
            },
        },
        diagnosticPullOptions: {
            onChange: true,
            onSave: true,
            filter: (document, mode) => {
                const config = workspace.getConfiguration("eslint", document);
                const run = config.get<RunValues>("run", "onType");
                if (mode === DiagnosticPullMode.onType && run !== "onType") {
                    return true;
                } else if (mode === DiagnosticPullMode.onSave && run !== "onSave") {
                    return true;
                }
                return validator.check(document) === Validate.off;
            },
            onTabs: false,
        },
        middleware: {
            didOpen: async (document, next) => {
                if (languages.match(packageJsonFilter, document) || languages.match(configFileFilter, document) || validator.check(document) !== Validate.off) {
                    const result = next(document);
                    syncedDocuments.set(document.uri.toString(), document);

                    return result;
                }
            },
            didChange: async (event, next) => {
                if (syncedDocuments.has(event.document.uri.toString())) {
                    return next(event);
                }
            },
            willSave: async (event, next) => {
                if (syncedDocuments.has(event.document.uri.toString())) {
                    return next(event);
                }
            },
            willSaveWaitUntil: (event, next) => {
                if (syncedDocuments.has(event.document.uri.toString())) {
                    return next(event);
                } else {
                    return Promise.resolve([]);
                }
            },
            didSave: async (document, next) => {
                if (syncedDocuments.has(document.uri.toString())) {
                    return next(document);
                }
            },
            didClose: async (document, next) => {
                const uri = document.uri.toString();
                if (syncedDocuments.has(uri)) {
                    syncedDocuments.delete(uri);
                    return next(document);
                }
            },
            notebooks: {
                didOpen: (notebookDocument, cells, next) => {
                    const result = next(notebookDocument, cells);
                    for (const cell of cells) {
                        syncedDocuments.set(cell.document.uri.toString(), cell.document);
                    }
                    return result;
                },
                didChange: (event, next) => {
                    if (event.cells?.structure?.didOpen !== undefined) {
                        for (const open of event.cells.structure.didOpen) {
                            syncedDocuments.set(open.document.uri.toString(), open.document);
                        }
                    }
                    if (event.cells?.structure?.didClose !== undefined) {
                        for (const closed of event.cells.structure.didClose) {
                            syncedDocuments.delete(closed.document.uri.toString());
                        }
                    }
                    return next(event);
                },
                didClose: (document, cells, next) => {
                    for (const cell of cells) {
                        const key = cell.document.uri.toString();
                        syncedDocuments.delete(key);
                    }
                    return next(document, cells);
                },
            },
            provideCodeActions: async (document, range, context, token, next): Promise<(Command | CodeAction)[] | null | undefined> => {
                if (!syncedDocuments.has(document.uri.toString())) {
                    return [];
                }
                if (context.only !== undefined && !supportedQuickFixKinds.has(context.only.value)) {
                    return [];
                }
                if (context.only === undefined && (!context.diagnostics || context.diagnostics.length === 0)) {
                    return [];
                }
                const eslintDiagnostics: Diagnostic[] = [];
                for (const diagnostic of context.diagnostics) {
                    if (diagnostic.source === "eslint") {
                        eslintDiagnostics.push(diagnostic);
                    }
                }
                if (context.only === undefined && eslintDiagnostics.length === 0) {
                    return [];
                }
                const newContext: CodeActionContext = Object.assign({}, context, { diagnostics: eslintDiagnostics });
                const start = Date.now();
                const result = await next(document, range, newContext, token);
                if (context.only?.value.startsWith("source.fixAll")) {
                    let performanceInfo = performanceStatus.get(document.languageId);
                    if (performanceInfo === undefined) {
                        performanceInfo = PerformanceStatus.defaultValue;
                        performanceStatus.set(document.languageId, performanceInfo);
                    } else {
                        performanceInfo.firstReport = false;
                    }
                    performanceInfo.fixTime = Date.now() - start;
                    updateStatusBar(document);
                }
                return result;
            },
            workspace: {
                didChangeWatchedFile: (event, next) => {
                    validator.clear();
                    return next(event);
                },
                didChangeConfiguration: async (sections, next) => {
                    if (migration !== undefined && (sections === undefined || sections.length === 0)) {
                        migration.captureDidChangeSetting(() => {
                            return next(sections);
                        });
                    } else {
                        return next(sections);
                    }
                },
                configuration: (params) => {
                    return readConfiguration(params);
                },
            },
        },
        notebookDocumentOptions: {
            filterCells: (_notebookDocument, cells) => {
                const result: NotebookCell[] = [];
                for (const cell of cells) {
                    const document = cell.document;
                    if (Languages.match(packageJsonFilter, document) || Languages.match(configFileFilter, document) || validator.check(document) !== Validate.off) {
                        result.push(cell);
                    }
                }
                return result;
            },
        },
    };

    // Create the language client and start the client.
    client = new LanguageClient("languageServerExample", "Language Server Example", serverOptions, clientOptions);

    // Start the client. This will also launch the server
    client.start();
}

function stopServer(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

// Attempts to run renpy executable through console commands.
function RunWorkspaceFolder(): boolean {
    const rpyPath = Configuration.getRenpyExecutablePath();

    if (isValidExecutable(rpyPath)) {
        const renpyPath = cleanUpPath(Uri.file(rpyPath).path);
        const cwd = renpyPath.substring(0, renpyPath.lastIndexOf("/"));
        const workFolder = getWorkspaceFolder();
        const args: string[] = [`${workFolder}`, "run"];
        if (workFolder.endsWith("/game")) {
            try {
                updateStatusBar("$(sync~spin) Running Ren'Py...");
                const result = cp.spawnSync(rpyPath, args, {
                    cwd: `${cwd}`,
                    env: { PATH: process.env.PATH },
                });
                if (result.error) {
                    logMessage(LogLevel.Error, `renpy spawn error: ${result.error}`);
                    return false;
                }
                if (result.stderr && result.stderr.length > 0) {
                    logMessage(LogLevel.Error, `renpy spawn stderr: ${result.stderr}`);
                    return false;
                }
            } catch (error) {
                logMessage(LogLevel.Error, `renpy spawn error: ${error}`);
                return false;
            } finally {
                updateStatusBar(getStatusBarText());
            }
            return true;
        }
        return false;
    } else {
        logMessage(LogLevel.Warning, "config for renpy does not exist");
        return false;
    }
}

function ExecuteRenpyCompile(): boolean {
    const rpyPath = Configuration.getRenpyExecutablePath();
    if (isValidExecutable(rpyPath)) {
        const renpyPath = cleanUpPath(Uri.file(rpyPath).path);
        const cwd = renpyPath.substring(0, renpyPath.lastIndexOf("/"));

        let wf = getWorkspaceFolder();
        if (wf.endsWith("/game")) {
            wf = wf.substring(0, wf.length - 5);
        }
        const navData = getNavigationJsonFilepath();
        //const args = `${wf} compile --json-dump ${navData}`;
        const args: string[] = [`${wf}`, "compile", "--json-dump", `${navData}`];
        try {
            NavigationData.isCompiling = true;
            updateStatusBar("$(sync~spin) Compiling Ren'Py navigation data...");
            const result = cp.spawnSync(rpyPath, args, {
                cwd: `${cwd}`,
                env: { PATH: process.env.PATH },
                encoding: "utf-8",
                windowsHide: true,
            });
            if (result.error) {
                logMessage(LogLevel.Error, `renpy spawn error: ${result.error}`);
                return false;
            }
            if (result.stderr && result.stderr.length > 0) {
                logMessage(LogLevel.Error, `renpy spawn stderr: ${result.stderr}`);
                return false;
            }
        } catch (error) {
            logMessage(LogLevel.Error, `renpy spawn error: ${error}`);
            return false;
        } finally {
            NavigationData.isCompiling = false;
            updateStatusBar(getStatusBarText());
        }
        return true;
    }
    return false;
}
