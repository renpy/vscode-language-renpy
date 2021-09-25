// Based on https://raw.githubusercontent.com/Microsoft/vscode/master/extensions/python/src/pythonMain.ts from Microsoft vscode
//
// Licensed under MIT License. See LICENSE in the project root for license information.
'use strict';

import { ExtensionContext, languages, commands, window, IndentAction, TextDocument, Position, CancellationToken, ProviderResult, HoverProvider, Hover, DefinitionProvider, Range, Location, MarkdownString, Uri, workspace, CompletionContext, CompletionItemProvider, CompletionItem, DocumentSymbol, DocumentSymbolProvider, SymbolKind, DocumentColorProvider, ColorInformation, ColorPresentation, Color, Definition, StatusBarItem, StatusBarAlignment, ConfigurationTarget, SignatureHelpProvider, SignatureHelp, SignatureHelpContext, CompletionTriggerKind, ReferenceContext, ReferenceProvider, DocumentSemanticTokensProvider, SemanticTokens, SemanticTokensLegend, FoldingRangeProvider, FoldingContext, FoldingRange } from 'vscode';
import { getColorInformation, getColorPresentations } from './color';
import { formatDocumentationAsMarkdown, getArgumentParameterInfo, getCurrentContext, getPyDocsAtLine, Navigation, rangeAsString  } from './navigation';
import { NavigationData } from './navigationdata';
import { cleanUpPath, extractFilename, findReferenceMatches, getFileWithPath, getWorkspaceFolder, stripWorkspaceFromFile } from './workspace';
import { refreshDiagnostics, subscribeToDocumentChanges } from './diagnostics';
import { getSemanticTokens } from './semantics';
import * as fs from 'fs';
import * as cp from 'child_process';

let myStatusBarItem: StatusBarItem;

