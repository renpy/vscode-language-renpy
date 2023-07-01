import * as vscode from "vscode";
import { DebugSession, TerminatedEvent } from "@vscode/debugadapter";
import { getWorkspaceFolder } from "./workspace";
import { Configuration } from "./configuration";
import { LogLevel, logToast } from "./logger";
import { isValidExecutable } from "./extension";

function getTerminal(name: string): vscode.Terminal {
    let i: number;
    for (i = 0; i < vscode.window.terminals.length; i++) {
        if (vscode.window.terminals[i].name === name) {
            return vscode.window.terminals[i];
        }
    }
    return vscode.window.createTerminal(name);
}

export class RenpyAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        const terminal = getTerminal("Ren'py Debug");
        terminal.show();
        let program = Configuration.getRenpyExecutablePath();

        if (!isValidExecutable(program)) {
            logToast(LogLevel.Error, "Ren'Py executable location not configured or is invalid.");
            return;
        }

        program += " " + getWorkspaceFolder();
        if (session.configuration.command) {
            program += " " + session.configuration.command;
        }
        if (session.configuration.args) {
            program += " " + session.configuration.args.join(" ");
        }
        terminal.sendText(program);
        return new vscode.DebugAdapterInlineImplementation(new RenpyDebugSession());
    }
}

class RenpyDebugSession extends DebugSession {
    protected override initializeRequest(): void {
        this.sendEvent(new TerminatedEvent());
    }
}
