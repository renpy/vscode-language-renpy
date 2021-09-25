'use strict';

import { commands, CompletionItem, CompletionItemKind, Position, TextDocument, window, workspace } from "vscode";
import { getDefinitionFromFile, readNavigationJson } from "./extension";
import { DataType, getBaseTypeFromDefine, getNamedParameter, getPyDocsFromTextDocumentAtLine, Navigation, splitParameters, stripQuotes } from "./navigation";
import { cleanUpPath, extractFilenameWithoutExtension, getFileWithPath, stripWorkspaceFromFile } from "./workspace";

const filterCharacter = '\u2588';

export class NavigationData {
	static data: any = {};
	static renpyFunctions: any;
	static autoCompleteKeywords: any;
	static renpyAutoComplete: CompletionItem[];
	static configAutoComplete: CompletionItem[];
	static guiAutoComplete: CompletionItem[];
	static internalAutoComplete: CompletionItem[];
	static displayableAutoComplete: CompletionItem[];
	static displayableQuotedAutoComplete: CompletionItem[];
	static gameObjects: any = {};
	static isImporting: boolean = false;
	static isCompiling: boolean = false;

	static async init(extensionPath: string) {
		console.log(`NavigationData init`);
		
		const data = require(`${extensionPath}/src/renpy.json`);
		NavigationData.renpyFunctions = data;

		const kwData = require(`${extensionPath}/src/renpyauto.json`);
		NavigationData.autoCompleteKeywords = kwData;

		NavigationData.renpyAutoComplete = [];
		for (let key in NavigationData.renpyFunctions.renpy) {
			if (key.charAt(0) === key.charAt(0).toUpperCase()) {
				NavigationData.renpyAutoComplete.push(new CompletionItem(key.substr(6), CompletionItemKind.Class));
			} else {
				NavigationData.renpyAutoComplete.push(new CompletionItem(key.substr(6), CompletionItemKind.Method));
			}
		}

		NavigationData.configAutoComplete = [];
		for (let key in NavigationData.renpyFunctions.config) {
			NavigationData.configAutoComplete.push(new CompletionItem(key.substring(7), CompletionItemKind.Property));
		}

		NavigationData.guiAutoComplete = [];
		NavigationData.internalAutoComplete = [];
		for (let key in NavigationData.renpyFunctions.internal) {
			NavigationData.internalAutoComplete.push(new CompletionItem(key, CompletionItemKind.Class));
			if (key.startsWith('gui.')) {
				NavigationData.guiAutoComplete.push(new CompletionItem(key.substr(4), CompletionItemKind.Variable));
			}
		}

		await NavigationData.refresh();
	}

	static getDisplayableAutoComplete(quoted: boolean = false): CompletionItem[] {
		if (NavigationData.displayableAutoComplete === undefined || NavigationData.displayableAutoComplete.length === 0
				|| NavigationData.displayableQuotedAutoComplete === undefined || NavigationData.displayableQuotedAutoComplete.length === 0) {
			NavigationData.displayableAutoComplete = [];
			NavigationData.displayableQuotedAutoComplete = [];

			const config = workspace.getConfiguration('renpy');
			let showAutoImages = true;
			if (config && !config.showAutomaticImagesInCompletion) {
				showAutoImages = false;
			}
			const category = NavigationData.data.location['displayable'];
			for (let key in category) {
				const display: Displayable = category[key];
				if (display.location < 0 && showAutoImages) {
					let ci = new CompletionItem(key, CompletionItemKind.Folder);
					ci.sortText = '1' + key;
					NavigationData.displayableAutoComplete.push(ci);
					
					ci = new CompletionItem('"' + key + '"', CompletionItemKind.Folder);
					ci.sortText = '1' + key;
					NavigationData.displayableQuotedAutoComplete.push(ci);
				} else if (display.location >= 0) {
					let ci = new CompletionItem(key, CompletionItemKind.Value);
					ci.sortText = '0' + key;
					NavigationData.displayableAutoComplete.push(ci);

					ci = new CompletionItem('"' + key + '"', CompletionItemKind.Value);
					ci.sortText = '0' + key;
					NavigationData.displayableQuotedAutoComplete.push(ci);
				}
			}

			if (!NavigationData.displayableAutoComplete.some(e => e.label === 'black')) {
				let black = new CompletionItem("black", CompletionItemKind.Value);
				black.sortText = '0black';
				NavigationData.displayableAutoComplete.push(black);
			}
			if (!NavigationData.displayableQuotedAutoComplete.some(e => e.label === 'black')) {
				let black = new CompletionItem('"black"', CompletionItemKind.Value);
				black.sortText = '0black';
				NavigationData.displayableQuotedAutoComplete.push(black);
			}
		}

		if (quoted) {
			return NavigationData.displayableQuotedAutoComplete;
		} else {
			return NavigationData.displayableAutoComplete;
		}
	}

