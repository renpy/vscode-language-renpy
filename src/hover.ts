// Hover Provider
'use strict';

import { Hover, MarkdownString, Position, Range, TextDocument, Uri } from "vscode";
import { getKeywordPrefix } from "./extension";
import { rangeAsString, Navigation, getPyDocsAtLine, formatDocumentationAsMarkdown } from "./navigation";
import { NavigationData } from "./navigationdata";
import { stripWorkspaceFromFile, extractFilename, getFileWithPath } from "./workspace";
import * as fs from 'fs';

export function getHover(document: TextDocument, position: Position): Hover | null | undefined {
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

    const locations = NavigationData.getNavigationDumpEntries(word);
    if (locations) {
        let contents = getHoverMarkdownString(locations);
        return new Hover(contents);
    }

    return undefined;
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
				contents.appendMarkdown(split[0]);
				contents.appendMarkdown('\n\n---\n\n');
				contents.appendCodeblock(split[1]);
			} else if (location.type === 'store') {
				contents.appendCodeblock(split[0]);
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
			docs = getPyDocsAtLine(lines, line - 1);

			let args = "";
			if (text.indexOf('(') > 0) {
				args = text.substring(text.indexOf('('));
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

