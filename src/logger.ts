import { window } from "vscode";

const outputChannel = window.createOutputChannel("Ren'Py Language Extension", "renpy-log");

// eslint-disable-next-line no-shadow
export const enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

// eslint-disable-next-line no-shadow
export const enum LogCategory {
    Default,
    Status,
    Parser,
    Tokenizer,
}

function getLogLevelPrefix(level: LogLevel): string {
    switch (level) {
        case LogLevel.Debug:
            return "[Debug]";
        case LogLevel.Info:
            return "[Info]";
        case LogLevel.Warning:
            return "[Warning]";
        case LogLevel.Error:
            return "[Error]";
    }
}

function getLogCategoryPrefix(category: LogCategory): string {
    switch (category) {
        case LogCategory.Default:
            return "[Default]";
        case LogCategory.Status:
            return "[Status]";
        case LogCategory.Parser:
            return "[Parser]";
        case LogCategory.Tokenizer:
            return "[Tokenizer]";
    }
}

export function logMessage(level: LogLevel, message: string, developersOnly = false): void {
    logCatMessage(level, LogCategory.Default, message, developersOnly);
}

export function logCatMessage(level: LogLevel, category: LogCategory, message: string, developersOnly = false): void {
    const outputMsg = `${getLogLevelPrefix(level)} ${getLogCategoryPrefix(category)} > ${message}`;

    switch (level) {
        case LogLevel.Debug:
            console.debug(outputMsg);
            break;
        case LogLevel.Info:
            console.log(outputMsg);
            break;
        case LogLevel.Warning:
            console.warn(outputMsg);
            break;
        case LogLevel.Error:
            console.error(outputMsg);
            break;
    }

    if (!developersOnly && level >= LogLevel.Info) {
        outputChannel.appendLine(outputMsg);
    }
}

export function logToast(level: LogLevel, message: string): void {
    logMessage(level, message);

    switch (level) {
        case LogLevel.Debug:
        case LogLevel.Info:
            window.showInformationMessage(message);
            break;
        case LogLevel.Warning:
            window.showWarningMessage(message);
            break;
        case LogLevel.Error:
            window.showErrorMessage(message);
            break;
    }
}
