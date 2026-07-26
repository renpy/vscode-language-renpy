import * as vscode from "vscode";

import { type AnyEvent, isTerminalEvent, isTestEndEvent, type OnTestEndEvent, type RenpyOutcomeStatus, type VsCodeOutcomeStatus } from "./event-schema";

interface OutcomeMappingResult {
    status: VsCodeOutcomeStatus;
    note?: string;
}

/**
 * Maps Ren'Py outcome semantics to VS Code test statuses.
 */
function mapRenpyOutcomeToVsCode(status: RenpyOutcomeStatus): OutcomeMappingResult {
    switch (status) {
        case "passed":
            return { status: "passed" };
        case "failed":
            return { status: "failed" };
        case "skipped":
            return { status: "skipped" };
        case "xfailed":
            return {
                status: "passed",
                note: "Expected failure (xfailed).",
            };
        case "xpassed":
            return {
                status: "failed",
                note: "Unexpected pass (xpassed).",
            };
        default:
            return {
                status: "errored",
                note: `Unknown renpy outcome status: ${status}`,
            };
    }
}

/**
 * Mutable state tracked per run by the event mapper.
 * Sequence monotonicity and on_run_end receipt are validated here.
 */
export interface MapperState {
    runId: string;
    /** Last consumed sequence number; -1 before any event. */
    lastSequence: number;
    hasReceivedOnEnd: boolean;
    terminalStatus?: RenpyOutcomeStatus;
}

export function createMapperState(runId: string): MapperState {
    return { runId, lastSequence: -1, hasReceivedOnEnd: false };
}

/**
 * Applies a single validated JSONL event to the active TestRun.
 *
 * Returns an infrastructure error string if the event violates run invariants;
 * returns undefined on success.
 *
 * Full dispatch implementation: Phase 5.
 */
export function applyEvent(event: AnyEvent, state: MapperState, testRun: vscode.TestRun, idMap: Map<string, vscode.TestItem>): string | undefined {
    // --- Invariant: sequence must be strictly increasing ---
    if (event.sequence <= state.lastSequence) {
        return (
            `Sequence violation for run '${state.runId}': ` +
            `expected sequence > ${state.lastSequence}, got ${event.sequence} (event: ${event.event}).`
        );
    }
    state.lastSequence = event.sequence;

    // --- Invariant: run_id must match ---
    if (event.run_id !== state.runId) {
        return `run_id mismatch: expected '${state.runId}', got '${event.run_id}' at sequence ${event.sequence}.`;
    }

    if (isTestEndEvent(event)) {
        applyTestEnd(event, testRun, idMap);
    } else if (isTerminalEvent(event)) {
        state.hasReceivedOnEnd = true;
        state.terminalStatus = event.final_status;
    }

    return undefined;
}

function applyTestEnd(event: OnTestEndEvent, testRun: vscode.TestRun, idMap: Map<string, vscode.TestItem>): void {
    const item = idMap.get(event.test_id);
    if (!item) {
        // This sometimes happens for test hooks
        // testRun.appendOutput(`[renpy-vscode] Warning: received result for unknown test_id '${event.test_id}'\r\n`);
        return;
    }

    const vsCodeOutcome = mapRenpyOutcomeToVsCode(event.status);
    const note = vsCodeOutcome.note ?? "";
    let fullMessage = "";
    if (event.error) {
        fullMessage += event.error;
    }
    if (event.traceback) {
        fullMessage += `\n\n${event.traceback}`;
    }
    if (note) {
        fullMessage += (fullMessage ? "\n\n" : "") + note;
    }
    fullMessage = fullMessage.trim();
    const durationMs = event.duration_seconds !== undefined ? event.duration_seconds * 1000 : undefined;

    switch (vsCodeOutcome.status) {
        case "passed":
            testRun.passed(item, durationMs);
            if (fullMessage) {
                testRun.appendOutput(`${fullMessage.replace(/(?<!\r)\n/g, "\r\n")}\r\n`, undefined, item);
            }
            break;
        case "failed": {
            const msg = new vscode.TestMessage(fullMessage || "Test failed.");
            testRun.failed(item, msg, durationMs);
            break;
        }
        case "skipped":
            testRun.skipped(item);
            break;
        case "errored": {
            const errMsg = new vscode.TestMessage(fullMessage || "Test errored.");
            testRun.errored(item, errMsg, durationMs);
            break;
        }
    }
}
