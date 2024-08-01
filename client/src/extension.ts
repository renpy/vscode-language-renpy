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
    LanguageStatusItem,
    LanguageStatusSeverity,
} from "vscode";
import {
    CloseAction,
    DiagnosticPullMode,
    DidCloseTextDocumentNotification,
    DidOpenTextDocumentNotification,
    DocumentFilter,
    ErrorHandler,
    ExecuteCommandParams,
    ExecuteCommandRequest,
    LanguageClient,
    LanguageClientOptions,
    RevealOutputChannelOn,
    ServerOptions,
    State,
    TransportKind,
    VersionedTextDocumentIdentifier,
} from "vscode-languageclient/node";

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
import { ExitCalled, ShowOutputChannel, Status, StatusNotification, StatusParams } from "./customMessages";

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

export namespace Is {
    const toString = Object.prototype.toString;

    export function boolean(value: unknown): value is boolean {
        return value === true || value === false;
    }

    export function string(value: unknown): value is string {
        return typeof value === "string";
    }

    export function objectLiteral(value: unknown): value is object {
        return value !== null && value !== undefined && !Array.isArray(value) && typeof value === "object";
    }
}

export enum Validate {
    on = "on",
    off = "off",
    probe = "probe",
}

export type ValidateItem = {
    language: string;
    autoFix?: boolean;
};
export namespace ValidateItem {
    export function is(item: unknown): item is ValidateItem {
        const candidate = item as ValidateItem;
        return candidate && Is.string(candidate.language) && (Is.boolean(candidate.autoFix) || candidate.autoFix === void 0);
    }
}

export class Validator {
    private readonly probeFailed: Set<string> = new Set();

    public clear(): void {
        this.probeFailed.clear();
    }

    public add(uri: Uri): void {
        this.probeFailed.add(uri.toString());
    }

    public check(textDocument: TextDocument): Validate {
        const config = workspace.getConfiguration("renpy", textDocument.uri);

        if (!config.get<boolean>("enable", true)) {
            return Validate.off;
        }

        if (textDocument.uri.scheme === "untitled" && config.get<boolean>("ignoreUntitled", false)) {
            return Validate.off;
        }

        const languageId = textDocument.languageId;
        const validate = config.get<(ValidateItem | string)[] | null>("validate", null);
        if (Array.isArray(validate)) {
            for (const item of validate) {
                if (Is.string(item) && item === languageId) {
                    return Validate.on;
                } else if (ValidateItem.is(item) && item.language === languageId) {
                    return Validate.on;
                }
            }
            return Validate.off;
        }

        if (this.probeFailed.has(textDocument.uri.toString())) {
            return Validate.off;
        }

        const probe: string[] | undefined = config.get<string[]>("probe");
        if (Array.isArray(probe)) {
            for (const item of probe) {
                if (item === languageId) {
                    return Validate.probe;
                }
            }
        }

        return Validate.off;
    }
}

interface TimeBudget {
    warn: number;
    error: number;
}

type PerformanceStatus = {
    firstReport: boolean;
    validationTime: number;
    fixTime: number;
    reported: number;
    acknowledged: boolean;
};

namespace PerformanceStatus {
    export const defaultValue: PerformanceStatus = { firstReport: true, validationTime: 0, fixTime: 0, reported: 0, acknowledged: false };
}

const validator: Validator = new Validator();