	static async refresh(interactive:boolean = false): Promise<boolean> {
		console.log(`${Date()}: NavigationData refresh`);
		NavigationData.isImporting = true;
		try {
			NavigationData.data = readNavigationJson();
			if (NavigationData.data.error) {
				window.showWarningMessage("Navigation data is empty. Ren'Py could not compile your project. Please check your project can start successfully.");
			}
			if (NavigationData.data.location === undefined) {
				NavigationData.data.location = {};
			}
			NavigationData.data.location['class'] = {};
			NavigationData.data.location['displayable'] = {};
			NavigationData.data.location['persistent'] = {};
			NavigationData.data.location['statement'] = {};
			NavigationData.gameObjects['characters'] = {};
			NavigationData.gameObjects['attributes'] = {};
			NavigationData.gameObjects['channels'] = {};
			NavigationData.gameObjects['properties'] = {};
			NavigationData.gameObjects['fields'] = {};
			NavigationData.gameObjects['define_types'] = {};
			NavigationData.gameObjects['semantic'] = {};
			NavigationData.gameObjects['audio'] = {};
			NavigationData.gameObjects['fonts'] = {};
			NavigationData.gameObjects['outlines'] = {};
			NavigationData.displayableAutoComplete = [];
			NavigationData.displayableQuotedAutoComplete = [];
			var scriptResult = await NavigationData.scanForScriptFiles();
			var imageResult = await NavigationData.scanForImages();
			if (scriptResult && imageResult) {
				await NavigationData.getCharacterImageAttributes();
			}
			await NavigationData.scanForFonts();
			await NavigationData.scanForAudio();
			commands.executeCommand('renpy.refreshDiagnostics');
			console.log(`NavigationData for ${NavigationData.data.name} v${NavigationData.data.version} loaded`);
			if (interactive) {
				window.showInformationMessage(`NavigationData for ${NavigationData.data.name} v${NavigationData.data.version} loaded`);
			}
		} catch (error) {
			console.log(`Error loading NavigationData.json: ${error}`);
		} finally {
			NavigationData.isImporting = false;
		}
		return true;
	}

	static find(keyword: string): Navigation[] | undefined {
		let locations: Navigation[] = [];
		let split = keyword.split('.');

		if (split.length === 2 && split[0] === 'persistent') {
			const type = NavigationData.data.location[split[0]];
			if (type) {
				const location = type[split[1]];
				if (location) {
					locations.push(new Navigation(
						split[0],
						split[1],
						location[0],
						location[1]
					));
					return locations;
				}
			}
		}

		for (let key in NavigationData.data.location) {
			let type = NavigationData.data.location[key];
			if (type[keyword]) {
				const data = type[keyword];
				if (data instanceof Navigation) { //!data.length
					locations.push(data);
				} else {
					locations.push(new Navigation(
						key,
						keyword,
						data[0],
						data[1]
					));
				}
			}
		}

		if (NavigationData.renpyFunctions.internal[keyword]) {
			let type = NavigationData.renpyFunctions.internal[keyword];
			locations.push(NavigationData.getNavigationObject("internal", keyword, type));
		}

		if (NavigationData.renpyFunctions.config[keyword]) {
			let type = NavigationData.renpyFunctions.config[keyword];
			locations.push(NavigationData.getNavigationObject("config", keyword, type));
		}

		if (NavigationData.renpyFunctions.renpy[keyword]) {
			let type = NavigationData.renpyFunctions.renpy[keyword];
			locations.push(NavigationData.getNavigationObject("equivalent", keyword, type));
		}

		if (split.length === 2 && NavigationData.gameObjects['properties'][split[0]]) {
			if (NavigationData.gameObjects['properties'][split[0]]) {
				const properties = NavigationData.gameObjects['properties'][split[0]];
				const filtered = Object.keys(properties).filter(key => properties[key].keyword === split[1]);
				if (filtered && filtered.length > 0) {
					let nav: Navigation = Object.create(properties[filtered[0]]);
					nav.keyword = `${nav.type}.${nav.keyword}`;
					locations.push(nav);
				}
			}
			if (NavigationData.gameObjects['fields'][split[0]]) {
				const fields = NavigationData.gameObjects['fields'][split[0]];
				const filtered = Object.keys(fields).filter(key => fields[key].keyword === split[1]);
				if (filtered && filtered.length > 0) {
					let nav: Navigation = Object.create(fields[filtered[0]]);
					nav.keyword = `${nav.type}.${nav.keyword}`;
					locations.push(nav);
				}
			}
		}

		if (locations && locations.length > 0) {
			return locations;
		}
	}

