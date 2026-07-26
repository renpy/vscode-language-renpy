import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { logMessage } from "../logger";
import { buildRenpySpawnConfiguration, isValidExecutable } from "../renpy-command";

import { applyEvent, createMapperState } from "./event-mapper";
import { isTestEndEvent } from "./event-schema";
import type { TestingSettings } from "./settings";
import { StreamPoller } from "./stream-poller";

export interface RunOptions {
    /** Resolved leaf test items selected for this run (for status reporting). */
    targets: vscode.TestItem[];
    /** Original request.include items (for Ren'Py target resolution). Undefined means run all. */
    includedItems: readonly vscode.TestItem[] | undefined;
    /** Unique identifier for this run, matches run_id in JSONL events. */
    runId: string;
    /** Absolute path to the JSONL output file. */
    streamPath: string;
    settings: TestingSettings;
    /** Normalized workspace folder path (forward slashes, no trailing slash). */
    gameDir: string;
}

/**
 * Ren'Py test command expects testcase ids without the leading "global." prefix.
 */
function normalizeRenpyTarget(fullPath: string): string {
    return fullPath.startsWith("global.") ? fullPath.substring("global.".length) : fullPath;
}

/**
 * Resolves the most specific common Ren'Py testcase / testsuite target from the
 * included items. Returns "global" when all tests should run.
 *
 * Examples:
 *   [global.foo.bar, global.foo.baz]  →  "global.foo"
 *   [global.foo]                       →  "global.foo"
 *   undefined                          →  "global"
 */
function resolveRenpyTarget(includedItems: readonly vscode.TestItem[] | undefined): string {
    const DEFAULT = "global";
    if (includedItems === undefined || includedItems.length === 0) return DEFAULT;

    const fullPaths: string[] = [];
    for (const item of includedItems) {
        fullPaths.push(normalizeRenpyTarget(item.id));
    }

    if (fullPaths.length === 0) return DEFAULT;

    const unique = [...new Set(fullPaths)];
    if (unique.length === 1) return unique[0];

    // Find the longest common dot-separated prefix across all full_paths.
    const segmented = unique.map((p) => p.split("."));
    const shortest = segmented.reduce((min, s) => (s.length < min.length ? s : min));
    const common: string[] = [];
    for (let i = 0; i < shortest.length; i++) {
        const seg = shortest[i];
        if (segmented.every((s) => s[i] === seg)) {
            common.push(seg);
        } else {
            break;
        }
    }
    return common.length > 0 ? common.join(".") : DEFAULT;
}

/** Returns a promise that resolves with the process exit code when the process closes. */
function waitForProcessClose(proc: cp.ChildProcess): Promise<number | null> {
    return new Promise((resolve) => {
        proc.on("close", (code) => resolve(code));
        proc.on("error", () => resolve(null));
    });
}

function createMissingExecutableMessage(renpyExecutablePath: string): vscode.TestMessage {
    return new vscode.TestMessage(
        `Ren'Py executable not configured or not found: '${renpyExecutablePath}'. ` +
        `Set 'renpy.renpyExecutableLocation' or 'renpy.testing.renpyExecutableOverride' in settings.`,
    );
}

function markItemsErrored(items: Iterable<vscode.TestItem>, testRun: vscode.TestRun, message: vscode.TestMessage): void {
    for (const item of items) {
        testRun.errored(item, message);
    }
}

function markItemsSkipped(items: Iterable<vscode.TestItem>, testRun: vscode.TestRun): void {
    for (const item of items) {
        testRun.skipped(item);
    }
}

function markItemsPassedWithNote(items: Set<vscode.TestItem>, testRun: vscode.TestRun, note: (item: vscode.TestItem) => string): void {
    for (const item of items) {
        testRun.passed(item);
        testRun.appendOutput(`${note(item).replace(/(?<!\r)\n/g, "\r\n")}\r\n`, undefined, item);
    }
    items.clear();
}

/**
 * Spawns Ren'Py with the JSONL reporter, manages the polling loop,
 * and maps events to the active TestRun. Handles cancellation, stall
 * timeout, grace window, and infrastructure errors.
 */
