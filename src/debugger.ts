import * as vscode from "vscode";
import { DebugSession, ExitedEvent, InitializedEvent, TerminatedEvent } from "@vscode/debugadapter";
import { ExecuteRunpyRun } from "./extension";
import { DebugProtocol } from "@vscode/debugprotocol";
import { logMessage } from "./logger";
import { ChildProcessWithoutNullStreams } from "child_process";

export class RenpyAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new RenpyDebugSession());
    }
}

class RenpyDebugSession extends DebugSession {
    childProcess: ChildProcessWithoutNullStreams | null = null;

    protected override initializeRequest(response: DebugProtocol.InitializeResponse): void {
        this.sendEvent(new InitializedEvent());

        response.body = { supportTerminateDebuggee: true };

        const childProcess = ExecuteRunpyRun();
        if (childProcess === null) {
            logMessage(vscode.LogLevel.Error, "Ren'Py executable location not configured or is invalid.");
            return;
        }
        this.childProcess = childProcess;

        childProcess
            .addListener("spawn", () => {
                const processEvent: DebugProtocol.ProcessEvent = {
                    event: "process",
                    body: {
                        name: "Ren'Py",
                        isLocalProcess: true,
                        startMethod: "launch",
                    },
                    seq: 0,
                    type: "event",
                };
                if (childProcess.pid !== undefined) {
                    processEvent.body.systemProcessId = childProcess.pid;
                }
                this.sendEvent(processEvent);
                this.sendResponse(response);
            })
            .addListener("exit", (code) => {
                this.sendEvent(new ExitedEvent(code ?? 1));
                this.sendEvent(new TerminatedEvent());
            });
        childProcess.stdout.on("data", (data) => {
            logMessage(vscode.LogLevel.Info, `Ren'Py stdout: ${data}`);
        });
        childProcess.stderr.on("data", (data) => {
            logMessage(vscode.LogLevel.Error, `Ren'Py stderr: ${data}`);
        });
    }

    protected override terminateRequest(): void {
        this.terminate();
    }

    protected override disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        if (args.terminateDebuggee) {
            this.terminate();
        } else {
            this.disconnect();
            this.sendEvent(new TerminatedEvent());
        }
    }

    private terminate() {
        if (this.childProcess === null) {
            return;
        }
        this.childProcess.kill();
        this.childProcess = null;
    }

    private disconnect() {
        if (this.childProcess === null) {
            return;
        }
        this.childProcess.disconnect();
        this.childProcess = null;
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
            }
        }
        return config;
    }
}