	/**
	 * Returns a list of CompletionItem objects for the previous keyword/statement
	 * @param prefix - The previous keyword/statement
	 * @param parent - The parent statement
	 * @param context - The context of this keyword
	 * @returns A list of CompletionItem objects
	 */
	static getAutoCompleteList(prefix: string, parent: string = "", context: string = ""): CompletionItem[] | undefined {
		let newlist: CompletionItem[] = [];
		const channels = NavigationData.getAudioChannels();
		const characters = Object.keys(NavigationData.gameObjects['characters']);
		
		if (prefix === 'renpy.music.' || prefix === 'renpy.audio.') {
			prefix = prefix.replace('renpy.', '').trim();
			const list = NavigationData.renpyAutoComplete.filter(item => {if (typeof item.label === 'string') {item.label.startsWith(prefix);} });
			for (let item of list) {
				if (typeof item.label === 'string') {
					newlist.push(new CompletionItem(item.label.replace(prefix, ''), item.kind));
				}
			}
			return newlist;
		} else if (prefix === 'persistent.') {
			// get list of persistent definitions
			const gameObjects = NavigationData.data.location['persistent'];
			for (let key in gameObjects) {
				newlist.push(new CompletionItem(key, CompletionItemKind.Value));
			}
			return newlist;
		} else if (prefix === 'store.') {
			// get list of default variables
			const defaults = NavigationData.gameObjects['define_types'];
			const filtered = Object.keys(defaults).filter(key => defaults[key].define === 'default');
			for (let key of filtered) {
				newlist.push(new CompletionItem(key, CompletionItemKind.Variable));
			}
			return newlist;
		} else if (prefix === 'show') {
			// a displayable (plus expression/screen/text)
			newlist = NavigationData.getDisplayableAutoComplete(false);
			if (!newlist.some(e => e.label === 'expression')) {
				let ci = new CompletionItem("expression", CompletionItemKind.Reference);
				newlist.push(ci);
			}
			if (!newlist.some(e => e.label === 'screen')) {
				let ci = new CompletionItem("screen", CompletionItemKind.Reference);
				newlist.push(ci);
			}
			if (!newlist.some(e => e.label === 'text')) {
				let ci = new CompletionItem("text", CompletionItemKind.Reference);
				newlist.push(ci);
			}
			return newlist;
		}  else if (prefix === 'hide' || prefix === 'scene') {
			// a displayable
			return NavigationData.getDisplayableAutoComplete(false);
		} else if (prefix === 'jump' || prefix === 'call') {
			// get list of labels
			newlist.push(new CompletionItem("expression", CompletionItemKind.Keyword));
			const category = NavigationData.data.location['label'];
			for (let key in category) {
				newlist.push(new CompletionItem(key, CompletionItemKind.Value));
			}
			return newlist;
		} else if (channels.includes(prefix)) {
			// get list of audio definitions
			if (parent && parent === 'stop') {
				newlist.push(new CompletionItem("fadeout", CompletionItemKind.Keyword));
			} else {
				const category = NavigationData.data.location['define'];
				let audio = Object.keys(category).filter(key => key.startsWith('audio.'));
				for (let key of audio) {
					newlist.push(new CompletionItem(key.substr(6), CompletionItemKind.Variable));
				}
			}
			return newlist;
		} else if (prefix === 'with') {
			// get list of Transitions
			const category = NavigationData.renpyFunctions.internal;
			newlist.push(new CompletionItem("None", CompletionItemKind.Value));
			// get the Renpy default transitions and Transition classes
			let transitions = Object.keys(category).filter(key => category[key][0] === 'transitions');
			for (let key of transitions) {
				const detail = category[key][2];
				newlist.push(new CompletionItem({label:key, detail:detail}, CompletionItemKind.Value));
			}
			// get the user define transitions
			const defines = NavigationData.gameObjects['define_types'];
			let deftransitions = Object.keys(defines).filter(key => defines[key].type === 'transitions');
			for (let key of deftransitions) {
				newlist.push(new CompletionItem(key, CompletionItemKind.Value));
			}
			
		} else if (prefix === 'at') {
			// get list of Transforms
			const category = NavigationData.data.location['transform'];
			for (let key in category) {
				newlist.push(new CompletionItem(key, CompletionItemKind.Value));
			}
		} else if (prefix === 'action' || prefix === 'alternate') {
			// get list of screen Actions
			const category = NavigationData.renpyFunctions.internal;
			let transitions = Object.keys(category).filter(key => category[key][4] === 'Action');
			for (let key of transitions) {
				const detail = category[key][2];
				newlist.push(new CompletionItem({label:key, detail:detail}, CompletionItemKind.Value));
			}
		} else if (NavigationData.isClass(prefix)) {
			const className = NavigationData.isClass(prefix);
			if (className) {
				return NavigationData.getClassAutoComplete(className);
			}
		} else if (context === 'label' && characters.includes(parent)) {
			// get attributes for character if we're in the context of a label
			const category = NavigationData.gameObjects['attributes'][parent];
			if (category) {
				for (let key of category) {
					newlist.push(new CompletionItem(key, CompletionItemKind.Value));
				}
			}
		} else {
			return NavigationData.getAutoCompleteKeywords(prefix, parent, context);
		}

		return newlist;
	}