export async function executeTestRun(testRun: vscode.TestRun, idMap: Map<string, vscode.TestItem>, options: RunOptions, token: vscode.CancellationToken): Promise<void> {
    if (!isValidExecutable(options.settings.renpyExecutablePath)) {
        const msg = createMissingExecutableMessage(options.settings.renpyExecutablePath);
        markItemsErrored(options.targets, testRun, msg);
        return;
    }

    if (options.gameDir === "") {
        const msg = new vscode.TestMessage("No workspace folder is open. Cannot run Ren'Py tests.");
        markItemsErrored(options.targets, testRun, msg);
        return;
    }

    // Ensure the stream output directory exists.
    try {
        const dir = path.dirname(options.streamPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (err) {
        const msg = new vscode.TestMessage(`Failed to create JSONL output directory: ${err}`);
        markItemsErrored(options.targets, testRun, msg);
        return;
    }

    const targetArg = resolveRenpyTarget(options.includedItems);

    // Ensure the JSONL reporter is included for Test Explorer integration
    const reporters = options.settings.reporters.split(",").map((s) => s.trim());
    if (reporters.indexOf("jsonl") < 0) {
        reporters.push("jsonl");
    }

    const runArgs: string[] = [
        options.gameDir,
        "test",
        targetArg,
        "--reporter",
        reporters.join(","),
        "--jsonl-output",
        options.streamPath.replace(/\\/g, "/"),
        "--jsonl-run-id",
        options.runId,
        "--jsonl-batch-size",
        String(options.settings.jsonlBatchSize),
        "--jsonl-flush-interval-ms",
        String(options.settings.jsonlFlushInterval),
    ];

    const spawnConfig = buildRenpySpawnConfiguration(options.settings.renpyExecutablePath, runArgs);
    if (spawnConfig == null) {
        const msg = createMissingExecutableMessage(options.settings.renpyExecutablePath);
        markItemsErrored(options.targets, testRun, msg);
        return;
    }

    // Log the full command line for debugging purposes. Escape arguments as needed.
    const runArgsEscaped = ["cd", spawnConfig.cwd, "&&", spawnConfig.command, ...spawnConfig.args];
    for (let i = 0; i < runArgs.length; i++) {
        const arg = runArgsEscaped[i];
        if (arg !== undefined && /[ \t\n\r\v"'`$\\]/.test(arg)) {
            runArgsEscaped[i] = `"${arg.replace(/(["\\$`])/g, "\\$1")}"`;
        }
    }
    const logCommand = runArgsEscaped.join(" ");
    logMessage(vscode.LogLevel.Info, `[renpy-vscode] ${logCommand}`);
    testRun.appendOutput(`[renpy-vscode] Run: ${logCommand}\r\n\r\n`);

    // Spawn the process
    let proc: cp.ChildProcess;
    try {
        proc = cp.spawn(spawnConfig.command, spawnConfig.args, {
            cwd: spawnConfig.cwd,
            env: { PATH: process.env["PATH"] ?? "" },
            windowsHide: !options.settings.showWindow,
        });
    } catch (err) {
        const msg = new vscode.TestMessage(`Failed to spawn Ren'Py process: ${err}`);
        markItemsErrored(options.targets, testRun, msg);
        return;
    }

    // Pipe process stdout/stderr to the test run output panel.
    proc.stdout?.on("data", (chunk: Buffer) => {
        testRun.appendOutput(chunk.toString().replace(/(?<!\r)\n/g, "\r\n"));
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
        testRun.appendOutput(`[stderr] ${chunk.toString().replace(/(?<!\r)\n/g, "\r\n")}`);
    });

    // Mapper state and pending-item tracking.
    const mapperState = createMapperState(options.runId);
    const pendingItems = new Set(options.targets);
    let infraError: string | undefined; // first error wins
    let receivedTestEndCount = 0;

    const poller = new StreamPoller(
        {
            streamPath: options.streamPath,
            jsonlPollInterval: options.settings.jsonlPollInterval,
            jsonlStalledTimeout: options.settings.jsonlStalledTimeout,
            runId: options.runId,
        },
        (event) => {
            const err = applyEvent(event, mapperState, testRun, idMap);
            if (err) {
                infraError = infraError ?? err;
                poller.stop();
                return;
            }
            if (isTestEndEvent(event)) {
                receivedTestEndCount++;
                const item = idMap.get(event.test_id);
                if (item) {
                    pendingItems.delete(item);
                }
            }
        },
        (errorMsg) => {
            infraError = infraError ?? errorMsg;
            // The poller stops itself after firing an infrastructure error.
        },
        token,
    );

    // Kill the process and stop polling on cancellation.
    const cancelDisposable = token.onCancellationRequested(() => {
        try {
            proc.kill();
        } catch {
            // ignore
        }
        poller.stop();
    });

    // Start the polling loop; the returned promise resolves when polling is done.
    const pollDonePromise = poller.start();

    // Wait for the process to exit.
    const exitCode = await waitForProcessClose(proc);
    cancelDisposable.dispose();

    logMessage(vscode.LogLevel.Info, `[renpy-vscode] Run ${options.runId}: process exited with code ${exitCode}`);

    // Notify the poller so it enters grace-window mode.
    poller.notifyProcessExited();

    // Wait for the poller to finish (on_run_end received, or stopped).
    await pollDonePromise;

    // Cancellation: mark remaining items as skipped (not errored, run was intentional).
    if (token.isCancellationRequested) {
        markItemsSkipped(pendingItems, testRun);
        return;
    }

    // Surface any infrastructure error to still-pending items.
    if (infraError) {
        testRun.appendOutput(`\r\n[renpy-vscode] Infrastructure error: ${infraError.replace(/(?<!\r)\n/g, "\r\n")}\r\n`);
        const msg = new vscode.TestMessage(infraError);
        markItemsErrored(pendingItems, testRun, msg);
        return;
    }

    // If the run exited successfully but produced no terminal/per-test JSONL events,
    // infer pass from process exit status to avoid false negative warnings.
    if (!mapperState.hasReceivedOnEnd && receivedTestEndCount === 0 && exitCode === 0 && pendingItems.size > 0) {
        markItemsPassedWithNote(
            pendingItems,
            testRun,
            () => "[renpy-vscode] Note: inferred pass from successful process exit (no JSONL events were received; check reporter setting).",
        );
    }

    // Warn about items that unexpectedly received no result.
    for (const item of pendingItems) {
        testRun.appendOutput(`[renpy-vscode] Warning: no result received for '${item.label}'\r\n`, undefined, item);
    }
}
