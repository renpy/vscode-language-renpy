export type RenpyOutcomeStatus = "passed" | "failed" | "skipped" | "xfailed" | "xpassed";
export type VsCodeOutcomeStatus = "passed" | "failed" | "skipped" | "errored";
export type EventType = "on_run_start" | "on_test_info" | "on_test_start" | "on_test_end" | "on_heartbeat" | "on_run_end";

/** Fields required on every JSONL event. */
export interface BaseEvent {
    run_id: string;
    sequence: number;
    event: EventType;
    timestamp: number;
}

export interface OnRunStartEvent extends BaseEvent {
    event: "on_run_start";
}

export interface OnTestInfoEvent extends BaseEvent {
    event: "on_test_info";
    test_id: string;
    name: string;
    kind: string;
    file: string;
    line: number;
    parent_test_id: string;
}

export interface OnTestStartEvent extends BaseEvent {
    event: "on_test_start";
    test_id: string;
}

export interface OnTestEndEvent extends BaseEvent {
    event: "on_test_end";
    test_id: string;
    status: RenpyOutcomeStatus;
    duration_seconds?: number;
    error?: string;
    traceback?: string;
}

export interface OnHeartbeatEvent extends BaseEvent {
    event: "on_heartbeat";
}

export interface OnRunEndEvent extends BaseEvent {
    event: "on_run_end";
    final_status: RenpyOutcomeStatus;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    xfailed: number;
    xpassed: number;
}

export type AnyEvent =
    | OnRunStartEvent
    | OnTestInfoEvent
    | OnTestStartEvent
    | OnTestEndEvent
    | OnHeartbeatEvent
    | OnRunEndEvent;

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

const REQUIRED_BASE_FIELDS: ReadonlyArray<keyof BaseEvent> = ["run_id", "sequence", "timestamp", "event"];

/** Validates that an unknown value satisfies the base event contract. */
export function validateBaseEvent(obj: unknown): ValidationResult {
    if (typeof obj !== "object" || obj === null) {
        return { valid: false, error: "Event is not an object." };
    }
    const record = obj as Record<string, unknown>;

    for (const field of REQUIRED_BASE_FIELDS) {
        if (!(field in record)) {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }

    if (typeof record["run_id"] !== "string" || record["run_id"] === "") {
        return { valid: false, error: "run_id must be a non-empty string." };
    }
    if (typeof record["sequence"] !== "number" || !Number.isInteger(record["sequence"]) || record["sequence"] < 0) {
        return { valid: false, error: "sequence must be a non-negative integer." };
    }
    if (typeof record["event"] !== "string" || record["event"] === "") {
        return { valid: false, error: "event must be a non-empty string." };
    }
    if (typeof record["timestamp"] !== "number" || !Number.isFinite(record["timestamp"])) {
        return { valid: false, error: "timestamp must be a valid number." };
    }
    return { valid: true };
}

export function isTerminalEvent(event: AnyEvent): event is OnRunEndEvent {
    return event.event === "on_run_end";
}

export function isTestEndEvent(event: AnyEvent): event is OnTestEndEvent {
    return event.event === "on_test_end";
}

/** Parses a single JSONL line. Returns the event or an error string. */
export function parseJsonlLine(line: string): { event: AnyEvent } | { error: string } {
    let parsed: unknown;
    try {
        parsed = JSON.parse(line);
    } catch {
        return { error: `Failed to parse JSON: ${line.slice(0, 120)}` };
    }
    const result = validateBaseEvent(parsed);
    if (!result.valid) {
        return { error: result.error ?? "Unknown validation error." };
    }
    return { event: parsed as AnyEvent };
}
