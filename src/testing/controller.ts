import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";

import { getWorkspaceFolder } from "src/utilities";

import { logMessage } from "../logger";

import { discoverTests } from "./discovery";
import { executeTestRun } from "./run-executor";
import { getTestingSettings } from "./settings";

/**
 * Registers the Ren'Py Test Explorer controller with VS Code.
 *
 * Creates a TestController, a Run profile, and wires the refresh/resolve
 * handlers through the extension context lifecycle.
 */
export function registerTestingController(context: vscode.ExtensionContext): void {
    const controller = vscode.tests.createTestController("renpy-tests", "Ren'Py Tests");
    context.subscriptions.push(controller);

    const idMap = new Map<string, vscode.TestItem>();
    let activeRunCount = 0;

    // == Shared discovery helper ===============================================
    async function runDiscovery(forceRefresh: boolean): Promise<void> {
        if (activeRunCount > 0) {
            logMessage(vscode.LogLevel.Info, "[renpy-vscode] Discovery skipped: a test run is in progress.");
            return;
        }
        void vscode.commands.executeCommand("setContext", "renpy.testExplorerState", "loading");
        const settings = getTestingSettings();
        const result = await discoverTests(controller, idMap, settings, forceRefresh);
        const nextState = result.testCount > 0 ? undefined : "empty";
        if (!result.success && result.error) {
            logMessage(vscode.LogLevel.Warning, `[renpy-vscode] Discovery failed: ${result.error}`);
        }
        void vscode.commands.executeCommand("setContext", "renpy.testExplorerState", nextState);
    }

    // == Proactive initial discovery ===========================================
    // VS Code calls resolveHandler lazily (only after the Test Explorer is opened
    // and the user interacts with it). To ensure tests appear immediately without
    // user interaction, we also trigger discovery eagerly on activation.
    void runDiscovery(false).catch((err) => {
        logMessage(vscode.LogLevel.Error, `[renpy-vscode] Initial discovery threw unexpectedly: ${err}`);
    });

    // == Refresh handler =======================================================
    // Triggered when the user clicks the refresh button in Test Explorer.
    controller.refreshHandler = async (token: vscode.CancellationToken) => {
        if (token.isCancellationRequested) return;
        await runDiscovery(true);
    };

    // == Resolve handler =======================================================
    // VS Code may call this for initial load or when expanding items. We still
    // handle it so that VS Code-triggered refreshes (e.g. after file changes)
    // also populate the tree.
    controller.resolveHandler = async (item: vscode.TestItem | undefined) => {
        if (item === undefined) {
            await runDiscovery(false);
        }
        // For non-root items: discovery is done eagerly so no lazy loading needed.
    };

    // == Run profile ===========================================================
    const runProfile = controller.createRunProfile(
        "Run Tests",
        vscode.TestRunProfileKind.Run,
        async (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
            const settings = getTestingSettings();
            const testRun = controller.createTestRun(request);

            const targets = collectLeafItems(request, controller);

            // Mark all targets as enqueued for responsive UI.
            for (const item of targets) {
                testRun.enqueued(item);
            }

            const runId = crypto.randomUUID();
            const streamPath = resolveStreamPath(settings.jsonlOutputPath, runId);
            const gameDir = resolveGameDir();

            logMessage(vscode.LogLevel.Info, `[renpy-vscode] Run ${runId}: ${targets.length} item(s), stream: ${streamPath}`);

            activeRunCount++;
            try {
                await executeTestRun(testRun, idMap, { targets, includedItems: request.include, runId, streamPath, settings, gameDir }, token);
            } catch (err) {
                logMessage(vscode.LogLevel.Error, `[renpy-vscode] Run ${runId} threw unexpectedly: ${err}`);
                const msg = new vscode.TestMessage(`Unexpected error during test run: ${err}`);
                for (const item of targets) {
                    testRun.errored(item, msg);
                }
            } finally {
                activeRunCount--;
                testRun.end();
            }
        },
        true, // isDefault
    );
    context.subscriptions.push(runProfile);

    logMessage(vscode.LogLevel.Info, "[renpy-vscode] Test controller registered.");
}

/**
 * Collects all leaf TestItems (no children) from a run request.
 * If request.include is undefined, walks all items in the controller.
 */
function collectLeafItems(request: vscode.TestRunRequest, controller: vscode.TestController): vscode.TestItem[] {
    const result: vscode.TestItem[] = [];
    const excluded = new Set(request.exclude ?? []);

    function walk(items: vscode.TestItemCollection): void {
        items.forEach((item) => {
            if (excluded.has(item)) return;
            if (item.children.size === 0) {
                result.push(item);
            } else {
                walk(item.children);
            }
        });
    }

    if (request.include !== undefined) {
        for (const item of request.include) {
            if (excluded.has(item)) continue;
            if (item.children.size === 0) {
                result.push(item);
            } else {
                walk(item.children);
            }
        }
    } else {
        walk(controller.items);
    }

    return result;
}

/**
 * Resolves the output path for a per-run JSONL file.
 * Falls back to the workspace saves/ folder, then the OS temp directory.
 */
function resolveStreamPath(configuredPath: string, runId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `rpytest-${timestamp}_${runId.slice(0, 8)}.jsonl`;

    if (configuredPath.trim() !== "") {
        return path.join(configuredPath, filename);
    }

    // Fallback to OS temp directory.
    return path.join(getTempDir(), filename);
}

/**
 * Resolves the Ren'Py game/project directory from the workspace folder.
 * Uses the same path normalization as ExecuteRenpyRun / ExecuteRenpyCompile.
 */
function resolveGameDir(): string {
    let wf = getWorkspaceFolder();
    if (wf.endsWith("/game")) {
        wf = wf.substring(0, wf.length - 5);
    }
    return wf;
}

function getTempDir(): string {
    // Use process.env.TEMP/TMP on Windows, /tmp on Unix.
    const dir = process.env["TEMP"] ?? process.env["TMP"] ?? "/tmp";
    return path.join(dir, "renpy-vscode");
}