export async function activate(context: ExtensionContext): Promise<any> {
	console.log("Ren'Py extension activated");

	languages.setLanguageConfiguration('renpy', {
		onEnterRules: [{
			// indentation for Ren'Py and Python blocks
			beforeText: /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|label|menu|init|\":|\':|python|).*?:\s*$/,
			action: { indentAction: IndentAction.Indent }
		}]
	});

	const filepath = getNavigationJsonFilepath();
	if (!fs.existsSync(filepath)) {
		return;
	}

	// hide rpyc files if the setting is enabled
	const config = workspace.getConfiguration('renpy');
	if (config && config.excludeRpycFilesFromWorkspace) {
		hideRpycFilesFromWorkspace();
	}

	// hover provider for code tooltip
	let hoverProvider = languages.registerHoverProvider('renpy',
		new (class implements HoverProvider {
			async provideHover(
				document: TextDocument, position: Position, token: CancellationToken
			): Promise<Hover | null | undefined> {
				let range = document.getWordRangeAtPosition(position);
				if (!range) {
					return undefined;
				}

				const line = document.lineAt(position).text;
				if (!NavigationData.positionIsCleanForCompletion(line, new Position(position.line, range.start.character))) {
					return undefined;
				}

				let word = document.getText(range);
				if (word === 'kwargs' && range.start.character > 2) {
					const newRange = new Range(range.start.line, range.start.character - 2, range.end.line, range.end.character);
					if (document.getText(newRange) === '**kwargs') {
						range = newRange;
						word = document.getText(range);
					}
				}

				// check if the hover is a Semantic Token
				const filename = stripWorkspaceFromFile(document.uri.path);
				const range_key = rangeAsString(filename, range);
				const navigation = NavigationData.gameObjects['semantic'][range_key];
				if (navigation) {
					let contents = new MarkdownString();
					if (navigation && navigation instanceof Navigation) {
						const args = [{ uri: document.uri, range: navigation.toRange() }];
						const commandUri = Uri.parse(`command:renpy.jumpToFileLocation?${encodeURIComponent(JSON.stringify(args))}`);
						contents.appendMarkdown(`(${navigation.source}) **${document.getText(range)}** [${extractFilename(filename)}:${navigation.location}](${commandUri})`);
						if (navigation.documentation.length > 0) {
							contents.appendMarkdown('\n\n---\n\n');
							contents.appendCodeblock(navigation.documentation);
						}
						contents.isTrusted = true;
					} else {
						contents.appendMarkdown(`(${navigation.source}) **${document.getText(range)}**`);
					}
					return new Hover(contents);
				}

				// search the Navigation dump entries
				if (range && position.character > 2) {
					const prefix = getKeywordPrefix(document, position, range);
					if (prefix && prefix !== 'store') {
						word = `${prefix}.${word}`;
					}
				}

				const locations = getNavigationDumpEntries(word);
				if (locations) {
					let contents = getHoverMarkdownString(locations);
					return new Hover(contents);
				}
			}
		})()
	);
	context.subscriptions.push(hoverProvider);

	// provider for Go To Definition
	let definitionProvider = languages.registerDefinitionProvider('renpy',
		new (class implements DefinitionProvider {
			provideDefinition(
				document: TextDocument, position: Position, token: CancellationToken
			): ProviderResult<Definition> {
				const range = document.getWordRangeAtPosition(position);
				if (!range) {
					return;
				}

				// check if this range is a semantic token
				const filename = stripWorkspaceFromFile(document.uri.path);
				const range_key = rangeAsString(filename, range);
				const navigation = NavigationData.gameObjects['semantic'][range_key];
				if (navigation) {
					const uri = Uri.file(getFileWithPath(navigation.filename));
					return new Location(uri, navigation.toRange());
				}

				const line = document.lineAt(position).text;
				if (!NavigationData.positionIsCleanForCompletion(line, new Position(position.line, range.start.character))) {
					return undefined;
				}

				let word = document.getText(range);
				if (range && position.character > 2) {
					const prefix = getKeywordPrefix(document, position, range);
					if (prefix) {
						word = `${prefix}.${word}`;
					}
				}

				let definitions: Definition = [];
				const locations = getNavigationDumpEntries(word);
				if (locations) {
					for (let location of locations) {
						if (location.filename !== "") {
							const uri = Uri.file(getFileWithPath(location.filename));
							definitions.push(new Location(uri, location.toRange()));
						}
					}
				}
				return definitions;
			}
		})()
	);
	context.subscriptions.push(definitionProvider);

	// provider for Outline view
	let symbolProvider = languages.registerDocumentSymbolProvider('renpy',
		new (class implements DocumentSymbolProvider {
			provideDocumentSymbols(document: TextDocument, token: CancellationToken) : ProviderResult<DocumentSymbol[]> {
				if (!document) {
					return;
				}
				const uri = Uri.file(document.fileName);
				const documentFilename = stripWorkspaceFromFile(uri.path);
				let results: DocumentSymbol[] = [];
				const range = new Range(0, 0, 0, 0);
				for (let type in NavigationData.data.location) {
					const category = NavigationData.data.location[type];
					let parentSymbol = new DocumentSymbol(type, "", getDocumentSymbolKind(type, false), range, range);
					for (let key in category) {
						if (category[key][0] === documentFilename) {
							const childRange = new Range(category[key][1] - 1, 0, category[key][1] - 1, 0);
							parentSymbol.children.push(
								new DocumentSymbol(key, `:${category[key][1]}`, getDocumentSymbolKind(type, true), childRange, childRange)
							);
						}
					}
					if (parentSymbol.children.length > 0) {
						if (type === 'class') {
							// put class at the top (before callable)
							results.unshift(parentSymbol);
						} else {
							results.push(parentSymbol);
						}
					}
				}
				return results;
			}
		})()
	);
	context.subscriptions.push(symbolProvider);

	// provider for Method Signature Help
	let signatureProvider = languages.registerSignatureHelpProvider('renpy',
		new (class implements SignatureHelpProvider {
			provideSignatureHelp(
				document: TextDocument, position: Position, token: CancellationToken, context: SignatureHelpContext
			): ProviderResult<SignatureHelp> {
				let triggerWord = "";

				//find the keyword before the last '(' character before the current position
				const currentLine = document.lineAt(position.line).text;
				const currentLinePrefix = currentLine.substring(0, position.character);
				const openParenthesis = currentLinePrefix.lastIndexOf('(');
				if (openParenthesis) {
					const prevPosition = new Position(position.line, openParenthesis - 1);
					const prevRange = document.getWordRangeAtPosition(prevPosition);
					if (!prevRange) {
						return;
					}
					triggerWord = document.getText(prevRange);					
					const prefix = getKeywordPrefix(document, position, prevRange);
					if (prefix) {
						triggerWord = `${prefix}.${triggerWord}`;
					}
				}

				// show the documentation for the keyword that triggered this signature
				let signatureHelp: SignatureHelp = new SignatureHelp();
				const locations = getNavigationDumpEntries(triggerWord);
				if (locations) {
					for (let location of locations) {
						if (!location.args || location.args.length === 0) {
							location = NavigationData.getClassData(location);
						}
						if (location.args && location.args.length > 0) {
							let signature = getArgumentParameterInfo(location, currentLine, position.character);
							signatureHelp.activeParameter = 0;
							signatureHelp.activeSignature = 0;
							signatureHelp.signatures.push(signature);
						}
					}
				}
				return signatureHelp;
			}
		})(),
		'(', ',', '='
	);
	context.subscriptions.push(signatureProvider);

	// Completion provider
	let completionProvider = languages.registerCompletionItemProvider('renpy',
		new (class implements CompletionItemProvider {
			provideCompletionItems(
				document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext
			): ProviderResult<CompletionItem[]> {
				if (context.triggerKind === CompletionTriggerKind.TriggerCharacter) {
					const line = document.lineAt(position).text;
					const linePrefix = line.substr(0, position.character);
					if (!NavigationData.positionIsCleanForCompletion(line, position)) {
						return;
					}

					if (linePrefix.endsWith('renpy.')) {
						return NavigationData.renpyAutoComplete;
					} else if (linePrefix.endsWith('config.')) {
						return NavigationData.configAutoComplete;
					} else if (linePrefix.endsWith('gui.')) {
						return NavigationData.guiAutoComplete;
					} else if (linePrefix.endsWith('renpy.music.')) {
						return NavigationData.getAutoCompleteList('renpy.music.');
					} else if (linePrefix.endsWith('renpy.audio.')) {
						return NavigationData.getAutoCompleteList('renpy.audio.');
					} else if (linePrefix.endsWith('persistent.')) {
						return NavigationData.getAutoCompleteList('persistent.');
					} else if (linePrefix.endsWith('store.')) {
						return NavigationData.getAutoCompleteList('store.');
					} else {
						const prefixPosition = new Position(position.line, position.character - 1);
						const range = document.getWordRangeAtPosition(prefixPosition);
						if (range) {
							const parentPosition = new Position(position.line, line.length - line.trimLeft().length);
							let parent = document.getText(document.getWordRangeAtPosition(parentPosition));
							const kwPrefix = document.getText(range);
							const parent_context = getCurrentContext(document, position);
							return NavigationData.getAutoCompleteList(kwPrefix, parent, parent_context);
						} else if (context.triggerCharacter === '-' || context.triggerCharacter === '@' || context.triggerCharacter === '=') {
							const parentPosition = new Position(position.line, line.length - line.trimLeft().length);
							let parent = document.getText(document.getWordRangeAtPosition(parentPosition));
							if (parent) {
								if (context.triggerCharacter === '=') {
									return NavigationData.getAutoCompleteList(parent);
								} else {
									return NavigationData.getAutoCompleteList(context.triggerCharacter, parent);
								}
							}
						}				
					}
				}
				return undefined;
			}
		})(),
		'.', ' ', '@', '-'
	);
	context.subscriptions.push(completionProvider);

	// Color Provider
	let colorProvider = languages.registerColorProvider('renpy',
		new (class implements DocumentColorProvider {
			provideDocumentColors(
				document: TextDocument, token: CancellationToken
			): ProviderResult<ColorInformation[]> {

				return getColorInformation(document);

			}
			provideColorPresentations(
				color: Color, context: { document: TextDocument, range: Range }, token: CancellationToken
			): ProviderResult<ColorPresentation[]> {
				
				return getColorPresentations(color, context.document, context.range);

			}
		})()
	);
	context.subscriptions.push(colorProvider);

	// Find All References provider
	let references = languages.registerReferenceProvider('renpy',
		new (class implements ReferenceProvider {
			async provideReferences(
				document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken
			): Promise<Location[] | null | undefined> {
				const range = document.getWordRangeAtPosition(position);
				let keyword = document.getText(range);
				if (!keyword) {
					return;
				}

				if (range) {
					const prefix = getKeywordPrefix(document, position, range);
					if (prefix && prefix !== 'store') {
						keyword = `${prefix}.${keyword}`;
					}
				}

				let references: Location[] = [];
				const files = await workspace.findFiles('**/*.rpy');
				if (files && files.length > 0) {
					for (let file of files) {
						document = await workspace.openTextDocument(file);
						const locations = findReferenceMatches(keyword, document);
						if (locations) {
							for (let l of locations) {
								references.push(l);
							}
						}
					}
				}

				return references;
			}
		})()
	);
	context.subscriptions.push(references);

	const tokenTypes = ['class', 'parameter', 'variable'];
	const tokenModifiers = ['declaration'];
	const legend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

	// Semantic Token Provider
	let semanticTokens = languages.registerDocumentSemanticTokensProvider('renpy',
		new (class implements DocumentSemanticTokensProvider {
			//onDidChangeSemanticTokens?: Event<void> | undefined;
			provideDocumentSemanticTokens(
				document: TextDocument, token: CancellationToken
			): ProviderResult<SemanticTokens> {
				if (document.languageId !== 'renpy') {
					return;
				} else {
					return getSemanticTokens(document, legend);
				}
			}
		})(),
		legend
	);
	context.subscriptions.push(semanticTokens);

	let foldingRange = languages.registerFoldingRangeProvider('renpy',
		new (class implements FoldingRangeProvider {
			provideFoldingRanges(
				document: TextDocument, context: FoldingContext, token: CancellationToken
			): ProviderResult<FoldingRange[]> {
				let ranges: FoldingRange[] = [];
				const rxFolding = /\s*(screen|label|class|layeredimage|def)\s+([a-zA-Z_]+)\((.*)\)\s*:|\s*(screen|label|class|layeredimage|def)\s+([a-zA-Z_]+)\s*:/;
				let parent = '';
				let parent_line = 0;
				let indent_level = 0;

				for (let i = 0; i < document.lineCount; ++i) {
					try {
						const line = document.lineAt(i).text;
						let end_line = i - 1;
						if (parent.length > 0 && line.length > 0 && line.length - line.trimLeft().length <= indent_level && end_line > parent_line) {
							while (end_line > 1 && document.lineAt(end_line).text.length === 0) {
								end_line--;
							}

							if (end_line > parent_line) {
								ranges.push(new FoldingRange(parent_line, end_line));
							}
							parent = '';
							parent_line = 0;
						}
						const matches = line.match(rxFolding);
						if (matches) {
							if (indent_level > 0 && line.length - line.trimLeft().length > indent_level) {
								continue;
							}

							if (matches[2]) {
								parent = matches[2];
							} else {
								parent = matches[4];
							}
							parent_line = i;
							indent_level = line.length - line.trimLeft().length;
						}
					} catch (error) {
						console.log(`foldingProvider error: ${error}`);
					}
				}

				if (parent.length > 0) {
					let end_line = document.lineCount - 1;
					if (parent.length > 0 && end_line > parent_line) {
						while (end_line > 1 && document.lineAt(end_line).text.length === 0) {
							end_line--;
						}

						if (end_line > parent_line) {
							ranges.push(new FoldingRange(parent_line, end_line));
						}
					}
				}

				return ranges;
			}
		})()
	);
	context.subscriptions.push(foldingRange);

	// A TextDocument was changed
	context.subscriptions.push(workspace.onDidSaveTextDocument(
		document => {
			if (document.languageId !== 'renpy') {
				return;
			}

			const filesConfig = workspace.getConfiguration('files');
			if (filesConfig.get('autoSave') === undefined || filesConfig.get('autoSave') !== "off") {
				// only trigger document refreshes if file autoSave is off
				return;
			}

			const config = workspace.getConfiguration('renpy');
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
				updateStatusBar("");
			}
		})
	);

	// diagnostics (errors and warnings)
	const diagnostics = languages.createDiagnosticCollection("renpy");
	context.subscriptions.push(diagnostics);
	subscribeToDocumentChanges(context, diagnostics);

	// custom command - refresh data
	let refreshCommand = commands.registerCommand('renpy.refreshNavigationData', async () => {
		updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
		try {
			await NavigationData.refresh(true);
		} catch (error) {
			console.log(error);
		} finally {
			updateStatusBar("");
		}
	});
	context.subscriptions.push(refreshCommand);

	// custom command - jump to location
	let gotoFileLocationCommand = commands.registerCommand('renpy.jumpToFileLocation', (args) => {
		const uri = Uri.file(cleanUpPath(args.uri.path));
		const range = new Range(args.range[0].line, args.range[0].character, args.range[0].line, args.range[0].character);
		try {
			window.showTextDocument(uri, { selection: range });
		} catch (error) {
			window.showWarningMessage(`Could not jump to the location (error: ${error})`);
		}
	});
	context.subscriptions.push(gotoFileLocationCommand);

	// custom command - refresh diagnositcs
	let refreshDiagnosticsCommand = commands.registerCommand('renpy.refreshDiagnostics', () => {
		if (window.activeTextEditor) {
			refreshDiagnostics(window.activeTextEditor.document, diagnostics);
		}
	});
	context.subscriptions.push(refreshDiagnosticsCommand);

	// custom command - call renpy to compile
	let compileCommand = commands.registerCommand('renpy.compileNavigationData', () => {
		// check Settings has the path to Ren'Py executable
		// Call Ren'Py with the workspace folder and the json-dump argument
		const config = workspace.getConfiguration('renpy');
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
	updateStatusBar("");

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
					updateStatusBar("");
				}
			}
		});
	} catch (error) {
		console.log(`Watch navigation.json file error: ${error}`);
	}

	/*
	try {
		fs.watchFile(getNavigationJsonFilepath(), async (curr, prev) => {
			if (curr.mtime !== prev.mtime) {
				console.log(`Navigation.json changed`);
				updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
				try {
					await NavigationData.refresh();
				} catch (error) {
					console.log(`${Date()}: error refreshing NavigationData: ${error}`);
				} finally {
					updateStatusBar("");
				}
			}
		});
	} catch (error) {
		console.log(`Watch navigation.json file error: ${error}`);
	}
	*/

	if (config && config.watchFoldersForChanges) {
		const workspaceFolder = getWorkspaceFolder();

		console.log("Starting Watcher for images folder.");
		try {
			fs.watch(workspaceFolder + '/game/images', {recursive: true},  async (event, filename) => {
				if (filename && event === 'rename') {
					console.log(`${filename} created/deleted`);
					await NavigationData.scanForImages();
				}
			});
		} catch (error) {
			console.log(`Watch image folder error: ${error}`);
		}

		console.log("Starting Watcher for audio folder.");
		try {
			fs.watch(workspaceFolder + '/game/audio', {recursive: true},  async (event, filename) => {
				if (filename && event === 'rename') {
					console.log(`${filename} created/deleted`);
					updateStatusBar("$(sync~spin) Refreshing Ren'Py navigation data...");
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
	if (spaceBefore === '.') {
		const prevPosition = new Position(position.line, range.start.character - 1);
		const prevRange = document.getWordRangeAtPosition(prevPosition);
		if (prevRange) {
			const prevWord = document.getText(prevRange);
			if (prevWord === 'music' || prevWord === 'sound') {
				// check for renpy.music.* or renpy.sound.*
				const newPrefix = getKeywordPrefix(document, prevPosition, prevRange);
				if (newPrefix === 'renpy') {
					return `${newPrefix}.${prevWord}`;
				}
			}
			if (prevWord !== 'store') {
				return prevWord;
			}
		}	
	}
	return;
}

export function getNavigationDumpEntry(keyword: string): Navigation | undefined {
	const data = getNavigationDumpEntries(keyword);
	if (data) {
		return data[0];
	}
}

export function getNavigationDumpEntries(keyword: string): Navigation[] | undefined {
	let entries = NavigationData.find(keyword);
	if (!entries || entries.length === 0 && keyword.indexOf('.') > 0) {
		entries = NavigationData.resolve(keyword);
	}
	return entries;
}

export function getNavigationJsonFilepath() {
	const filename = "saves/navigation.json";
	const filepath = getFileWithPath(filename);
	return filepath;
}

export function readNavigationJson() {
	try {
		const filepath = getNavigationJsonFilepath();
		console.log(`readNavigationJson: ${filepath}`);
		let flatData;
		try {
			flatData = fs.readFileSync(filepath, 'utf-8');
		} catch (error) {
			flatData = '{}';
		}
		const json = JSON.parse(flatData);
		return json;
	} catch (error) {
		window.showErrorMessage(`readNavigationJson error: ${error}`);
	}	
}

export function getDefinitionFromFile(filename: string, line: number): Navigation | undefined {
	const filepath = getFileWithPath(filename);
	try {
		let data = fs.readFileSync(filepath, 'utf-8');
		const lines = data.split('\n');
		if (line <= lines.length) {
			let text = lines[line - 1].trim();
			if (text.endsWith(':')) {
				text = text.slice(0, -1);
			} else if (text.endsWith('(')) {
				text = text + ')';
			} else if (text.endsWith('[')) {
				text = text + ']';
			} else if (text.endsWith('{')) {
				text = text + '}';
			}

			let docs = "";
			if (lines[line].indexOf('"""') >= 0) {
				docs = getPyDocsAtLine(lines, line);
			}
			
			let args = "";
			if (text.indexOf('(') > 0) {
				args = text.substr(text.indexOf('('));
				args = args.replace('(self, ', '(');
				args = args.replace('(self)', '()');
			}

			return new Navigation(
				"workspace",
				text,
				filename,
				line,
				docs,
				args,
				"",
				0
			);
		}
	} catch (error) {
		return undefined;
	}
}

export function getDocumentSymbolKind(category: string, child: boolean) : SymbolKind {
	switch (category) {
		case "callable":
			return child ? SymbolKind.Method : SymbolKind.Module;
		case "screen":
			return child ? SymbolKind.Struct : SymbolKind.Module;
		case "define":
			return child ? SymbolKind.Variable : SymbolKind.Module;
		case "transform":
			return child ? SymbolKind.Variable : SymbolKind.Module;
		case "label":
			return child ? SymbolKind.String : SymbolKind.Module;
		case "class":
			return child ? SymbolKind.Class : SymbolKind.Module;
		case "displayable":
			return child ? SymbolKind.File : SymbolKind.Module;
		case "persistent":
			return child ? SymbolKind.Constant : SymbolKind.Module;
		default:
			return SymbolKind.Variable;
	}
}

export function getHoverMarkdownString(locations: Navigation[]) : MarkdownString {
	let contents = new MarkdownString();
	let index = 0;

	for (let location of locations) 
	{
		index++;
		if (index > 1) {
			contents.appendMarkdown('\n\n---\n\n');
			if (location.keyword.startsWith('gui.') || location.keyword.startsWith('config.')) {
				if (location.documentation && location.documentation.length > 0) {
					contents.appendMarkdown(formatDocumentationAsMarkdown(location.documentation));
					continue;
				}
			}
		}

		let source = "";
		if (location.filename && location.filename.length > 0 && location.location >= 0) {
			source = `: ${extractFilename(location.filename)}:${location.location}`;
		}
	
		let documentation = location.documentation;
		let fileContents = "";
		if (documentation === "" && location.filename !== "" && location.location >= 0) {
			const fileData = getDefinitionFromFile(location.filename, location.location);
			if (fileData) {
				fileContents = fileData?.keyword;
				documentation = fileData?.documentation;
			}
		}
		if (location.source === 'class') {
			const classData = NavigationData.getClassData(location);
			if (classData) {
				//fileContents = `${classData.source} ${classData.keyword}${classData.args}`;
				documentation = classData.documentation;
			}
		}

		let type = location.source;
		let character = NavigationData.gameObjects['characters'][location.keyword];
		if (character) {
			type = 'character';
		}

		if (location.filename && location.filename.length > 0 && location.location >= 0) {
			const uri = Uri.file(getFileWithPath(location.filename));
			const args = [{ uri: uri, range: location.toRange() }];
			const commandUri = Uri.parse(`command:renpy.jumpToFileLocation?${encodeURIComponent(JSON.stringify(args))}`);
			contents.appendMarkdown(`(${type}) **${location.keyword}** [${source}](${commandUri})`);
		} else {
			contents.appendMarkdown(`(${type}) **${location.keyword}** ${source}`);
		}
		contents.isTrusted = true;

		if (character && documentation.length === 0) {
			contents.appendMarkdown('\n\n---\n\n');
			contents.appendText(`Character definition for ${character.resolved_name}.`);
			contents.appendMarkdown('\n\n---\n\n');
		}

		if (location.args && location.args.length > 0) {
			contents.appendMarkdown('\n\n---\n\n');
			const pytype = getPyType(location);
			contents.appendCodeblock(`${pytype}${location.keyword}${location.args}`, 'renpy');
		}

		if (fileContents && fileContents.length > 0) {
			if (!location.args || location.args.length === 0) {
				contents.appendMarkdown('\n\n---\n\n');
			}
			contents.appendCodeblock(fileContents, 'renpy');
		}

		if (documentation && documentation.length > 0) {
			if (!location.args || location.args.length === 0) {
				contents.appendMarkdown('\n\n---\n\n');
			}
			documentation = formatDocumentationAsMarkdown(documentation);
			const split = documentation.split('::');
			if (split.length > 1) {				
				contents.appendCodeblock(split[1]);
				contents.appendMarkdown('\n\n---\n\n');
				contents.appendMarkdown(split[0]);
			} else {
				contents.appendMarkdown(split[0]);
			}
		}		
	}

	return contents;
}

function getPyType(location: Navigation) {
	let pytype = location.type || "";

	if (pytype === "var" && (location.keyword.startsWith("gui.") || location.keyword.startsWith("config."))) {
		pytype = "define";
	}
	else if (pytype === "var" || pytype === "function") {
		pytype = "def";
	}

	if (pytype !== "") {
		pytype = pytype + " ";
	}
	return pytype;
}

function updateStatusBar(text:string) {
	if (text === "") {		
		myStatusBarItem.hide();
	} else {
		myStatusBarItem.text = text;
		myStatusBarItem.show();
	}
}

function hideRpycFilesFromWorkspace() {
	var jsonDumpFile = getNavigationJsonFilepath();
	if (fs.existsSync(jsonDumpFile)) {
		const config = workspace.getConfiguration("files");
		if (config["exclude"]["**/*.rpc"] === undefined) {
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
	const config = workspace.getConfiguration('renpy');
	const renpy = config.renpyExecutableLocation;
	if (isValidExecutable(renpy)) {
		let renpyPath = cleanUpPath(Uri.file(renpy).path);
		let cwd = renpyPath.substring(0, renpyPath.lastIndexOf("/"));

		let wf = getWorkspaceFolder();
		if (wf.endsWith('/game')) {
			wf = wf.substr(0, wf.length - 5);
		}
		const navData = getNavigationJsonFilepath();
		//const args = `${wf} compile --json-dump ${navData}`;
		const args: string[] = [
			`${wf}`,
			"compile",
			"--json-dump",
			`${navData}`
		];
		try {
			NavigationData.isCompiling = true;
			updateStatusBar("$(sync~spin) Compiling Ren'Py navigation data...");
			let result = cp.spawnSync(renpy, args, { cwd:`${cwd}`, env: { PATH: process.env.PATH }, encoding:"utf-8", windowsHide: true});
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
			updateStatusBar("");
		}
		return true;
	}
	return false;
}

