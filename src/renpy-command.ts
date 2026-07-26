import * as fs from "fs";
import * as path from "path";

const MAX_PARENT_LOOKUP = 6;

export interface RenpySpawnConfiguration {
    command: string;
    args: string[];
    cwd?: string;
}

function splitCommandLine(commandLine: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quoteChar: string | null = null;

    for (let i = 0; i < commandLine.length; i++) {
        const char = commandLine[i];

        if ((char === '"' || char === "'") && quoteChar == null) {
            quoteChar = char;
            continue;
        }

        if (char === quoteChar) {
            quoteChar = null;
            continue;
        }

        if (/\s/.test(char) && quoteChar == null) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
            continue;
        }

        current += char;
    }

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
}

function isPathLike(command: string): boolean {
    return path.isAbsolute(command) || command.includes("/") || command.includes("\\");
}

function resolveWorkingDirectory(command: string, preArgs: string[]): string | undefined {
    if (!path.isAbsolute(command)) {
        return undefined;
    }

    const commandDir = path.dirname(command);
    const firstArg = preArgs[0];
    if (!firstArg || path.isAbsolute(firstArg) || !firstArg.toLowerCase().endsWith(".py")) {
        return commandDir;
    }

    let current = commandDir;
    for (let i = 0; i < MAX_PARENT_LOOKUP; ++i) {
        if (fs.existsSync(path.join(current, firstArg))) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }

    return commandDir;
}

export function buildRenpySpawnConfiguration(executableOverride: string, args: string[]): RenpySpawnConfiguration | null {
    const tokens = splitCommandLine(executableOverride.trim());
    if (tokens.length === 0) {
        return null;
    }

    const command = tokens[0];
    const preArgs = tokens.slice(1);
    const cwd = resolveWorkingDirectory(command, preArgs);

    const config: RenpySpawnConfiguration = {
        command,
        args: [...preArgs, ...args],
    };

    if (cwd !== undefined) {
        config.cwd = cwd;
    }

    return config;
}

export function isValidExecutable(executableOverride: string): boolean {
    const spawnConfig = buildRenpySpawnConfiguration(executableOverride, []);
    if (spawnConfig == null || spawnConfig.command.length === 0) {
        return false;
    }

    if (!isPathLike(spawnConfig.command)) {
        // Allow commands resolved by PATH, like "python".
        return true;
    }

    return fs.existsSync(spawnConfig.command);
}
