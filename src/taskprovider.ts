import * as vscode from "vscode";

interface RenpyTaskDefinition extends vscode.TaskDefinition {
    program: string;
    command: string;
    args?: string[];
}

export class RenpyTaskProvider implements vscode.TaskProvider {
    private tasks: vscode.Task[] | undefined;

    public async provideTasks(): Promise<vscode.Task[]> {
        return await this.getTasks();
    }

    public resolveTask(task: vscode.Task): vscode.Task | undefined {
        const program: string = task.definition.program;
        const command: string = task.definition.command;
        if (program === "${config:renpy.renpyExecutableLocation} ${workspaceFolder}" && command) {
            const definition: RenpyTaskDefinition = <RenpyTaskDefinition>task.definition;
            return this.getTask(definition);
        }
        return undefined;
    }

    private getTasks(): vscode.Task[] {
        if (this.tasks !== undefined) {
            return this.tasks;
        }
        this.tasks = [];
        this.tasks.push(this.getTask({ type: "renpy", program: "${config:renpy.renpyExecutableLocation} ${workspaceFolder}", command: "compile" }));
        this.tasks.push(this.getTask({ type: "renpy", program: "${config:renpy.renpyExecutableLocation} ${workspaceFolder}", command: "dialogue", args: ["None"] }));
        this.tasks.push(this.getTask({ type: "renpy", program: "${config:renpy.renpyExecutableLocation} ${workspaceFolder}", command: "lint", args: ["lint.txt"] }));
        this.tasks.push(this.getTask({ type: "renpy", program: "${config:renpy.renpyExecutableLocation} ${workspaceFolder}", command: "rmpersistent" }));
        return this.tasks;
    }

    private getTask(definition: RenpyTaskDefinition): vscode.Task {
        let commandLine = definition.program + " " + definition.command;
        if (definition.args) {
            commandLine += " " + definition.args.join(" ");
        }
        return new vscode.Task(definition, vscode.TaskScope.Workspace, definition.command, "renpy", new vscode.ShellExecution(commandLine));
    }
}
