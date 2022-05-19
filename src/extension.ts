// Based on https://raw.githubusercontent.com/Microsoft/vscode/master/extensions/python/src/pythonMain.ts from Microsoft vscode
//
// Licensed under MIT License. See LICENSE in the project root for license information.
"use strict";

import {
    ExtensionContext,
    languages,
    commands,
    window,
    TextDocument,
    Position,
    CancellationToken,
    ProviderResult,
    HoverProvider,
    Hover,
    DefinitionProvider,
    Range,
    Location,
    Uri,
    workspace,
    CompletionContext,
    CompletionItemProvider,
    CompletionItem,
    DocumentSymbol,
    DocumentSymbolProvider,
    DocumentColorProvider,
    ColorInformation,
    ColorPresentation,
    Color,
    Definition,
    StatusBarItem,
    StatusBarAlignment,
    ConfigurationTarget,
    SignatureHelpProvider,
    SignatureHelp,
    SignatureHelpContext,
    ReferenceContext,
    ReferenceProvider,
    DocumentSemanticTokensProvider,
    SemanticTokens,
    SemanticTokensLegend,
} from "vscode";
import { getColorInformation, getColorPresentations } from "./color";
import { getStatusBarText, NavigationData } from "./navigation-data";
import { cleanUpPath, getAudioFolder, getImagesFolder, getNavigationJsonFilepath, getWorkspaceFolder, stripWorkspaceFromFile } from "./workspace";
import { refreshDiagnostics, subscribeToDocumentChanges } from "./diagnostics";
import { getSemanticTokens } from "./semantics";
import { getHover } from "./hover";
import { getCompletionList } from "./completion";
import { getDefinition } from "./definition";
import { getDocumentSymbols } from "./outline";
import { getSignatureHelp } from "./signature";
import { findAllReferences } from "./references";
import * as fs from "fs";
import * as cp from "child_process";

let myStatusBarItem: StatusBarItem;

