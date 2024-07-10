/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ExtensionContext, StatusBarAlignment, window, LogLevel, ExtensionMode } from "vscode";

const outputChannel = window.createOutputChannel("Ren'Py Language Extension", { log: true });
const statusBar = window.createStatusBarItem(StatusBarAlignment.Right, 100);

let extensionMode: ExtensionMode = null!;

export function initializeLoggingSystems(context: ExtensionContext) {
    extensionMode = context.extensionMode;

    context.subscriptions.push(outputChannel);

    outputChannel.clear();

    statusBar.name = "Ren'Py Language Extension Status";
    statusBar.tooltip = "Ren'Py Language Extension Status";
    context.subscriptions.push(statusBar);
}

export function updateStatusBar(text: string) {
    if (text === "") {
        statusBar.hide();
        return;
    }

    logCatMessage(LogLevel.Info, LogCategory.Status, text);
    statusBar.text = text;
    statusBar.show();
}

// eslint-disable-next-line no-shadow
export const enum LogCategory {
    Default,
    Status,
    Parser,
    Tokenizer,
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

export function logMessage(level: LogLevel, message: string): void {
    logCatMessage(level, LogCategory.Default, message);
}

export function logCatMessage(level: LogLevel, category: LogCategory, message: string): void {
    const outputMsg = `${getLogCategoryPrefix(category)} > ${message}`;

    switch (level) {
        case LogLevel.Trace:
            outputChannel.trace(outputMsg);
            break;
        case LogLevel.Debug:
            outputChannel.debug(outputMsg);
            break;
        case LogLevel.Info:
            outputChannel.info(outputMsg);
            break;
        case LogLevel.Warning:
            outputChannel.warn(outputMsg);
            break;
        case LogLevel.Error:
            outputChannel.error(outputMsg);
            break;
    }

    debugLog(level, outputMsg);
}

function debugLog(level: LogLevel, message: string) {
    if (extensionMode !== ExtensionMode.Development) {
        return;
    }

    switch (level) {
        case LogLevel.Trace:
            console.trace(message);
            break;
        case LogLevel.Debug:
            console.debug(message);
            break;
        case LogLevel.Info:
            console.info(message);
            break;
        case LogLevel.Warning:
            console.warn(message);
            break;
        case LogLevel.Error:
            console.error(message);
            break;
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
