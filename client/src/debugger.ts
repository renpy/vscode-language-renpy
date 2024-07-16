import * as vscode from "vscode";
import { DebugSession, TerminatedEvent } from "@vscode/debugadapter";
import { getWorkspaceFolder } from "./workspace";
import { Configuration } from "./configuration";
import { logToast } from "./logger";
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
        return new vscode.DebugAdapterInlineImplementation(new RenpyDebugSession(session.configuration.command, session.configuration.args));
    }
}

class RenpyDebugSession extends DebugSession {
    private command = "run";
    private args?: string[];

    public constructor(command: string, args?: string[]) {
        super();
        this.command = command;
        if (args) {
            this.args = args;
        }
    }

    protected override initializeRequest(): void {
        const terminal = getTerminal("Ren'py Debug");
        terminal.show();
        let program = Configuration.getRenpyExecutablePath();

        if (!isValidExecutable(program)) {
            logToast(vscode.LogLevel.Error, "Ren'Py executable location not configured or is invalid.");
            return;
        }

        program += " " + getWorkspaceFolder();
        if (this.command) {
            program += " " + this.command;
        }
        if (this.args) {
            program += " " + this.args.join(" ");
        }
        terminal.sendText(program);
        this.sendEvent(new TerminatedEvent());
    }
}

export class RenpyConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): vscode.ProviderResult<vscode.DebugConfiguration> {
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === "renpy") {
                config.type = "renpy";
                config.request = "launch";
                config.name = "Ren'Py: Launch";
                config.command = "run";
                config.args = [];
            }
        }
        return config;
    }
}
