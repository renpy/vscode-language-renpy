import * as fs from "fs";
import * as path from "path";
import { Hover, MarkdownString, Position, Range, TextDocument, Uri, workspace, WorkspaceFolder } from "vscode";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"]);

const RESERVED_TOKENS = new Set(["at", "as", "behind", "onlayer", "zorder", "with", "if"]);

interface SceneHoverParsed {
    imageName: string;
    range: Range;
}

interface SceneHoverResolved {
    status: "indexing" | "missing" | "ready";
    filePath?: string;
}

export class SceneHoverImageIndex {
    private workspaceRoot: string;
    private explicit: Map<string, string> = new Map();
    private implicit: Map<string, string> = new Map();
    private imageRoots: string[] = [];
    private scriptRoots: string[] = [];
    public isReady: boolean = false;
    public isBuilding: boolean = false;

    constructor(workspaceFolder: WorkspaceFolder) {
        this.workspaceRoot = workspaceFolder.uri.fsPath;
    }

    public refreshConfiguration(): void {
        const config = workspace.getConfiguration("renpy");
        this.scriptRoots = this.normalizeWorkspacePaths(
            config.get<string[]>("sceneHover.scriptRoots", ["game"])
        );
        this.imageRoots = this.normalizeWorkspacePaths(
            config.get<string[]>("sceneHover.imageRoots", ["game/images"])
        );
    }

    public rebuild(): void {
        this.explicit.clear();
        this.implicit.clear();
        this.refreshConfiguration();

        for (const scriptRoot of this.scriptRoots) {
            this.walkFiles(scriptRoot, (filePath: string) => {
                if (path.extname(filePath).toLowerCase() !== ".rpy") {
                    return;
                }

                const content = this.safeReadText(filePath);
                if (!content) {
                    return;
                }

                const pattern = /^\s*image\s+(.+?)\s*=\s*["']([^"']+)["']/gm;
                for (const match of content.matchAll(pattern)) {
                    const imageName = this.normalizeImageName(match[1]);
                    const sourceValue = match[2].trim();
                    const resolved = this.resolveExplicitPath(sourceValue);
                    if (!imageName || !resolved || !fs.existsSync(resolved)) {
                        continue;
                    }

                    if (!this.explicit.has(imageName)) {
                        this.explicit.set(imageName, resolved);
                    }
                }
            });
        }

        for (const imageRoot of this.imageRoots) {
            this.walkFiles(imageRoot, (filePath: string) => {
                const extension = path.extname(filePath).toLowerCase();
                if (!IMAGE_EXTENSIONS.has(extension)) {
                    return;
                }

                const baseName = path.basename(filePath, extension);
                const imageName = this.normalizeAutoImageName(baseName);
                if (!imageName) {
                    return;
                }

                if (!this.implicit.has(imageName)) {
                    this.implicit.set(imageName, filePath);
                }
            });
        }

        this.isReady = true;
        this.isBuilding = false;
    }

    public requestRebuild(): void {
        if (this.isBuilding) {
            return;
        }

        this.isBuilding = true;
        setTimeout(() => {
            try {
                this.rebuild();
            } catch {
                this.isBuilding = false;
            }
        }, 0);
    }

    public resolve(imageName: string): SceneHoverResolved {
        if (!this.isReady) {
            this.requestRebuild();
            return { status: "indexing" };
        }

        const normalized = this.normalizeImageName(imageName);
        if (!normalized) {
            return { status: "missing" };
        }

        const filePath =
            this.explicit.get(normalized) || this.implicit.get(normalized) || null;
        if (!filePath) {
            return { status: "missing" };
        }

        return { status: "ready", filePath };
    }

