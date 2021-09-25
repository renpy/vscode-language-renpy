// Workspace and file functions
'use strict';

import { Location, Position, TextDocument, workspace } from "vscode";
import * as fs from 'fs';
import { NavigationData } from "./navigationdata";

/**
 * Returns the filename.extension for the given fully qualified path 
 * @param str - The full path and filename of the file 
 * @returns The filename.ext of the filepath
 */
export function extractFilename(str: string) {
	if (str) {
		str = str.replace(/\\/g, '/');
		return str.split('/').pop();
	}
	return null;
}

/**
 * Returns the filename without the path and extension for the given fully qualified path 
 * @param str - The full path and filename of the file 
 * @returns The filename of the filepath
 */
export function extractFilenameWithoutExtension(str: string) {
	if (str) {
		str = str.replace(/\\/g, '/');
		let filename = str.split('/').pop();
		if (filename) {
			return filename.replace(/\.[^/.]+$/, '');
		}
	}
	return null;
}

/**
 * Strips the workspace path from the file, leaving the path relative to the workspace plus filename (e.g., `game/script.rpy`)
 * @param str - The full path and filename of the file 
 * @returns The filename of the filepath (e.g., `game/script.rpy`)
 */
export function stripWorkspaceFromFile(str: string) {
	const wf = getWorkspaceFolder();

	let filename = cleanUpPath(str);
	if (filename.toLowerCase().startsWith(wf.toLowerCase())) {
		filename = filename.substr(wf.length + 1);
	}

	while (filename.startsWith('/')) {
		filename = filename.substr(1);
	}
	return filename;
}

/**
 * Gets the workspace folder path (i.e., the Ren'Py base folder)
 * @returns The path of the workspace (i.e., the Ren'Py base folder)
 */
export function getWorkspaceFolder() {
	if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
		let wf = workspace.workspaceFolders[0].uri.path;
		wf = cleanUpPath(wf);
		return wf;
	}
	return "";
}

/**
 * Gets the full path and filename of the file with invalid characters removed
 * @remarks
 * This removes the leading `/` character that appears before the path on Windows systems (e.g., `/c:/user/Documents/renpy/game/script.rpy`)
 * @param path - The full path and filename of the file 
 * @returns The full path and filename of the file with invalid characters removed
 */
export function cleanUpPath(path: string): string {
	if (path.startsWith('/') && path.substr(2, 2) === ":/") {
		// windows is reporting the path as "/c:/xxx"
		path = path.substr(1);
	}
	return path;
}

/**
 * Returns the filename path including the workspace folder
 * @param filename - The filename
 * @returns The filename path including the workspace folder
 */
export function getFileWithPath(filename: string) {
	let wf = getWorkspaceFolder();
	if (wf && wf.length > 0) {
		if (filename.startsWith(wf)) {
			return filename;
		}
		let path = wf + '/game/' + filename;
		if (!fs.existsSync(path)) {
			path = wf + '/' + filename;
		}
		return path;
	} else {
		return filename;
	}
}

export function findReferenceMatches(keyword: string, document: TextDocument): Location[] {
	let locations: Location[] = [];
	const rx = RegExp(`[^a-zA-Z_](${keyword.replace('.','/.')})[^a-zA-Z_]`, 'g');

	let index = 0;
	while (index < document.lineCount) {
		let line = NavigationData.filterStringLiterals(document.lineAt(index).text);
		let matches = rx.exec(line);
		if (matches) {
			let position = new Position(index, matches.index);
			const loc = new Location(document.uri, position);
			locations.push(loc);
		}
		index++;
	}

	return locations;
}