export async function activate(context: ExtensionContext): Promise<void> {
    console.log("Ren'Py extension activated");

    const filepath = getNavigationJsonFilepath();
    const jsonFileExists = fs.existsSync(filepath);
    if (!jsonFileExists) {
        console.log("Navigation.json file is missing.");
    }

    // TODO: Auto create tokens for colors used in the files (requires updates to the token parser)
    const rules = [
        { scope: "renpy.meta.plain", settings: { fontStyle: "" } },
        { scope: "renpy.meta.i", settings: { fontStyle: "italic" } },
        { scope: "renpy.meta.b", settings: { fontStyle: "bold" } },
        { scope: ["renpy.meta.u", "renpy.meta.a"], settings: { fontStyle: "underline" } },
        { scope: "renpy.meta.s", settings: { fontStyle: "strikethrough" } },

        { scope: "renpy.meta.i renpy.meta.b", settings: { fontStyle: "italic bold" } },
        { scope: "renpy.meta.i renpy.meta.u", settings: { fontStyle: "italic underline" } },
        { scope: "renpy.meta.i renpy.meta.s", settings: { fontStyle: "italic strikethrough" } },
        { scope: "renpy.meta.b renpy.meta.u", settings: { fontStyle: "bold underline" } },
        { scope: "renpy.meta.b renpy.meta.s", settings: { fontStyle: "bold strikethrough" } },
        { scope: "renpy.meta.u renpy.meta.s", settings: { fontStyle: "underline strikethrough" } },

        { scope: "renpy.meta.i renpy.meta.b renpy.meta.u", settings: { fontStyle: "italic bold underline" } },
        { scope: "renpy.meta.i renpy.meta.b renpy.meta.s", settings: { fontStyle: "italic bold strikethrough" } },
        { scope: "renpy.meta.i renpy.meta.u renpy.meta.s", settings: { fontStyle: "italic underline strikethrough" } },
        { scope: "renpy.meta.b renpy.meta.u renpy.meta.s", settings: { fontStyle: "bold underline strikethrough" } },

        { scope: "renpy.meta.i renpy.meta.b renpy.meta.u  renpy.meta.s", settings: { fontStyle: "italic bold underline strikethrough" } },

        { scope: "renpy.meta.color.text", settings: { foreground: "#ffffff" } },
        { scope: "renpy.meta.color.#000000", settings: { foreground: "#000000" } },
        { scope: "renpy.meta.color.#ffffff", settings: { foreground: "#ffffff" } },
        { scope: "renpy.meta.color.#f00", settings: { foreground: "#f00" } },
        { scope: "renpy.meta.color.#FF0000", settings: { foreground: "#FF0000" } },
        { scope: "renpy.meta.color.#0f0", settings: { foreground: "#0f0" } },
        { scope: "renpy.meta.color.#0ff", settings: { foreground: "#0ff" } },
        { scope: "renpy.meta.color.#333", settings: { foreground: "#333" } },
        { scope: "renpy.meta.color.#888", settings: { foreground: "#888" } },
        { scope: "renpy.meta.color.#ccc", settings: { foreground: "#ccc" } },
    ];

    const tokensConfig = workspace.getConfiguration("editor");
    const customTokens = tokensConfig["tokenColorCustomizations"]["textMateRules"];
    if (customTokens === undefined) {
        tokensConfig.update("tokenColorCustomizations", { textMateRules: rules }, ConfigurationTarget.Workspace);
    } else {
        //TODO: Only replace rules that have changed and append rules instead of replacing the entire array
        tokensConfig.update("tokenColorCustomizations", { textMateRules: rules }, ConfigurationTarget.Workspace).then(
            () => {
                console.log("Successfully updated the tokenColorCustomizations config");
            },
            (reason) => {
                console.error("Failed to update the tokenColorCustomizations config! : " + reason);
            }
        );
    }

    // hide rpyc files if the setting is enabled
    const config = workspace.getConfiguration("renpy");
    if (config && config.excludeRpycFilesFromWorkspace) {
        hideRpycFilesFromWorkspace();
    }

    // hover provider for code tooltip
    const hoverProvider = languages.registerHoverProvider(
        "renpy",
        new (class implements HoverProvider {
            async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null | undefined> {
                return getHover(document, position);
            }
        })()
    );
    context.subscriptions.push(hoverProvider);

    // provider for Go To Definition
    const definitionProvider = languages.registerDefinitionProvider(
        "renpy",
        new (class implements DefinitionProvider {
            provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition> {
                return getDefinition(document, position);
            }
        })()
    );
    context.subscriptions.push(definitionProvider);

    // provider for Outline view
    const symbolProvider = languages.registerDocumentSymbolProvider(
        "renpy",
        new (class implements DocumentSymbolProvider {
            provideDocumentSymbols(document: TextDocument, token: CancellationToken): ProviderResult<DocumentSymbol[]> {
                return getDocumentSymbols(document);
            }
        })()
    );
    context.subscriptions.push(symbolProvider);

    // provider for Method Signature Help
    const signatureProvider = languages.registerSignatureHelpProvider(
        "renpy",
        new (class implements SignatureHelpProvider {
            provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelp> {
                return getSignatureHelp(document, position, context);
            }
        })(),
        "(",
        ",",
        "="
    );
    context.subscriptions.push(signatureProvider);

    // Completion provider
    const completionProvider = languages.registerCompletionItemProvider(
        "renpy",
        new (class implements CompletionItemProvider {
            provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[]> {
                return getCompletionList(document, position, context);
            }
        })(),
        ".",
        " ",
        "@",
        "-",
        "("
    );
    context.subscriptions.push(completionProvider);

    // Color Provider
    const colorProvider = languages.registerColorProvider(
        "renpy",
        new (class implements DocumentColorProvider {
            provideDocumentColors(document: TextDocument, token: CancellationToken): ProviderResult<ColorInformation[]> {
                return getColorInformation(document);
            }
            provideColorPresentations(color: Color, context: { document: TextDocument; range: Range }, token: CancellationToken): ProviderResult<ColorPresentation[]> {
                return getColorPresentations(color, context.document, context.range);
            }
        })()
    );
    context.subscriptions.push(colorProvider);

    // Find All References provider
    const references = languages.registerReferenceProvider(
        "renpy",
        new (class implements ReferenceProvider {
            async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | null | undefined> {
                return await findAllReferences(document, position, context);
            }
        })()
    );
    context.subscriptions.push(references);

    const tokenTypes = ["class", "parameter", "variable", "keyword"];
    const tokenModifiers = ["declaration", "defaultLibrary"];
    const legend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

    // Semantic Token Provider
    const semanticTokens = languages.registerDocumentSemanticTokensProvider(
        "renpy",
        new (class implements DocumentSemanticTokensProvider {
            provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens> {
                if (document.languageId !== "renpy") {
                    return;
                } else {
                    return getSemanticTokens(document, legend);
                }
            }
        })(),
        legend
    );
    context.subscriptions.push(semanticTokens);

    // A TextDocument was changed
    context.subscriptions.push(
        workspace.onDidSaveTextDocument((document) => {
            if (document.languageId !== "renpy") {
                return;
            }

            const filesConfig = workspace.getConfiguration("files");
            if (filesConfig.get("autoSave") === undefined || filesConfig.get("autoSave") !== "off") {
                // only trigger document refreshes if file autoSave is off
                return;
            }

            const config = workspace.getConfiguration("renpy");
            if (config && config.compileOnDocumentSave) {
                if (!NavigationData.isCompiling) {
                    ExecuteRenpyCompile();
                }
            }

            if (!NavigationData.isImporting) {
                updateStatusBar("$(sync~spin) Initializing Ren'Py static data...");
                const uri = Uri.file(document.fileName);
                const filename = stripWorkspaceFromFile(uri.path);
                NavigationData.clearScannedDataForFile(filename);
                NavigationData.scanDocumentForClasses(filename, document);
                updateStatusBar(getStatusBarText());
            }
        })
    );

    // diagnostics (errors and warnings)
    const diagnostics = languages.createDiagnosticCollection("renpy");
    context.subscriptions.push(diagnostics);
    subscribeToDocumentChanges(context, diagnostics);

    // custom command - refresh data
    const refreshCommand = commands.registerCommand("renpy.refreshNavigationData", async () => {
        updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
        try {
            await NavigationData.refresh(true);
        } catch (error) {
            console.log(error);
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
            window.showWarningMessage(`Could not jump to the location (error: ${error})`);
        }
    });
    context.subscriptions.push(gotoFileLocationCommand);

    // custom command - refresh diagnostics
    const refreshDiagnosticsCommand = commands.registerCommand("renpy.refreshDiagnostics", () => {
        if (window.activeTextEditor) {
            refreshDiagnostics(window.activeTextEditor.document, diagnostics);
        }
    });
    context.subscriptions.push(refreshDiagnosticsCommand);

    // custom command - call renpy to compile
    const compileCommand = commands.registerCommand("renpy.compileNavigationData", () => {
        // check Settings has the path to Ren'Py executable
        // Call Ren'Py with the workspace folder and the json-dump argument
        const config = workspace.getConfiguration("renpy");
        if (!config) {
            window.showErrorMessage("Ren'Py executable location not configured or is invalid.");
        } else {
            if (isValidExecutable(config.renpyExecutableLocation)) {
                // call renpy
                const result = ExecuteRenpyCompile();
                if (result) {
                    window.showInformationMessage("Ren'Py compilation has completed.");
                }
            } else {
                window.showErrorMessage("Ren'Py executable location not configured or is invalid.");
            }
        }
    });
    context.subscriptions.push(compileCommand);

    // Custom status bar
    myStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
    context.subscriptions.push(myStatusBarItem);
    myStatusBarItem.text = "$(sync~spin) Initializing Ren'Py static data...";
    myStatusBarItem.show();

    // Detect file system change to the navigation.json file and trigger a refresh
    updateStatusBar("$(sync~spin) Initializing Ren'Py static data...");
    await NavigationData.init(context.extensionPath);
    updateStatusBar(getStatusBarText());

    try {
        fs.watch(getNavigationJsonFilepath(), async (event, filename) => {
            if (filename) {
                console.log(`${filename} changed`);
                updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
                try {
                    await NavigationData.refresh();
                } catch (error) {
                    console.log(`${Date()}: error refreshing NavigationData: ${error}`);
                } finally {
                    updateStatusBar(getStatusBarText());
                }
            }
        });
    } catch (error) {
        console.log(`Watch navigation.json file error: ${error}`);
    }

    if (config && config.watchFoldersForChanges) {
        console.log("Starting Watcher for images folder.");
        try {
            fs.watch(getImagesFolder(), { recursive: true }, async (event, filename) => {
                if (filename && event === "rename") {
                    console.log(`${filename} created/deleted`);
                    await NavigationData.scanForImages();
                }
            });
        } catch (error) {
            console.log(`Watch image folder error: ${error}`);
        }

        console.log("Starting Watcher for audio folder.");
        try {
            fs.watch(getAudioFolder(), { recursive: true }, async (event, filename) => {
                if (filename && event === "rename") {
                    console.log(`${filename} created/deleted`);
                    await NavigationData.scanForAudio();
                }
            });
        } catch (error) {
            console.log(`Watch audio folder error: ${error}`);
        }
    }
}

