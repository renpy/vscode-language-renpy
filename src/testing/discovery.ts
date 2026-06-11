import * as fs from "fs";
import * as vscode from "vscode";

import { ExecuteRenpyCompile } from "src/extension";
import { getFileWithPath, getNavigationJsonFilepath } from "src/utilities";

import { logMessage } from "../logger";

import type { TestingSettings } from "./settings";

/** Result of a discovery refresh. */
export interface DiscoveryResult {
    success: boolean;
    error?: string;
    testCount: number;
}

// == Navigation.json test section types =======================================

interface NavParamInstance {
    index: number;
    display_name: string;
}

interface NavTestItem {
    full_path: string;
    name: string;
    kind: "testsuite" | "testcase" | "hook";
    file: string;
    line: number;
    parent_full_path: string | null;
    parameterized: NavParamInstance[];
    description: string;
}

interface NavTestSection {
    items?: unknown[];
}

interface LoadNavigationJsonResult {
    navData?: Record<string, unknown>;
    error?: string;
}

// == Schema validation =========================================================

async function compileAndLoadNavigationJson(
    rpyPath: string,
    shouldCompile: boolean,
): Promise<LoadNavigationJsonResult> {
    const navPath = getNavigationJsonFilepath();

    if (shouldCompile) {
        const compileSuccess = await ExecuteRenpyCompile(rpyPath);
        if (!compileSuccess) {
            return {
                error: `Compile failed. Make sure the game can be compiled successfully with the configured Ren'Py executable ('${rpyPath}').`,
            };
        }
    }

    if (!fs.existsSync(navPath)) {
        return {
            error: `navigation.json not found at '${navPath}'. Run 'Renpy: Compile Ren'Py Navigation Data' first.`,
        };
    }

    try {
        const raw = fs.readFileSync(navPath, "utf-8");
        return { navData: JSON.parse(raw) as Record<string, unknown> };
    } catch (err) {
        return {
            error: `Failed to read or parse navigation.json: ${err}`,
        };
    }
}

// == Tree building =============================================================

function isValidNavTestItem(obj: unknown): obj is NavTestItem {
    if (typeof obj !== "object" || obj === null) return false;
    const r = obj as Record<string, unknown>;
    return (
        typeof r["full_path"] === "string" &&
        typeof r["name"] === "string" &&
        typeof r["kind"] === "string" &&
        typeof r["file"] === "string" &&
        typeof r["line"] === "number" &&
        Array.isArray(r["parameterized"])
    );
}

/**
 * Resolves a navigation.json file path (e.g. `game/tests/global.rpy`) to an
 * absolute filesystem path using the existing getFileWithPath utility.
 */
function resolveNavFile(navFile: string): vscode.Uri {
    const abs = getFileWithPath(navFile);
    return vscode.Uri.file(abs);
}

/**
 * Tracks a single "slot" in the test tree where a node has been placed.
 *
 * Non-parameterized items have one ChildContext per copy (there may be multiple
 * copies when the parent is parameterized). Parameterized items have one
 * ChildContext per *parameter instance* (and again possibly multiplied by the
 * number of parent copies).
 *
 * `effectiveRenpyPath` is the stable renpy-facing path for this node within
 * its parameter context, e.g. `"global.chapters(tip_state=0).save"`.
 */
interface ChildContext {
    parentCollection: vscode.TestItemCollection;
    effectiveRenpyPath: string;
}

function buildTree(
    controller: vscode.TestController,
    idMap: Map<string, vscode.TestItem>,
    items: NavTestItem[],
): number {
    // Maps full_path → all instances of this node currently in the tree.
    // When a parent is parameterized the same full_path can appear once per
    // parent parameter instance, each with its own ChildContext.
    const containerMap = new Map<string, ChildContext[]>();
    let count = 0;

    for (const item of items) {
        // v1: skip hooks entirely.
        if (item.kind === "hook") continue;

        const uri = resolveNavFile(item.file);
        const range = new vscode.Range(item.line - 1, 0, item.line - 1, 0);

        // == Resolve parent contexts ==========================================
        // For root items (parent_full_path === null) there is a single context
        // rooted at the controller's top-level collection. For everything else
        // look up the already-registered instances of the parent.
        let parentContexts: ChildContext[];
        if (item.parent_full_path === null) {
            parentContexts = [{ parentCollection: controller.items, effectiveRenpyPath: "" }];
        } else {
            const parentEntries = containerMap.get(item.parent_full_path);
            parentContexts = parentEntries && parentEntries.length > 0
                ? parentEntries
                : [{ parentCollection: controller.items, effectiveRenpyPath: "" }];
        }

        // The part of full_path that is unique to this item (i.e. the
        // separator + name appended to the parent's full_path).  For root
        // items this is the complete full_path.
        const relativeSuffix = item.parent_full_path !== null
            ? item.full_path.substring(item.parent_full_path.length)
            : item.full_path;

        // The separator/prefix portion of relativeSuffix without the bare item.name
        // at the end (e.g. "global." for root items, "." for child items).
        // Used to splice in the display_name when building effectiveDisplayPath for
        // parameterized instances.
        const relativeSuffixPrefix = relativeSuffix.substring(0, relativeSuffix.length - item.name.length);

        const paramCount = item.parameterized.length;

        // == Contexts that children of *this* item will use ===================
        const myContexts: ChildContext[] = [];

        for (const parentContext of parentContexts) {
            // Stable Ren'Py path for this node within this particular parent context.
            const myEffectiveRenpyPath = parentContext.effectiveRenpyPath + relativeSuffix;

            if (paramCount <= 1) {
                // Non-parameterized (or single-instance): one TestItem per parent context.
                const testItem = controller.createTestItem(myEffectiveRenpyPath, item.name, uri);
                testItem.range = range;
                testItem.description = item.description;
                parentContext.parentCollection.add(testItem);
                idMap.set(testItem.id, testItem);
                count++;

                myContexts.push({ parentCollection: testItem.children, effectiveRenpyPath: myEffectiveRenpyPath });
            } else {
                // Multi-param: one group container + one TestItem per instance,
                // all created under this particular parent context.
                const groupItem = controller.createTestItem(myEffectiveRenpyPath, item.name, uri);
                groupItem.range = range;
                groupItem.description = item.description;
                parentContext.parentCollection.add(groupItem);

                for (const param of item.parameterized) {
                    const instanceEffectiveRenpyPath = parentContext.effectiveRenpyPath + relativeSuffixPrefix + param.display_name;
                    const instanceItem = controller.createTestItem(instanceEffectiveRenpyPath, param.display_name, uri);
                    instanceItem.range = range;
                    groupItem.children.add(instanceItem);
                    idMap.set(instanceItem.id, instanceItem);
                    count++;

                    myContexts.push({ parentCollection: instanceItem.children, effectiveRenpyPath: instanceEffectiveRenpyPath });
                }
            }
        }

        containerMap.set(item.full_path, myContexts);
    }

    return count;
}