	/**
	 * Returns a list of CompletionItem objects for the given keyword
	 * @param keyword - The keyword to search
	 * @param parent - The keyword's parent keyword
	 * @param context - The context of the keyword
	 * @returns A list of CompletionItem objects
	 */
	static getAutoCompleteKeywords(keyword: string, parent: string, context: string): CompletionItem[] {
		let newlist: CompletionItem[] = [];
		let enumerations;
		if (context) {
			enumerations = NavigationData.autoCompleteKeywords[`${context}.${keyword}`];
		}
		if (!enumerations) {
			enumerations = NavigationData.autoCompleteKeywords[keyword];
		}

		if (enumerations) {
			const split = enumerations.split('|');
			for (let index in split) {
				if (split[index].startsWith('{')) {
					let gameDataKey = split[index].replace('{','').replace('}','');
					let quoted = false;
					let args = 0;
					if (gameDataKey.indexOf('!') > 0) {
						const split = gameDataKey.split('!');
						gameDataKey = split[0];
						quoted = split[1] === 'q';
						if (isNormalInteger(split[1])) {
							args = Math.floor(Number(split[1]));
						}
					}

					if (gameDataKey === 'action') {
						// get list of screen Actions
						const category = NavigationData.renpyFunctions.internal;
						let transitions = Object.keys(category).filter(key => category[key][4] === 'Action');
						if (transitions) {
							for (let key of transitions) {
								const detail = category[key][2];
								newlist.push(new CompletionItem({label:key, detail:detail}, CompletionItemKind.Value));
							}
						}
						continue;
					} else if (gameDataKey === 'function') {
						// get list of callable functions
						const callables = NavigationData.data.location['callable'];
						if (callables) {
							const filtered = Object.keys(callables).filter(key => key.indexOf('.') === -1);
							for (let key of filtered) {
								const callable = callables[key];
								const navigation = getDefinitionFromFile(callable[0], callable[1]);
								let detail = '';
								if (navigation) {
									detail = navigation.args;
									if (args > 0) {
										if (navigation.args.split(',').length !== args) {
											continue;
										}
									}
								}
								newlist.push(new CompletionItem({label:key, detail:detail}, CompletionItemKind.Function));								
							}							
						}
					} else if (gameDataKey === 'layer') {
						const layers = NavigationData.getLayerConfiguration(quoted);
						if (layers) {
							for (let key of layers) {
								newlist.push(key);
							}
						}
						continue;
					} else if (gameDataKey === 'screens') {
						// get list of screens
						const category = NavigationData.data.location['screen'];
						for (let key in category) {
							newlist.push(new CompletionItem(key, CompletionItemKind.Variable));
						}
						return newlist;
					} else if (gameDataKey === 'outlines') {
						let gameObjects = [];
						if (NavigationData.data.location[gameDataKey]) {
							gameObjects = NavigationData.data.location[gameDataKey]['array'] || [];
							if (gameObjects) {
								for (let key of gameObjects) {
									let ci = new CompletionItem(key, CompletionItemKind.Value);
									ci.sortText = '1' + key;
									newlist.push(ci);
								}
							} else {
								gameObjects = [];
							}
						}

						if (!gameObjects.includes('[(1, "#000000", 0, 0)]')) {
							newlist.push(new CompletionItem('[(1, "#000000", 0, 0)]', CompletionItemKind.Value));
						}
						if (!gameObjects.includes('[(1, "#000000", 1, 1)]')) {
							newlist.push(new CompletionItem('[(1, "#000000", 1, 1)]', CompletionItemKind.Value));
						}
						newlist.push(new CompletionItem('[(absolute(1), "#000000", absolute(1), absolute(1))]', CompletionItemKind.Value));
						newlist.push(new CompletionItem('[(size, color, xoffset, yoffset)]', CompletionItemKind.Value));
						continue;
					} else if (gameDataKey === 'displayable') {
						const display = NavigationData.getDisplayableAutoComplete(quoted);
						if (display) {
							for (let ci of display) {
								newlist.push(ci);
							}
						}
						continue;
					} else if (gameDataKey === 'audio') {
						// get defined audio variables
						const category = NavigationData.data.location['define'];
						let audio = Object.keys(category).filter(key => key.startsWith('audio.'));
						for (let key of audio) {
							key = key;
							let ci = new CompletionItem(key, CompletionItemKind.Variable);
							ci.sortText = "0" + key;
							newlist.push(ci);
						}
						// get auto detected audio variables
						const gameObjects = NavigationData.gameObjects['audio'];
						if (gameObjects) {
							for (let key in gameObjects) {
								if (!newlist.some(e => e.label === key)) {
									var obj = gameObjects[key];
									let ci: CompletionItem;
									if (obj.startsWith('"')) {
										ci = new CompletionItem(gameObjects[key], CompletionItemKind.Folder);
										ci.sortText = "2" + key;
									} else {
										ci = new CompletionItem(gameObjects[key], CompletionItemKind.Value);
										ci.sortText = "1" + key;
									}
									newlist.push(ci);
								}								
							}
						}
						continue;
					}
					
					const gameObjects = NavigationData.gameObjects[gameDataKey];
					if (gameObjects) {
						for (let key in gameObjects) {
							if (quoted) {
								key = '"' + key + '"';
							}
							let ci = new CompletionItem(key, CompletionItemKind.Value);
							ci.sortText = quoted ? '2' + key : '1' + key;
							newlist.push(ci);
						}
					} else {
						const navObjects = NavigationData.data.location[gameDataKey];
						if (navObjects) {
							for (let key in navObjects) {
								if (quoted) {
									key = '"' + key + '"';
								}
								let ci = new CompletionItem(key, CompletionItemKind.Value);
								ci.sortText = quoted ? '2' + key : '1' + key;
								newlist.push(ci);
							}
						}
					}
				} else {
					let ci = new CompletionItem(split[index], CompletionItemKind.Constant);
					ci.sortText = '0' + split[index];
					newlist.push(ci);
				}
			}
		}

		if (newlist.length === 0 && parent.length > 0) {
			return NavigationData.getAutoCompleteKeywords(`parent.${parent}`, '', '');
		}

		return newlist;
	}

	static getAudioChannels(): string[] {
		let newlist: string[] = [];
		const enumerations = NavigationData.autoCompleteKeywords['play'];
		if (enumerations) {
			const split = enumerations.split('|');
			for (let index in split) {
				if (split[index].startsWith('{')) {
					const gameDataKey = split[index].replace('{','').replace('}','');
					const gameObjects = NavigationData.gameObjects[gameDataKey];
					for (let key in gameObjects) {
						newlist.push(key);
					}
				} else {
					newlist.push(split[index]);
				}
			}
		}
		return newlist;
	}

	/**
	 * Determines if the line position is valid for completion or hover events
	 * @remarks
	 * This prevents hover/completion from triggering over keywords inside a comment or inside a string literal
	 * 
	 * @param line The current line in the TextDocument
	 * @param position The current position in the TextDocument
	 * @returns `True` if the position is valid for completion or hover events
	 */
	static positionIsCleanForCompletion(line: string, position: Position): boolean {
		const prefix = line.substr(0, position.character);	
		// ignore hover/completion if we're in a comment
		if (prefix.indexOf('#') >= 0) {
			return false;
		}

		// ignore completion if we're inside a quoted strings
		const filtered = NavigationData.filterStringLiterals(line);
		if (filtered.substr(position.character, 1) === filterCharacter) {
			return false;
		}

		return true;
	}