function startServer(context: ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

    // A map of documents synced to the server
    const syncedDocuments: Map<string, TextDocument> = new Map();

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc },
    };

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
                /*const config = workspace.getConfiguration("renpy", document);
                const run = config.get<RunValues>("run", "onType");
                if (mode === DiagnosticPullMode.onType && run !== "onType") {
                    return true;
                } else if (mode === DiagnosticPullMode.onSave && run !== "onSave") {
                    return true;
                }
                return validator.check(document) === Validate.off;*/

                return false;
            },
            onTabs: false,
        },

        middleware: {
            didOpen: async (document, next) => {
                if (languages.match("renpy", document) || validator.check(document) !== Validate.off) {
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
                /*if (context.only !== undefined && !supportedQuickFixKinds.has(context.only.value)) {
                    return [];
                }*/
                if (context.only === undefined && (!context.diagnostics || context.diagnostics.length === 0)) {
                    return [];
                }
                const renpyDiagnostics: Diagnostic[] = [];
                for (const diagnostic of context.diagnostics) {
                    if (diagnostic.source === "renpy") {
                        renpyDiagnostics.push(diagnostic);
                    }
                }
                if (context.only === undefined && renpyDiagnostics.length === 0) {
                    return [];
                }
                const newContext: CodeActionContext = Object.assign({}, context, { diagnostics: renpyDiagnostics });
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
                    /*if (migration !== undefined && (sections === undefined || sections.length === 0)) {
                        migration.captureDidChangeSetting(() => {
                            return next(sections);
                        });
                    } else {*/
                    return next(sections);
                    //}
                },

                /*configuration: (params) => {
                    return readConfiguration(params);
                },*/
            },
        },

        notebookDocumentOptions: {
            filterCells: (_notebookDocument, cells) => {
                const result: NotebookCell[] = [];
                for (const cell of cells) {
                    const document = cell.document;
                    if (languages.match("renpy", document) || validator.check(document) !== Validate.off) {
                        result.push(cell);
                    }
                }
                return result;
            },
        },
    };

    // Create the language client and start the client.
    client = new LanguageClient("languageServerExample", "Language Server Example", serverOptions, clientOptions);

    const defaultErrorHandler: ErrorHandler = client.createDefaultErrorHandler();
    let serverCalledProcessExit: boolean = false;
    // see https://github.com/microsoft/vscode-eslint/blob/edc9685bcda26462dc52decce213167af8d2b25d/client/src/client.ts#L87

    // The client's status bar item.
    const languageStatus: LanguageStatusItem = languages.createLanguageStatusItem("renpy.languageStatusItem", []);
    let serverRunning: boolean | undefined;

    const starting = "Ren'Py server is starting.";
    const running = "Ren'Py server is running.";
    const stopped = "Ren'Py server stopped.";
    languageStatus.name = "Renpy";
    languageStatus.text = "Renpy";
    languageStatus.command = { title: "Open ESLint Output", command: "renpy.showOutputChannel" };

    type StatusInfo = Omit<Omit<StatusParams, "uri">, "validationTime"> & object;
    const documentStatus: Map<string, StatusInfo> = new Map();
    const performanceStatus: Map<string, PerformanceStatus> = new Map();

    // If the workspace configuration changes we need to update the synced documents since the
    // list of probe language type can change.
    context.subscriptions.push(
        workspace.onDidChangeConfiguration(() => {
            validator.clear();
            for (const textDocument of syncedDocuments.values()) {
                if (validator.check(textDocument) === Validate.off) {
                    const provider = client.getFeature(DidCloseTextDocumentNotification.method).getProvider(textDocument);
                    provider?.send(textDocument).catch((error) => client.error(`Sending close notification failed.`, error));
                }
            }
            for (const textDocument of workspace.textDocuments) {
                if (!syncedDocuments.has(textDocument.uri.toString()) && validator.check(textDocument) !== Validate.off) {
                    const provider = client.getFeature(DidOpenTextDocumentNotification.method).getProvider(textDocument);
                    provider?.send(textDocument).catch((error) => client.error(`Sending open notification failed.`, error));
                }
            }
        }),
    );

    client.onNotification(ShowOutputChannel.type, () => {
        client.outputChannel.show();
    });

    client.onNotification(StatusNotification.type, (params) => {
        updateDocumentStatus(params);
    });

    client.onNotification(ExitCalled.type, (params) => {
        serverCalledProcessExit = true;
        client.error(`Server process exited with code ${params[0]}. This usually indicates a misconfigured ESLint setup.`, params[1]);

        void window.showErrorMessage(`ESLint server shut down itself. See 'ESLint' output channel for details.`, { title: "Open Output", id: 1 }).then((value) => {
            if (value !== undefined && value.id === 1) {
                client.outputChannel.show();
            }
        });
    });

    client.onDidChangeState((event) => {
        if (event.newState === State.Starting) {
            client.info(starting);
            serverRunning = undefined;
        } else if (event.newState === State.Running) {
            client.info(running);
            serverRunning = true;
        } else {
            client.info(stopped);
            serverRunning = false;
        }
        updateStatusBar(undefined);
    });

    context.subscriptions.push(
        window.onDidChangeActiveTextEditor(() => {
            updateStatusBar(undefined);
        }),

        workspace.onDidCloseTextDocument((document) => {
            const uri = document.uri.toString();
            documentStatus.delete(uri);
            updateLanguageStatusSelector();
            updateStatusBar(undefined);
        }),

        commands.registerCommand("renpy.executeAutofix", async () => {
            const textEditor = window.activeTextEditor;
            if (!textEditor) {
                return;
            }
            const textDocument: VersionedTextDocumentIdentifier = {
                uri: textEditor.document.uri.toString(),
                version: textEditor.document.version,
            };
            const params: ExecuteCommandParams = {
                command: "renpy.applyAllFixes",
                arguments: [textDocument],
            };
            await client.start();
            client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, () => {
                void window.showErrorMessage("Failed to apply ESLint fixes to the document. Please consider opening an issue with steps to reproduce.");
            });
        }),
    );

    // Start the client. This will also launch the server
    client.start();

    function updateDocumentStatus(params: StatusParams): void {
        const needsSelectorUpdate = !documentStatus.has(params.uri);
        documentStatus.set(params.uri, { state: params.state });
        if (needsSelectorUpdate) {
            updateLanguageStatusSelector();
        }
        const textDocument = syncedDocuments.get(params.uri);
        if (textDocument !== undefined) {
            let performanceInfo = performanceStatus.get(textDocument.languageId);
            if (performanceInfo === undefined) {
                performanceInfo = PerformanceStatus.defaultValue;
                performanceStatus.set(textDocument.languageId, performanceInfo);
            } else {
                performanceInfo.firstReport = false;
            }
            performanceInfo.validationTime = params.validationTime ?? 0;
        }
        updateStatusBar(textDocument);
    }

    function updateLanguageStatusSelector(): void {
        const selector: DocumentFilter[] = [];
        for (const key of documentStatus.keys()) {
            const uri: Uri = Uri.parse(key);
            const document = syncedDocuments.get(key);
            const filter: DocumentFilter = {
                scheme: uri.scheme,
                pattern: uri.fsPath,
                language: document?.languageId ?? "",
            };
            selector.push(filter);
        }
        languageStatus.selector = selector;
    }

    function acknowledgePerformanceStatus(): void {
        const activeTextDocument = window.activeTextEditor?.document;
        if (activeTextDocument === undefined) {
            return;
        }
        const performanceInfo = performanceStatus.get(activeTextDocument.languageId);
        if (performanceInfo === undefined || performanceInfo.reported === 0) {
            return;
        }
        performanceInfo.acknowledged = true;
        updateStatusBar(activeTextDocument);
    }

    function updateStatusBar(textDocument: TextDocument | undefined) {
        const activeTextDocument = textDocument ?? window.activeTextEditor?.document;
        if (activeTextDocument === undefined || serverRunning === false) {
            return;
        }
        const performanceInfo = performanceStatus.get(activeTextDocument.languageId);
        const statusInfo = documentStatus.get(activeTextDocument.uri.toString()) ?? { state: Status.ok };

        let validationBudget = workspace.getConfiguration("renpy", activeTextDocument).get<TimeBudget>("timeBudget.onValidation", { warn: 4000, error: 8000 });
        if (validationBudget.warn < 0 || validationBudget.error < 0) {
            validationBudget = {
                warn: validationBudget.warn < 0 ? Number.MAX_VALUE : validationBudget.warn,
                error: validationBudget.error < 0 ? Number.MAX_VALUE : validationBudget.error,
            };
        }
        let fixesBudget = workspace.getConfiguration("renpy", activeTextDocument).get<TimeBudget>("timeBudget.onFixes", { warn: 3000, error: 6000 });
        if (fixesBudget.warn < 0 || fixesBudget.error < 0) {
            fixesBudget = {
                warn: fixesBudget.warn < 0 ? Number.MAX_VALUE : fixesBudget.warn,
                error: fixesBudget.error < 0 ? Number.MAX_VALUE : fixesBudget.error,
            };
        }

        let severity: LanguageStatusSeverity = LanguageStatusSeverity.Information;
        const [timeTaken, detail, message, timeBudget] = (function (): [number, string | undefined, string, TimeBudget] {
            if (performanceInfo === undefined || performanceInfo.firstReport || performanceInfo.acknowledged) {
                return [-1, undefined, "", { warn: 0, error: 0 }];
            }
            if (performanceInfo.fixTime > performanceInfo.validationTime) {
                const timeTaken = Math.max(performanceInfo.fixTime, performanceInfo.reported);
                return [
                    timeTaken,
                    timeTaken > fixesBudget.warn ? `Computing fixes took ${timeTaken}ms` : undefined,
                    `Computing fixes during save for file ${activeTextDocument.uri.toString()} during save took ${timeTaken}ms. Please check the ESLint rules for performance issues.`,
                    fixesBudget,
                ];
            } else if (performanceInfo.validationTime > 0) {
                const timeTaken = Math.max(performanceInfo.validationTime, performanceInfo.reported);
                return [
                    timeTaken,
                    timeTaken > validationBudget.warn ? `Validation took ${timeTaken}ms` : undefined,
                    `Linting file ${activeTextDocument.uri.toString()} took ${timeTaken}ms. Please check the ESLint rules for performance issues.`,
                    validationBudget,
                ];
            }
            return [-1, undefined, "", { warn: 0, error: 0 }];
        })();

        switch (statusInfo.state) {
            case Status.ok:
                break;
            case Status.warn:
                severity = LanguageStatusSeverity.Warning;
                break;
            case Status.error:
                severity = LanguageStatusSeverity.Error;
                break;
        }
        if (severity === LanguageStatusSeverity.Information && timeTaken > timeBudget.warn) {
            severity = LanguageStatusSeverity.Warning;
        }
        if (severity === LanguageStatusSeverity.Warning && timeTaken > timeBudget.error) {
            severity = LanguageStatusSeverity.Error;
        }
        if (timeTaken > timeBudget.warn && performanceInfo !== undefined) {
            if (timeTaken > performanceInfo.reported) {
                if (timeTaken > timeBudget.error) {
                    client.error(message);
                } else {
                    client.warn(message);
                }
            }
        }

        if (detail !== undefined && languageStatus.detail !== detail) {
            languageStatus.detail = detail;
        }
        if (languageStatus.severity !== severity) {
            languageStatus.severity = severity;
        }
        if (performanceInfo !== undefined) {
            performanceInfo.reported = Math.max(performanceInfo.reported, timeTaken);
        }
    }
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
