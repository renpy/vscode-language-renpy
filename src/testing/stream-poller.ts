import * as fs from "fs";
import * as vscode from "vscode";

import { type AnyEvent, isTerminalEvent, parseJsonlLine } from "./event-schema";

export type EventCallback = (event: AnyEvent) => void;
export type InfrastructureErrorCallback = (error: string) => void;

export interface PollerOptions {
    /** Absolute path to the JSONL file produced by the reporter. */
    streamPath: string;
    jsonlPollInterval: number;
    /** Stalled-run detection: max ms without an event while process is alive. */
    jsonlStalledTimeout: number;
    runId: string;
}

/**
 * Smart polling loop that reads the JSONL file using append-only delta reads.
 *
 * Algorithm:
 *   1. stat() the file; skip read if size unchanged.
 *   2. Read only the appended bytes from the last offset.
 *   3. Split on newlines; hold trailing partial line in buffer.
 *   4. Parse each complete line and fire onEvent / onInfrastructureError.
 *   5. While process is alive, check stall timeout.
 *   6. After notifyProcessExited(), fire infrastructure error if on_run_end was not received.
 */
export class StreamPoller {
    private disposed = false;
    private processExited = false;
    private processExitedAt = 0;
    private testStarted = false;
    private lastEventTime = 0;
    private offset = 0;
    private lastStatSize = -1;
    private carry = "";
    private pollTimer: ReturnType<typeof setTimeout> | undefined;
    private readonly resolveCompletion: () => void;
    private readonly completionPromise: Promise<void>;

    constructor(
        private readonly options: PollerOptions,
        private readonly onEvent: EventCallback,
        private readonly onInfrastructureError: InfrastructureErrorCallback,
        private readonly token: vscode.CancellationToken,
    ) {
        let resolve!: () => void;
        this.completionPromise = new Promise<void>((r) => {
            resolve = r;
        });
        this.resolveCompletion = resolve;
    }

    /**
     * Starts the polling loop.
     * Returns a Promise that resolves when polling is done (on_run_end received,
     * stop() called, or cancellation).
     */
    start(): Promise<void> {
        if (!this.disposed) {
            this.lastEventTime = Date.now();
            this.schedulePoll();
        }
        return this.completionPromise;
    }

    /**
     * Signals that the Ren'Py process has exited.
     * Switches the poller into grace-window mode: polling continues for one more cycle.
     */
    notifyProcessExited(): void {
        if (!this.processExited) {
            this.processExited = true;
            this.processExitedAt = Date.now();
        }
    }

    stop(): void {
        if (!this.disposed) {
            this.disposed = true;
            if (this.pollTimer !== undefined) {
                clearTimeout(this.pollTimer);
                this.pollTimer = undefined;
            }
            this.resolveCompletion();
        }
    }

    get isDisposed(): boolean {
        return this.disposed;
    }

    // == Private ==============================================================

    private schedulePoll(): void {
        if (this.disposed) return;
        this.pollTimer = setTimeout(() => this.poll(), this.options.jsonlPollInterval);
    }

    private poll(): void {
        if (this.disposed) return;

        if (this.token.isCancellationRequested) {
            this.stop();
            return;
        }

        const pollStartTime = Date.now();

        // Read any newly appended bytes from the stream file.
        try {
            const stat = fs.statSync(this.options.streamPath);
            if (stat.size > this.lastStatSize) {
                this.lastStatSize = stat.size;
                const toRead = stat.size - this.offset;
                if (toRead > 0) {
                    const buf = Buffer.alloc(toRead);
                    const fd = fs.openSync(this.options.streamPath, "r");
                    let bytesRead: number;
                    try {
                        bytesRead = fs.readSync(fd, buf, 0, toRead, this.offset);
                    } finally {
                        fs.closeSync(fd);
                    }
                    this.offset += bytesRead;
                    this.carry += buf.toString("utf8", 0, bytesRead);

                    // Split on LF, tolerate CRLF line endings.
                    const lines = this.carry.split("\n");
                    this.carry = lines.pop() ?? ""; // keep trailing partial line

                    if (lines.length > 0) {
                        this.testStarted = true;
                    }

                    for (const rawLine of lines) {
                        const line = rawLine.replace(/\r$/, "").trim();
                        if (line === "") continue;

                        const result = parseJsonlLine(line);
                        if ("error" in result) {
                            this.onInfrastructureError(result.error);
                            this.stop();
                            return;
                        }

                        const event = result.event;
                        this.lastEventTime = event.timestamp;

                        this.onEvent(event);

                        if (this.disposed) return; // event handler may have called stop()

                        if (isTerminalEvent(event)) {
                            this.stop();
                            return;
                        }
                    }
                }
            }
        } catch {
            // File not yet created or transient I/O error, keep polling.
        }

        // Stalled-run detection (only while the process is alive and after the first event).
        if (this.testStarted && !this.processExited) {
            const timeSinceLastEventMs = Date.now() - this.lastEventTime*1000;
            if (timeSinceLastEventMs > this.options.jsonlStalledTimeout) {
                this.onInfrastructureError(
                    `Stalled run '${this.options.runId}': no events for ${timeSinceLastEventMs} ms ` +
                    `(timeout: ${this.options.jsonlStalledTimeout} ms).`,
                );
                this.stop();
                return;
            }
        }

        // Grace window: after process exits, poll one last time for buffered events
        if (this.processExited) {
            if (pollStartTime > this.processExitedAt) {
                this.stop();
                return;
            }
        }

        this.schedulePoll();
    }
}