	static filterStringLiterals(line: string): string {
		let parsed='';
		let insideSingleQuote = false;
		let insideDoubleQuote = false;
		let insideBracket = false;
		let escaped = false;

		for (let c of line) {
			if (c === '\\') {
				if (!insideBracket && (insideSingleQuote || insideDoubleQuote)) {
					escaped = true;
					parsed += filterCharacter;
				} else {
					parsed += c;
				}
				continue;
			} else if (!escaped && c === '"') {
				if (!insideSingleQuote) {
					insideDoubleQuote = !insideDoubleQuote;
					if (!insideDoubleQuote) {
						parsed += filterCharacter;
						continue;
					}
				}
			} else if (!escaped && c === "'") {
				if (!insideDoubleQuote) {
					insideSingleQuote = !insideSingleQuote;
					if (!insideSingleQuote) {
						parsed += filterCharacter;
						continue;
					}
				}
			} else if (c === "[") {
				if (insideBracket) {
					// a second bracket
					insideBracket = false;
				} else {
					insideBracket = true;
				}
			} else if (c === "]") {
				insideBracket = false;
				parsed += c;
				continue;
			} else if (c === '#') {
				if (!insideSingleQuote && !insideDoubleQuote) {
					parsed += c;
					parsed += filterCharacter.repeat(line.length - parsed.length);
					return parsed;
				}
			}

			if (!insideBracket && (insideSingleQuote || insideDoubleQuote)) {
				parsed += filterCharacter;
			} else {
				parsed += c;
			}

			escaped = false;
		}

		return parsed;
	}

	/**
	 * Returns whether or not the given keyword is the name of a Class
	 * @param keyword - The keyword to validate
	 * @returns `True` if the keyword is a Class definition
	 */
	static isClass(keyword: string): string | undefined {
		const classes = NavigationData.data.location['class'];
		if (keyword in classes) {
			return keyword;
		} else {
			const init = keyword + ".__init__";
			const base = NavigationData.resolve(init);
			if (base && base[0].keyword.indexOf('.') > 0) {
				return base[0].keyword.split('.')[0];
			}
		}

		return;
	}

	static getClassAutoComplete(keyword: string): CompletionItem[] | undefined {
		let newlist: CompletionItem[] = [];
		const prefix = keyword + '.';

		// get the callables
		const callables = NavigationData.data.location['callable'];
		if (callables) {
			const filtered = Object.keys(callables).filter(key => key.indexOf(prefix) === 0);
			if (filtered) {
				for (let key in filtered) {
					const label = filtered[key].substr(prefix.length);
					newlist.push(new CompletionItem(label, CompletionItemKind.Method));
				}
			}
		}

		// get any properties
		const properties = NavigationData.gameObjects['properties'][keyword];
		if (properties) {
			for (let p of properties) {
				newlist.push(new CompletionItem(p.keyword, CompletionItemKind.Property));
			}
		}

		// get any fields
		const fields = NavigationData.gameObjects['fields'][keyword];
		if (fields) {
			for (let p of fields) {
				newlist.push(new CompletionItem(p.keyword, CompletionItemKind.Field));
			}
		}
		
		return newlist;
	}

	static resolve(keyword: string): Navigation[] | undefined {
		const split = keyword.split('.');
		if (split.length < 2) {
			return;
		}

		const entries = NavigationData.find(split[0]);
		if (entries && entries.length === 1) {
			const entry = entries[0];
			if (entry && entry.filename && entry.filename !== "") {
				const line = getDefinitionFromFile(entry.filename, entry.location);
				if (line) {
					const base = getBaseTypeFromDefine(keyword, line.keyword);
					if (base) {
						return NavigationData.find(`${base}.${split[1]}`);
					}
				}
			}
		}
	}

	static getClassData(location: Navigation): Navigation {
		const def = getDefinitionFromFile(location.filename, location.location);
		if (def) {
			if (!location.documentation || location.documentation.length === 0) {
				location.documentation = def.documentation;
			}

			if (!location.args || location.args.length === 0) {
				if (location.source === 'class' && def.args.length === 0) {
					const init = NavigationData.data.location['callable'][`${location.keyword}.__init__`];
					if (init) {
						const initData = getDefinitionFromFile(init[0], init[1]);
						if (initData) {
							let args = initData.args.replace('(self, ', '(');
							args = args.replace('(self)', '()');
							location.args = args;
						}
					}
				} else {
					location.args = def.args;
				}
			}
		}
		return location;
	}

	static getClassProperties(keyword: string, document: TextDocument, location: number): Navigation[] {
		// find @property attributes in the class definition
		let props: Navigation[] = [];
		const rxDef = /^def\s+(\w*).*:/;
		const filename = stripWorkspaceFromFile(document.uri.path);
		try {
			let index = location;
			let line =  document.lineAt(index - 1).text;
			const spacing = line.indexOf('class ' + keyword);
			let finished = false;
			while (!finished && index < document.lineCount) {
				let line = document.lineAt(index).text.replace('\r','');
				if (line.length > 0 && (line.length - line.trimLeft().length <= spacing)) {
					finished = true;
					break;
				}
				line = line.trim();

				const matches = line.match(rxDef);
				if (matches) {
					// if document edits moved the callables, then update the location
					let define_keyword = `${keyword}.${matches[1]}`;
					let current_def = NavigationData.data.location['callable'][define_keyword];
					if (current_def && current_def[0] === filename) {
						if (current_def[1] !== index + 1) {
							current_def[1] = index + 1;
						}
					}
				}

				if (line.startsWith('@property')) {
					const matches = document.lineAt(index + 1).text.trim().match(rxDef);
					if (matches) {
						const pyDocs = getPyDocsFromTextDocumentAtLine(document, index + 2);
						const documentation = `${pyDocs}::class ${keyword}:\n    @property\n    def ${matches[1]}(self):`;
						const nav = new Navigation('property', matches[1], filename, index + 2, documentation, "", keyword, matches.index);
						props.push(nav);
					}
					index++;
				}
				index++;
			}
			return props;
		} catch (error) {
			return props;
		}
	}