export function deactivate() {
    console.log("Ren'Py extension deactivating");
    fs.unwatchFile(getNavigationJsonFilepath());
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

function updateStatusBar(text: string) {
    if (text === "") {
        myStatusBarItem.hide();
    } else {
        myStatusBarItem.text = text;
        myStatusBarItem.show();
    }
}

function hideRpycFilesFromWorkspace() {
    const jsonDumpFile = getNavigationJsonFilepath();
    if (fs.existsSync(jsonDumpFile)) {
        const config = workspace.getConfiguration("files");
        if (config["exclude"]["**/*.rpyc"] === undefined) {
            config.update("exclude", { "**/*.rpyc": true }, ConfigurationTarget.Workspace);
        }
    }
}

function isValidExecutable(renpyExecutableLocation: string): boolean {
    if (!renpyExecutableLocation || renpyExecutableLocation === "") {
        return false;
    }
    return fs.existsSync(renpyExecutableLocation);
}

function ExecuteRenpyCompile(): boolean {
    const config = workspace.getConfiguration("renpy");
    const renpy = config.renpyExecutableLocation;
    if (isValidExecutable(renpy)) {
        const renpyPath = cleanUpPath(Uri.file(renpy).path);
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
            const result = cp.spawnSync(renpy, args, { cwd: `${cwd}`, env: { PATH: process.env.PATH }, encoding: "utf-8", windowsHide: true });
            if (result.error) {
                console.log(`renpy spawn error: ${result.error}`);
                return false;
            }
            if (result.stderr && result.stderr.length > 0) {
                console.log(`renpy spawn stderr: ${result.stderr}`);
                return false;
            }
        } catch (error) {
            console.log(`renpy spawn error: ${error}`);
            return false;
        } finally {
            NavigationData.isCompiling = false;
            updateStatusBar(getStatusBarText());
        }
        return true;
    }
    return false;
}
