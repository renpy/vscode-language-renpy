import type * as vscode from "vscode";

/**
 * Mapping between Ren'Py test IDs and TestItem instances.
 * Cleared and rebuilt on each discovery refresh.
 */
export class IdMap {
    private readonly idToItem = new Map<string, vscode.TestItem>();

    register(item: vscode.TestItem): void {
        this.idToItem.set(item.id, item);
    }

    get(id: string): vscode.TestItem | undefined {
        return this.idToItem.get(id);
    }

    clear(): void {
        this.idToItem.clear();
    }
}