	static getClassFields(keyword: string, document: TextDocument, location: number): Navigation[] {
		// find fields in the __init__ method of the class definition
		let props: Navigation[] = [];
		if (!document || !document.lineCount) {
			return props;
		}

		const filename = stripWorkspaceFromFile(document.uri.path);
		const rxDef = /^\s*(self)\.(\w*)\s*=\s*(.*$)/;
		try {
			let index = location;
			let line =  document.lineAt(index - 1).text;
			if (!line) {
				return props;
			}

			const spacing = line.indexOf('def ');
			if (spacing < 0) {
				return props;
			}
			let finished = false;
			while (!finished && index < document.lineCount) {
				let line = document.lineAt(index).text.replace('\r','');
				if (line.length > 0 && (line.length - line.trimLeft().length <= spacing)) {
					finished = true;
					break;
				}
				line = line.trim();
				const matches = line.match(rxDef);
				if (matches) {
					const pyDocs = getPyDocsFromTextDocumentAtLine(document, index);
					const documentation = `${pyDocs}::class ${keyword}:\n    def __init__(self):\n        self.${matches[2]} = ...`;
					const nav = new Navigation('field', matches[2], filename, index + 1, documentation, "", keyword, matches.index);
					if (!props.includes(nav)) {
						props.push(nav);
					}
				}
				index++;
			}
			return props;
		} catch (error) {
			return props;
		}
	}

	static getNavigationObject(source: string, keyword: string, array: any) : Navigation {
		/*
		0 basefile,
		1 kind,
		2 args,
		3 class,
		4 type,
		5 docs
		*/

		if (typeof array[0] === 'string' && (array[0] === 'obsolete' || array[0] === 'transitions')) {
			source = array[0];
		} else if (typeof array[4] === 'string' && (array[4] === 'Action')) {
			source = array[4].toLowerCase();
		} else if (source === 'equivalent') {
			source = array[0];
		}

		return new Navigation(
			source,
			keyword,
			"", //filename
			0,  //location
			array[5], //documentation
			array[2], //args
			array[4]  //type
		);
	}

    /**
     * Scans the workspace for any supported script files and searches them for class definitions
     */
	static async scanForScriptFiles(): Promise<boolean> {
		const files = await workspace.findFiles('**/*.rpy');
		if (files && files.length > 0) {
			for (let file of files) {
				let document = await workspace.openTextDocument(file);
				const filename = stripWorkspaceFromFile(cleanUpPath(file.path));
				NavigationData.scanDocumentForClasses(filename, document);
			}
		}
		return true;
	}

    /**
     * Scans the workspace for any supported images
     */
	static async scanForImages(): Promise<boolean> {
		const files = await workspace.findFiles('**/*.{png,jpg,jpeg,webp}');
		if (files && files.length > 0) {
			for (let file of files) {
				const filename = stripWorkspaceFromFile(file.path);
				const displayable = NavigationData.getPythonName(filename);
				if (displayable) {
					const key = extractFilenameWithoutExtension(filename);
					if (key) {
						const path = stripWorkspaceFromFile(cleanUpPath(file.path));
						const displayable = new Displayable(key, 'image', '', path, -1);
						NavigationData.data.location['displayable'][key] = displayable;
					}
				}
			}
		}
		return true;
	}

	/**
     * Scans the workspace for any supported fonts
     */
	static async scanForFonts(): Promise<boolean> {
		const files = await workspace.findFiles('**/*.{ttf,otf,ttc}');
		if (files && files.length > 0) {
			for (let file of files) {
				const filename = stripWorkspaceFromFile(file.path);
				let key = filename.replace(/^(game\/)/, '');
				if (key.endsWith('.ttc')) {
					key = "0@" + key;
				}
				NavigationData.gameObjects['fonts'][key] = key;
			}
		}
		return true;
	}

	/**
     * Scans the workspace for any supported audio files
     */
	 static async scanForAudio(): Promise<boolean> {
		const files = await workspace.findFiles('**/*.{opus,ogg,mp3,wav}');
		if (files && files.length > 0) {
			for (let file of files) {
				const filename = stripWorkspaceFromFile(file.path);

				// add the path relative to the workspace/game folder
				const key = filename.replace(/^(game\/)/, '');
				NavigationData.gameObjects['audio'][key] = '"' + key + '"';

				// if this file is in the game/audio folder and can be represented
				// as a python variable, add it to the audio namespace
				if (filename.startsWith('game/audio/')) {
					const pythonName = NavigationData.getPythonName(filename);
					if (pythonName) {
						const key = "audio." + extractFilenameWithoutExtension(filename);
						if (key && !NavigationData.gameObjects['audio'][key]) {
							NavigationData.gameObjects['audio'][key] = key;
						}
					}
				}
			}
		}
		return true;
	}

    /**
     * Deletes any scanned data related to the given filename
     * @param filename - The filename for the script file
     */
	static clearScannedDataForFile(filename: string) {
		if (NavigationData.data.location === undefined) {
			NavigationData.data.location = {};
		}
		const categories = ['class','displayable','persistent','properties','fields'];
		for (let cat in categories) {
			let category = NavigationData.data.location[cat];
			for (let key in category) {
				if (category[key][0] === filename) {
					delete category[key];
				}
			}
		}
	}

