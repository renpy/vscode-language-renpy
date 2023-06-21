import { ConfigurationTarget, ExtensionContext, WorkspaceConfiguration, workspace } from "vscode";

export class Configuration {
    public static initialize(context: ExtensionContext) {
        // hide rpyc files if the setting is enabled
        const config = workspace.getConfiguration("renpy");
        if (config?.excludeCompiledFilesFromWorkspace) {
            this.excludeCompiledFilesConfig();
        }

        // Listen to configuration changes
        context.subscriptions.push(
            workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration("renpy.excludeCompiledFilesFromWorkspace")) {
                    if (workspace.getConfiguration("renpy").get("excludeCompiledFilesFromWorkspace")) {
                        this.excludeCompiledFilesConfig();
                    }
                }
            })
        );
    }

    public static isAutoSaveDisabled(): boolean {
        const config = workspace.getConfiguration("files");
        const autoSave = config.get<string>("autoSave");
        return autoSave === "off";
    }

    public static compileOnDocumentSave(): boolean {
        const config = workspace.getConfiguration("renpy");
        return config.get<boolean>("compileOnDocumentSave") === true;
    }

    public static shouldWatchFoldersForChanges(): boolean {
        const config = workspace.getConfiguration("renpy");
        return config.get<boolean>("watchFoldersForChanges") === true;
    }

    public static getRenpyExecutablePath(): string {
        const config = workspace.getConfiguration("renpy");
        return config.get<string>("renpyExecutableLocation") || "";
    }

    private static excludeCompiledFilesConfig() {
        const renpyExclude = ["**/*.rpyc", "**/*.rpa", "**/*.rpymc", "**/cache/"];
        const config = workspace.getConfiguration("files");
        const workspaceExclude = config.inspect<WorkspaceConfiguration>("exclude");
        const exclude = { ...workspaceExclude?.workspaceValue };
        renpyExclude.forEach((element) => {
            if (!(element in exclude)) {
                Object.assign(exclude, { [element]: true });
            }
        });
        config.update("exclude", exclude, ConfigurationTarget.Workspace);
    }
}