// == Main entry point ==========================================================

/**
 * Loads test metadata from navigation.json and builds the VS Code TestItem tree.
 *
 * Refresh pipeline:
 *   - If `forceRefresh` or mode=always-refresh: generate new navigation.json first.
 *   - Otherwise (cache-first): use the existing navigation.json if present.
 */
export async function discoverTests(
    controller: vscode.TestController,
    idMap: Map<string, vscode.TestItem>,
    settings: TestingSettings,
    forceRefresh: boolean,
): Promise<DiscoveryResult> {
    logMessage(vscode.LogLevel.Info, `[renpy-vscode] Test Discovery: starting (forceRefresh=${forceRefresh}, mode=${settings.discoveryRefreshMode})`);

    const shouldCompile = forceRefresh || settings.discoveryRefreshMode === "always-refresh";

    const initialLoad = await compileAndLoadNavigationJson(settings.renpyExecutablePath, shouldCompile);
    if (initialLoad.error) {
        logMessage(vscode.LogLevel.Warning, `[renpy-vscode] Test Discovery: ${initialLoad.error}`);
        surfaceDiscoveryError(controller, initialLoad.error);
        return { success: false, error: initialLoad.error, testCount: 0 };
    }

    let navData = initialLoad.navData ?? {};

    // If navigation.json has no test section, it was compiled without test metadata
    // (e.g. by an older version of Ren'Py). Trigger a silent recompile to get it,
    // but only when we haven't already compiled this pass.
    if (!("test" in navData) && !shouldCompile) {
        logMessage(vscode.LogLevel.Info, "[renpy-vscode] Test Discovery: navigation.json has no test section; recompiling to get test metadata.");
        const reload = await compileAndLoadNavigationJson(settings.renpyExecutablePath, true);
        if (reload.navData) {
            navData = reload.navData;
        } else if (reload.error) {
            logMessage(vscode.LogLevel.Warning, `[renpy-vscode] Test Discovery: auto-recompile for test metadata failed`);
        }
    }

    const navTest = (navData["test"] ?? {}) as NavTestSection;

    // Validate the test section schema before doing any tree manipulation.
    if (!navTest.items || navTest.items.length === 0) {
        resetDiscoveryState(controller, idMap);
        if (!("test" in navData)) {
            logMessage(vscode.LogLevel.Info, "[renpy-vscode] Test Discovery: no test section in navigation.json.");
        } else {
            logMessage(vscode.LogLevel.Info, "[renpy-vscode] Test Discovery: no test items found in navigation.json.");
        }
        surfaceNoTestsFound(controller);
        return { success: true, testCount: 0 };
    }

    // Validate and collect items.
    const validItems: NavTestItem[] = [];
    for (const raw of navTest.items) {
        if (isValidNavTestItem(raw)) {
            validItems.push(raw);
        } else {
            logMessage(vscode.LogLevel.Warning, `[renpy-vscode] Test Discovery: skipping malformed item: ${JSON.stringify(raw).slice(0, 200)}`);
        }
    }

    // Clear existing tree and mappings before rebuilding.
    resetDiscoveryState(controller, idMap);

    // Build the TestItem tree.
    const testCount = buildTree(controller, idMap, validItems);

    logMessage(vscode.LogLevel.Info, `[renpy-vscode] Test Discovery: Complete. ${testCount} runnable item(s) in tree.`);
    return { success: true, testCount };
}

function resetDiscoveryState(controller: vscode.TestController, idMap: Map<string, vscode.TestItem>): void {
    controller.items.replace([]);
    idMap.clear();
}

function surfaceNoTestsFound(controller: vscode.TestController): void {
    const item = controller.createTestItem("renpy-no-tests", "No Ren'Py tests found");
    item.description = "Learn more\u2026";
    item.error = new vscode.MarkdownString("[Learn more about Ren'Py testing](https://www.renpy.org/doc/html/testcases.html)");
    controller.items.replace([item]);
}

function surfaceDiscoveryError(controller: vscode.TestController, message: string): void {
    const errorItem = controller.createTestItem("renpy-discovery-error", "Test discovery failed, see output");
    errorItem.error = message;
    controller.items.replace([errorItem]);
}