    /**
     * Scans the given TextDocument looking for Ren'Py commands and definitions
     * @param filename - The filename for the script file
     * @param document - The TextDocument for the script file
     */
	static scanDocumentForClasses(filename: string, document: TextDocument) {
		const rxClass = /^\s*class\s+(\w*).*:/;
		const rxDisplayable = /^\s*(image)\s+([^=.]*)\s*[=]\s*(.+)|(layeredimage)\s+(.+):/;
		const rxChannels = /.*renpy.(audio|music).register_channel\s*\("(\w+)"(.*)\)/;
		const rxPersistent = /^\s*(default|define)\s*persistent.(\w*)\s.*=\s*(.*$)/;
		const rxDefaultDefine = /^(default|define)\s+(\w*)\s*=\s*([\w'"`\[{]*)/;
		const rxCharacters = /^\s*(define)\s*(\w*)\s*=\s*(Character|DynamicCharacter)\s*\((.*)\)/;
		const rxStatements = /.*renpy.register_statement\s*\("(\w+)"(.*)\)/;
		const rxOutlines = /[\s_]*outlines\s+(\[.*\])/;

		const internal = NavigationData.renpyFunctions.internal;
		let transitions = Object.keys(internal).filter(key => internal[key][0] === 'transitions');

		for (let i = 0; i < document.lineCount; ++i) {
			const line = document.lineAt(i).text;
			// match class definitions
			const matches = line.match(rxClass);
			if (matches) {
				const match = matches[1];
				NavigationData.data.location['class'][match] = [filename, i + 1];
				const properties = NavigationData.getClassProperties(match, document, i+1);
				if (properties) {
					NavigationData.gameObjects['properties'][match] = properties;
				}
				const initData = NavigationData.data.location['callable'][`${match}.__init__`];
				if (initData && initData[0] === stripWorkspaceFromFile(document.uri.path)) {
					const fields = NavigationData.getClassFields(match, document, initData[1]);
					if (fields) {
						NavigationData.gameObjects['fields'][match] = fields;
					}
				}
				continue;
			}
			// match displayable definitions
			const displayables = line.match(rxDisplayable);
			if (displayables) {
				let match = "";
				let image_type = "image";
				if (displayables[2]) {
					// image match
					match = displayables[2].trim();
				} else if (displayables[5]) {
					// layered image match
					match = displayables[5].trim();
					image_type = displayables[4].trim();
				}
				if (match.length > 0) {
					const displayable = new Displayable(match, image_type, displayables[3], filename, i + 1);
					NavigationData.data.location['displayable'][match] = displayable;
				}
				continue;
			}
			// match audio channels created with register_channel
			const channels = line.match(rxChannels);
			if (channels) {
				let match = channels[2];
				NavigationData.gameObjects['channels'][match] = [filename, i + 1];
				continue;
			}
			// match persistent definitions (define persistent)
			const persistents = line.match(rxPersistent);
			if (persistents) {
				let match = persistents[2];
				NavigationData.data.location['persistent'][match] = [filename, i + 1];
				continue;
			}
			// match outlines
			const outlines = line.match(rxOutlines);
			if (outlines) {
				let match = outlines[1];
				if (!NavigationData.data.location['outlines']) {
					NavigationData.data.location['outlines'] = {};
					NavigationData.data.location['outlines']['array'] = [];
				}
				let current_outlines = NavigationData.data.location['outlines']['array'];
				if (current_outlines === undefined) {
					current_outlines = [];
				}
				if (!current_outlines.includes(match)) {
					current_outlines.push(match);
				}
				NavigationData.data.location['outlines']['array'] = current_outlines;
				continue;
			}
			// match default/defines
			const defaults = line.match(rxDefaultDefine);
			if (defaults) {
				const datatype = new DataType(defaults[2], defaults[1], defaults[3]);
				datatype.checkTypeArray('transitions', transitions);
				NavigationData.gameObjects['define_types'][defaults[2]] = datatype;
			}
			// match characters
			const characters = line.match(rxCharacters);
			if (characters) {
				let char_name = '';
				let char_image = '';
				let dynamic = '';
				let split = splitParameters(characters[4], true);
				if (split) {
					char_name = stripQuotes(split[0]);
					char_image = getNamedParameter(split, 'image');
					dynamic = getNamedParameter(split, 'dynamic');
				}
				if (characters[3] === 'DynamicCharacter') {
					dynamic = 'True';
				}
				else if (!dynamic || dynamic.length === 0) {
					dynamic = 'False';
				}

				var chr_object = new Character(char_name, char_image, dynamic, split, filename, i);
				NavigationData.gameObjects['characters'][characters[2]] = chr_object;
				continue;
			}

			// creator defined statements
			const statements = line.match(rxStatements);
			if (statements) {
				const statement_name = statements[1];
				const statement_args = splitParameters(statements[1] + statements[2], true);
				let statement_docs = '';
				const execute = getNamedParameter(statement_args, 'execute');
				if (execute && execute.length > 0) {
					let entries = NavigationData.find(execute);
					if (entries) {
						const def = getDefinitionFromFile(entries[0].filename, entries[0].location);
						if (def) {
							statement_docs = def.documentation;
						}
					}
				}

				const statement = new Navigation('statement', statement_name, filename, i + 1, statement_docs, "", "cds", statements.index);
				NavigationData.data.location['statement'][statement_name] = statement;
				continue;
			}
		}
	}

	static async getCharacterImageAttributes() {
		//console.log("getCharacterImageAttributes");
		const characters = NavigationData.gameObjects['characters'];
		const displayables = NavigationData.data.location['displayable'];
		for (let key in characters) {
			const char = characters[key];
			let attributes: string[] = [];
			if (char && char.image && char.image.length > 0) {
				const displayable = displayables[char.image];
				if (displayable) {
					// find layered image attributes
					if (displayable.image_type === 'layeredimage') {
						const li_attributes = await NavigationData.getLayeredImageAttributes(displayable.name, displayable.filename, displayable.location);
						if (li_attributes) {
							for (let attr of li_attributes) {
								if (!attributes.includes(attr)) {
									attributes.push(attr);
								}
							}
						}
					}
					// find defined image attributes
					const filtered = Object.keys(displayables).filter(key => displayables[key].tag === char.image);
					if (filtered) {
						for (let key of filtered) {
							if (key !== char.image) {
								const attr = key.substr(char.image.length + 1);
								if (!attributes.includes(attr)) {
									attributes.push(attr);
								}
							}
						}
					}
				}
				NavigationData.gameObjects['attributes'][key] = attributes;
			}
		}
	}

	static async getLayeredImageAttributes(keyword: string, filename: string, location: number): Promise<string[]> {
		// find attributes in the layered image definition
		const displayables = NavigationData.data.location['displayable'];
		const path = getFileWithPath(filename);
		let document = await workspace.openTextDocument(path);
		let attributes: string[] = [];
		const rxAttr = /^\s*attribute\s+(\w*)/;
		try {
			let index = location;
			let line =  document.lineAt(index - 1).text;
			const spacing = line.indexOf('layeredimage ' + keyword);
			let finished = false;
			while (!finished && index < document.lineCount) {
				let line = document.lineAt(index).text.replace('\r','');
				if (line.length > 0 && (line.length - line.trimLeft().length <= spacing)) {
					finished = true;
					break;
				}
				line = line.trim();
				if (line.startsWith('attribute')) {
					// specific attribute
					const match = line.match(rxAttr);
					if (match) {
						if (!attributes.includes(match[1])) {
							attributes.push(match[1]);
						}
					}
				} else if (line.startsWith('group') && line.indexOf('auto') > 0) {
					// auto attributes
					const match = line.match(/^\s*group\s+(\w*)/);
					if (match) {
						const image_key = `${keyword}_${match[1]}_`;
						const filtered = Object.keys(displayables).filter(key => key.startsWith(image_key));
						if (filtered) {
							for (let d of filtered) {
								if (d !== image_key) {
									const attr = d.substr(image_key.length);
									if (attr.indexOf('_') > 0) {
										const split = attr.split('_');
										if (!attributes.includes(split[0])) {
											attributes.push(split[0]);
										}
									} else {
										if (!attributes.includes(attr)) {
											attributes.push(attr);
										}
									}
								}
							}
						}

					}
				}
				index++;
			}
			return attributes;
		} catch (error) {
			return attributes;
		}
	}

    /**
     * Returns whether or not the given filename can be represented as a Python variable
     * @param filename - The filename
     * @returns True if the filename can be represented as a Python variable
     */
	static getPythonName(filename: string): boolean | undefined {
		const rx = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
		let fn_only = extractFilenameWithoutExtension(filename) || '';
		const split = fn_only.split(' ');
		for (let i=0; i<split.length; i++) {
			const match = split[i].match(rx);
			if (!match || match.length === 0) {
				return false;
			}
		}

		return true;
	}

    /**
     * Returns an array containing the `config.layer` definitions
     * @remarks
     * This method looks for a user configured `define config.layers` definition, or else it returns the default config.layers definition
     * 
     * @returns The config.layer configuration as string[] (e.g, `[ 'master', 'transient', 'screens', 'overlay']`)
     */
	static getLayerConfiguration(quoted: boolean = false): CompletionItem[] | undefined {
		let newlist: CompletionItem[] = [];
		const layers = NavigationData.find("config.layers");
		if (layers) {
			for (let layer of layers) {
				if (layer.args) {
					const args = layer.args.replace(/ /g,'').replace(/'/g,'"').replace('=','').trim();
					const default_layers = JSON.parse(args);
					if (default_layers) {
						for (let l of default_layers) {
							if (quoted) {
								l = '"' + l + '"';
							}
							newlist.push(new CompletionItem(l, CompletionItemKind.Variable));
						}
						return newlist;
					}
				} else {
					const docs = getDefinitionFromFile(layer.filename, layer.location);
					const args = docs?.keyword.replace(/ /g,'').replace(/'/g,'"').replace('defineconfig.layers=', '');
					if (args) {
						const user_layers = JSON.parse(args);
						for (let l of user_layers) {
							if (quoted) {
								l = '"' + l + '"';
							}
							newlist.push(new CompletionItem(l, CompletionItemKind.Variable));
						}
						return newlist;
					}
				}
			}
		}
		return;
	}
}

export class Character {
	name: string;
	image: string;
	resolved_name: string;
	dynamic: boolean;
	arguments: string[];
	filename: string;
	location: number;

	constructor(name: string, image: string, dynamic: string, args: string[], filename: string, location: number) {
		this.name = name;
		this.image = image;
		this.dynamic = dynamic === 'True';
		this.arguments = args;
		this.filename = filename;
		this.location = location;

		if (!this.dynamic) {
			this.resolved_name = name;
		} else {
			this.resolved_name = name;
			const resolved = NavigationData.data.location['define'][name];
			if (resolved) {
				const def = getDefinitionFromFile(resolved[0], resolved[1]);
				if (def) {
					const split = def.keyword.split('=');
					if (split && split.length === 2) {
						this.resolved_name = split[1].trim();
					}
				}
			}
		}
	}
}

export class Displayable {
	name: string;
	tag: string;
	image_type: string;
	definition: string;
	filename: string;
	location: number;

	constructor(name: string, image_type: string, definition: string, filename: string, location: number) {
		this.name = name;
		this.image_type = image_type;
		this.definition = definition;
		this.filename = filename;
		this.location = location;
		if (name.indexOf(' ') > 0) {
			this.tag = name.split(' ')[0];
		} else {
			this.tag = name;
		}
	}
}

function isNormalInteger(str: string) {
    var n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}