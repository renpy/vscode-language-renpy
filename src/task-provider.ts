import * as vscode from "vscode";

import { getWorkspaceFolder } from "src/utilities";

import { Configuration } from "./configuration";
import { logToast } from "./logger";

interface RenpyTaskDefinition extends vscode.TaskDefinition {
    command: string;
    args?: string[];
}

/** The error shown when a task runs without `renpy.renpyExecutableLocation` set. */
const MISSING_EXECUTABLE_MESSAGE = "Ren'Py executable location not configured. Set renpy.renpyExecutableLocation to run Ren'Py tasks.";

/**
 * Provides the `renpy` task type: tasks that run the configured Ren'Py executable on the workspace folder.
 *
 * Tasks are rebuilt on every request so they always use the current executable setting. When no executable is
 * configured, the tasks are still offered, but running one reports the missing setting instead of starting a shell.
 */
export class RenpyTaskProvider implements vscode.TaskProvider {
    public provideTasks(): vscode.Task[] {
        return this.getTasks();
    }

    public resolveTask(task: vscode.Task): vscode.Task | undefined {
        const command: string = task.definition.command;
        if (command) {
            const definition: RenpyTaskDefinition = <RenpyTaskDefinition>task.definition;
            return this.getTask(definition);
        }
        return undefined;
    }

    /** Builds the predefined Ren'Py tasks shown in the Run Task list. */
    private getTasks(): vscode.Task[] {
        return [
            this.getTask({ type: "renpy", command: "compile" }),
            this.getTask({ type: "renpy", command: "dialogue", args: ["None"] }),
            this.getTask({ type: "renpy", command: "lint", args: ["lint.txt"] }),
            this.getTask({ type: "renpy", command: "rmpersistent" }),
        ];
    }

    /** Builds a task that runs Ren'Py with the definition's command and arguments, or reports a missing executable. */
    private getTask(definition: RenpyTaskDefinition): vscode.Task {
        const executable = Configuration.getRenpyExecutablePath();

        let execution: vscode.ShellExecution | vscode.CustomExecution;
        if (executable) {
            const args: string[] = [getWorkspaceFolder(), definition.command];

            if (definition.args) {
                args.push(...definition.args);
            }

            execution = new vscode.ShellExecution({ value: executable, quoting: vscode.ShellQuoting.Strong }, args);
        } else {
            execution = new vscode.CustomExecution(() => Promise.resolve(createMissingExecutableTerminal()));
        }

        return new vscode.Task(definition, vscode.TaskScope.Workspace, definition.command, "renpy", execution);
    }
}

/**
 * Creates a task terminal that explains that the Ren'Py executable isn't configured, shows the same message as an error
 * notification, and then closes with a failing exit code.
 */
function createMissingExecutableTerminal(): vscode.Pseudoterminal {
    const writeEmitter = new vscode.EventEmitter<string>();
    const closeEmitter = new vscode.EventEmitter<number>();

    return {
        onDidWrite: writeEmitter.event,
        onDidClose: closeEmitter.event,
        open: () => {
            writeEmitter.fire(MISSING_EXECUTABLE_MESSAGE + "\r\n");
            logToast(vscode.LogLevel.Error, MISSING_EXECUTABLE_MESSAGE);
            closeEmitter.fire(1);
        },
        close: () => {
            writeEmitter.dispose();
            closeEmitter.dispose();
        },
    };
}
