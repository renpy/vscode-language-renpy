import { workspace } from "vscode";

import { Configuration } from "../configuration";

export type DiscoveryRefreshMode = "always-refresh" | "cache-first";

export interface TestingSettings {
    discoveryRefreshMode: DiscoveryRefreshMode;
    jsonlBatchSize: number;
    jsonlFlushInterval: number;
    jsonlOutputPath: string;
    jsonlPollInterval: number;
    jsonlStalledTimeout: number;
    renpyExecutablePath: string;
    reporters: string;
    showWindow: boolean;
}

const DEFAULTS = {
    discoveryRefreshMode: "cache-first" as DiscoveryRefreshMode,
    jsonlBatchSize: 50,
    jsonlFlushInterval: 1000,
    jsonlOutputPath: "",
    jsonlPollInterval: 500,
    jsonlStalledTimeout: 5000,
    renpyExecutablePath: "",
    reporters: "console",
    showWindow: false,
};

export function getTestingSettings(): TestingSettings {
    const config = workspace.getConfiguration("renpy.testing");

    // Executable: use testing override if set, else fall back to main setting.
    const override = config.get<string>("renpyExecutableOverride", "");
    const renpyExecutablePath = override.trim() !== "" ? override : Configuration.getRenpyExecutablePath();

    return {
        renpyExecutablePath,
        discoveryRefreshMode: config.get<DiscoveryRefreshMode>("discoveryRefreshMode", DEFAULTS.discoveryRefreshMode),
        jsonlBatchSize: config.get<number>("jsonlBatchSize", DEFAULTS.jsonlBatchSize),
        jsonlFlushInterval: config.get<number>("jsonlFlushInterval", DEFAULTS.jsonlFlushInterval),
        jsonlOutputPath: config.get<string>("jsonlOutputPath", DEFAULTS.jsonlOutputPath),
        jsonlPollInterval: config.get<number>("jsonlPollInterval", DEFAULTS.jsonlPollInterval),
        jsonlStalledTimeout: config.get<number>("jsonlStalledTimeout", DEFAULTS.jsonlStalledTimeout),
        reporters: config.get<string>("reporters", DEFAULTS.reporters),
        showWindow: config.get<boolean>("showWindow", DEFAULTS.showWindow),
    };
}