    public provideSceneHover(document: TextDocument, position: Position): Hover | null {
        const parsed = this.parseSceneOrShow(document.lineAt(position.line).text, position.line);
        if (!parsed) {
            return null;
        }

        if (!parsed.range.contains(position)) {
            return null;
        }

        const resolved = this.resolve(parsed.imageName);
        if (resolved.status === "indexing") {
            return new Hover(
                new MarkdownString("Ren'Py Scene Hover is indexing images. Hover again in a moment."),
                parsed.range
            );
        }

        if (resolved.status !== "ready") {
            const fallback = new MarkdownString();
            fallback.appendCodeblock(parsed.imageName, "renpy");
            fallback.appendMarkdown("\n\nNo image file resolved for this tag.");
            return new Hover(fallback, parsed.range);
        }

        const filePath = resolved.filePath!;
        const markdown = new MarkdownString("", true);
        markdown.supportHtml = true;
        markdown.isTrusted = true;

        const previewWidth = Number(
            workspace.getConfiguration("renpy").get("sceneHover.previewWidth", 540)
        );

        const stat = this.safeStat(filePath);
        const maxPreviewBytes = Number(
            workspace.getConfiguration("renpy").get("sceneHover.maxPreviewBytes", 1572864)
        );
        if (stat && stat.size <= maxPreviewBytes) {
            const imageUri = Uri.file(filePath);
            markdown.appendMarkdown(
                `<img src="${imageUri}" width="${previewWidth}" style="max-height:300px;" />`
            );
            markdown.appendMarkdown("\n\n");
        }

        markdown.appendCodeblock(parsed.imageName, "renpy");
        markdown.appendMarkdown(
            `\n\n\`${this.relativeToWorkspace(filePath)}\``
        );

        if (stat && stat.size > maxPreviewBytes) {
            markdown.appendMarkdown(
                `\n\nPreview skipped: file is ${this.formatBytes(stat.size)} and exceeds \`renpy.sceneHover.maxPreviewBytes\`.`
            );
        }

        return new Hover(markdown, parsed.range);
    }

    private normalizeWorkspacePaths(values: string[]): string[] {
        return values
            .map((value: string) => path.resolve(this.workspaceRoot, value))
            .filter((value: string) => fs.existsSync(value));
    }

    private walkFiles(rootPath: string, onFile: (filePath: string) => void): void {
        if (!rootPath || !fs.existsSync(rootPath)) {
            return;
        }

        const stack = [rootPath];
        while (stack.length) {
            const current = stack.pop();
            if (!current) {
                continue;
            }

            let entries;
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const entry of entries) {
                const fullPath = path.join(current, entry.name);
                if (entry.isDirectory()) {
                    stack.push(fullPath);
                } else if (entry.isFile()) {
                    onFile(fullPath);
                }
            }
        }
    }

    private normalizeImageName(value: string): string {
        return value.trim().replace(/\s+/g, " ").toLowerCase();
    }

    private normalizeAutoImageName(baseName: string): string {
        return this.normalizeImageName(baseName.replace(/@\d+$/i, ""));
    }

    private resolveExplicitPath(declaredPath: string): string | null {
        const candidates = [
            path.resolve(this.workspaceRoot, "game", declaredPath),
            path.resolve(this.workspaceRoot, declaredPath),
        ];

        for (const imageRoot of this.imageRoots) {
            candidates.push(path.resolve(imageRoot, declaredPath));
        }

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return null;
    }

    private relativeToWorkspace(filePath: string): string {
        return path.relative(this.workspaceRoot, filePath).split(path.sep).join("/");
    }

    private safeReadText(filePath: string): string | null {
        try {
            return fs.readFileSync(filePath, "utf8");
        } catch {
            return null;
        }
    }

    private safeStat(filePath: string): fs.Stats | null {
        try {
            return fs.statSync(filePath);
        } catch {
            return null;
        }
    }

    private formatBytes(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    private parseSceneOrShow(lineText: string, lineNumber: number): SceneHoverParsed | null {
        const statement = lineText.match(/^(\s*)(scene|show)\s+(.+?)\s*$/);
        if (!statement) {
            return null;
        }

        const statementText = statement[3];
        if (/^expression\b/i.test(statementText)) {
            return null;
        }

        const tokens: { value: string; offset: number }[] = [];
        const tokenPattern = /\S+/g;
        let match;
        while ((match = tokenPattern.exec(statementText)) !== null) {
            const value = match[0];
            if (RESERVED_TOKENS.has(value.toLowerCase())) {
                break;
            }
            tokens.push({
                value,
                offset: match.index,
            });
        }

        if (!tokens.length) {
            return null;
        }

        const raw = tokens.map((token) => token.value).join(" ");
        const statementTextStart = lineText.indexOf(
            statementText,
            statement[1].length + statement[2].length
        );
        if (statementTextStart < 0) {
            return null;
        }

        const rawStart = statementTextStart + tokens[0].offset;
        if (rawStart < 0) {
            return null;
        }

        return {
            imageName: raw,
            range: new Range(
                new Position(lineNumber, statement[1].length),
                new Position(lineNumber, lineText.length)
            ),
        };
    }
}
