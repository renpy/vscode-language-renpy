// Workspace and file functions
"use strict";

import * as fs from "fs";
import { workspace } from "vscode";

/**
 * Extracts the filename (including extension) from a file path.
 * @param pathStr The full file system path.
 * @returns The filename with its extension.
 * @example
 * ```ts
 * extractFilename("/foo/bar/baz.txt"); // "baz.txt"
 * ```
 */
export function extractFilename(str: string) {
    if (str) {
        const normalizedStr = str.replace(/\\/g, "/");
        return normalizedStr.split("/").pop();
    }
    return null;
}

/**
 * Extracts the filename without its extension from a file path.
 * @param pathStr The full file system path.
 * @returns The filename without its extension.
 * @example
 * ```ts
 * extractFilenameWithoutExtension("/foo/bar/baz.txt"); // "baz"
 * ```
 */
export function extractFilenameWithoutExtension(str: string) {
    if (str) {
        const normalizedStr = str.replace(/\\/g, "/");
        const filename = normalizedStr.split("/").pop();
        if (filename) {
            // Handle dotfiles
            if (filename.startsWith(".") && filename.indexOf(".", 1) === -1) {
                return filename;
            }
            return filename.replace(/\.[^/.]+$/, "");
        }
    }
    return null;
}

/**
 * Computes a path relative to the workspace folder.
 * @param pathStr The absolute or relative path to convert.
 * @returns The path relative to the workspace root.
 * @example
 * ```ts
 * stripWorkspaceFromFile("/C:/ws/game/script.rpy"); // "game/script.rpy"
 * ```
 */
export function stripWorkspaceFromFile(str: string) {
    const wf = getWorkspaceFolder();

    let filename = cleanUpPath(str);
    if (filename.toLowerCase().startsWith(wf.toLowerCase())) {
        filename = filename.substring(wf.length + 1);
    }

    while (filename.startsWith("/")) {
        filename = filename.substring(1);
    }
    return filename;
}

/**
 * Retrieves the root path of the first VSCode workspace folder.
 * @returns The cleaned workspace folder path, or an empty string if none is open.
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
 * Removes a leading slash from a Windows drive-letter path.
 * @param pathStr The path string to normalize.
 * @returns The normalized path without a leading slash on Windows drives.
 * @example
 * ```ts
 * cleanUpPath("/C:/projects"); // "C:/projects"
 * ```
 */
export function cleanUpPath(path: string): string {
    if (path.startsWith("/") && path.startsWith(":/", 2)) {
        // windows is reporting the path as "/c:/xxx"
        return path.substring(1);
    }
    return path;
}

/**
 * Resolves a project-relative path to an absolute filesystem path.
 * Searches in `game/` first, then the workspace root.
 * @param relativePath The path relative to the project root or `game` subfolder.
 * @returns The absolute path, or `""` if `relativePath` is empty.
 * @throws `Error` if the file cannot be found.
 * @example
 * ```ts
 * getFileWithPath("script.rpy"); // e.g. "C:/ws/game/script.rpy"
 * ```
 */
export function getFileWithPath(filename: string) {
    const wf = getWorkspaceFolder();
    if (wf && wf.length > 0) {
        if (filename.startsWith(wf)) {
            return filename;
        }
        let path = wf + "/game/" + filename;
        if (!fs.existsSync(path)) {
            path = wf + "/" + filename;
        }
        return path;
    } else {
        return filename;
    }
}

/**
 * Returns the path to the images folder in the project.
 * Prefers `game/images`, otherwise falls back to `images` at the workspace root.
 * @returns The existing images folder path.
 */
export function getImagesFolder() {
    const workspaceFolder = getWorkspaceFolder();
    let path = workspaceFolder + "/game/images";
    if (!fs.existsSync(path)) {
        path = workspaceFolder + "/images";
    }
    return path;
}

/**
 * Returns the path to the audio folder in the project.
 * Prefers `game/audio`, otherwise falls back to `audio` at the workspace root.
 * @returns The existing audio folder path.
 */
export function getAudioFolder() {
    const workspaceFolder = getWorkspaceFolder();
    let path = workspaceFolder + "/game/audio";
    if (!fs.existsSync(path)) {
        path = workspaceFolder + "/audio";
    }
    return path;
}

/**
 * Gets the absolute path for the `saves/navigation.json` file.
 * @returns The absolute path to `saves/navigation.json` in the project.
 */
export function getNavigationJsonFilepath() {
    const filename = "saves/navigation.json";
    const filepath = getFileWithPath(filename);
    return filepath;
}
