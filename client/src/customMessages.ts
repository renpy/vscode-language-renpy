/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { NotificationType, NotificationType0, RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";

// eslint-disable-next-line no-shadow
export enum Status {
    ok = 1,
    warn = 2,
    error = 3,
}

export type StatusParams = {
    uri: string;
    state: Status;
    validationTime?: number;
};

/**
 * The status notification is sent from the server to the client to
 * inform the client about server status changes.
 */
export namespace StatusNotification {
    export const method = "language-renpy/status" as const;
    export const type = new NotificationType<StatusParams>(method);
}

export type NoConfigParams = {
    message: string;
    document: TextDocumentIdentifier;
};

export type NoConfigResult = Record<string, never>;

/**
 * The NoConfigRequest is sent from the server to the client to inform
 * the client that no language-renpy configuration file could be found when
 * trying to lint a file.
 */
export namespace NoConfigRequest {
    export const method = "language-renpy/noConfig" as const;
    export const type = new RequestType<NoConfigParams, NoConfigResult, void>(method);
}

export type NoESLintLibraryParams = {
    source: TextDocumentIdentifier;
};

export type NoESLintLibraryResult = Record<string, never>;

/**
 * The NoESLintLibraryRequest is sent from the server to the client to
 * inform the client that no language-renpy library could be found when trying
 * to lint a file.
 */
export namespace NoESLintLibraryRequest {
    export const method = "language-renpy/noLibrary" as const;
    export const type = new RequestType<NoESLintLibraryParams, NoESLintLibraryResult, void>(method);
}

export type OpenESLintDocParams = {
    url: string;
};

export type OpenESLintDocResult = Record<string, never>;

/**
 * The language-renpy/openDoc request is sent from the server to the client to
 * ask the client to open the documentation URI for a given
 * ESLint rule.
 */
export namespace OpenESLintDocRequest {
    export const method = "language-renpy/openDoc" as const;
    export const type = new RequestType<OpenESLintDocParams, OpenESLintDocResult, void>(method);
}

export type ProbeFailedParams = {
    textDocument: TextDocumentIdentifier;
};

/**
 * The language-renpy/probeFailed request is sent from the server to the client
 * to tell the client the the lint probing for a certain document has
 * failed and that there is no need to sync that document to the server
 * anymore.
 */
export namespace ProbeFailedRequest {
    export const method = "language-renpy/probeFailed" as const;
    export const type = new RequestType<ProbeFailedParams, void, void>(method);
}

/**
 * The language-renpy/showOutputChannel notification is sent from the server to
 * the client to ask the client to reveal it's output channel.
 */
export namespace ShowOutputChannel {
    export const method = "language-renpy/showOutputChannel" as const;
    export const type = new NotificationType0("language-renpy/showOutputChannel");
}

/**
 * The language-renpy/exitCalled notification is sent from the server to the client
 * to inform the client that a process.exit call on the server got intercepted.
 * The call was very likely made by an ESLint plugin.
 */
export namespace ExitCalled {
    export const method = "language-renpy/exitCalled" as const;
    export const type = new NotificationType<[number, string]>(method);
}
