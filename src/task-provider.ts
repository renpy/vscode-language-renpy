import * as vscode from "vscode";

import { Configuration } from "./configuration";
import { getWorkspaceFolder } from "./workspace";

interface RenpyTaskDefinition extends vscode.TaskDefinition {
    command: string;
    args?: string[];
}

export class RenpyTaskProvider implements vscode.TaskProvider {
    private tasks: vscode.Task[] | undefined;

    public async provideTasks(): Promise<vscode.Task[]> {
        return await this.getTasks();
    }

    public resolveTask(task: vscode.Task): vscode.Task | undefined {
        const command: string = task.definition.command;
        if (command) {
            const definition: RenpyTaskDefinition = <RenpyTaskDefinition>task.definition;
            return this.getTask(definition);
        }
        return undefined;
    }

    private getTasks(): vscode.Task[] {
        if (this.tasks != null) {
            return this.tasks;
        }
        this.tasks = [];
        this.tasks.push(this.getTask({ type: "renpy", command: "compile" }));
        this.tasks.push(this.getTask({ type: "renpy", command: "dialogue", args: ["None"] }));
        this.tasks.push(this.getTask({ type: "renpy", command: "lint", args: ["lint.txt"] }));
        this.tasks.push(this.getTask({ type: "renpy", command: "rmpersistent" }));
        return this.tasks;
    }

    private getTask(definition: RenpyTaskDefinition): vscode.Task {
        let commandLine = Configuration.getRenpyExecutablePath() + " " + getWorkspaceFolder() + " " + definition.command;
        if (definition.args) {
            commandLine += " " + definition.args.join(" ");
        }
        return new vscode.Task(definition, vscode.TaskScope.Workspace, definition.command, "renpy", new vscode.ShellExecution(commandLine));
    }
}
