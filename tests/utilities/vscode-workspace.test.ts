import { expect } from "chai";
import mockFs from "mock-fs";
import * as sinon from "sinon";
import { Uri, workspace, WorkspaceFolder } from "vscode";

import {
    cleanUpPath,
    extractFilename,
    extractFilenameWithoutExtension,
    getAudioFolder,
    getFileWithPath,
    getImagesFolder,
    getNavigationJsonFilepath,
    getWorkspaceFolder,
    stripWorkspaceFromFile,
} from "src/utilities/vscode-workspace";

describe("vscode-workspace", () => {
    let workspaceStub: sinon.SinonStub;

    beforeEach(() => {
        workspaceStub = sinon.stub(workspace, "workspaceFolders");
    });

    afterEach(() => {
        sinon.restore();
        mockFs.restore();
    });

    describe("extractFilename", () => {
        it("should extract filename from unix path", () => {
            expect(extractFilename("/foo/bar/baz.txt")).to.equal("baz.txt");
        });

        it("should extract filename from windows path", () => {
            expect(extractFilename("C:\\foo\\bar\\baz.txt")).to.equal("baz.txt");
        });

        it("should extract filename from mixed path separators", () => {
            expect(extractFilename("C:\\foo/bar\\baz.txt")).to.equal("baz.txt");
        });

        it("should handle path with no separators", () => {
            expect(extractFilename("filename.txt")).to.equal("filename.txt");
        });

        it("should handle empty string", () => {
            expect(extractFilename("")).to.be.null;
        });

        it("should handle null input", () => {
            expect(extractFilename(null as any)).to.be.null;
        });

        it("should handle undefined input", () => {
            expect(extractFilename(undefined as any)).to.be.null;
        });

        it("should handle path ending with separator", () => {
            expect(extractFilename("/foo/bar/")).to.equal("");
        });
    });

    describe("extractFilenameWithoutExtension", () => {
        it("should extract filename without extension", () => {
            expect(extractFilenameWithoutExtension("/foo/bar/baz.txt")).to.equal("baz");
        });

        it("should handle filename with multiple dots", () => {
            expect(extractFilenameWithoutExtension("/foo/bar/baz.min.js")).to.equal("baz.min");
        });

        it("should handle filename with no extension", () => {
            expect(extractFilenameWithoutExtension("/foo/bar/baz")).to.equal("baz");
        });

        it("should handle windows path", () => {
            expect(extractFilenameWithoutExtension("C:\\foo\\bar\\baz.txt")).to.equal("baz");
        });

        it("should handle empty string", () => {
            expect(extractFilenameWithoutExtension("")).to.be.null;
        });

        it("should handle null input", () => {
            expect(extractFilenameWithoutExtension(null as any)).to.be.null;
        });

        it("should handle undefined input", () => {
            expect(extractFilenameWithoutExtension(undefined as any)).to.be.null;
        });

        it("should handle path ending with separator", () => {
            expect(extractFilenameWithoutExtension("/foo/bar/")).to.be.null;
        });

        it("should handle hidden files", () => {
            expect(extractFilenameWithoutExtension("/foo/bar/.gitignore")).to.equal(".gitignore");
        });
    });

    describe("cleanUpPath", () => {
        it("should remove leading slash from windows drive path", () => {
            expect(cleanUpPath("/C:/projects")).to.equal("C:/projects");
        });

        it("should remove leading slash from windows drive path with different drive", () => {
            expect(cleanUpPath("/D:/workspace")).to.equal("D:/workspace");
        });

        it("should not modify normal unix paths", () => {
            expect(cleanUpPath("/home/user/projects")).to.equal("/home/user/projects");
        });

        it("should not modify relative paths", () => {
            expect(cleanUpPath("../projects")).to.equal("../projects");
        });

        it("should not modify paths without leading slash", () => {
            expect(cleanUpPath("C:/projects")).to.equal("C:/projects");
        });

        it("should handle empty string", () => {
            expect(cleanUpPath("")).to.equal("");
        });
    });

    describe("getWorkspaceFolder", () => {
        it("should return cleaned workspace folder path", () => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            workspaceStub.value([mockWorkspaceFolder]);

            expect(getWorkspaceFolder()).to.equal("C:/workspace");
        });

        it("should return cleaned workspace folder path with leading slash", () => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            // Simulate the path with leading slash that needs cleanup
            sinon.stub(mockWorkspaceFolder.uri, "path").value("/C:/workspace");
            workspaceStub.value([mockWorkspaceFolder]);

            expect(getWorkspaceFolder()).to.equal("C:/workspace");
        });

        it("should return empty string when no workspace folders", () => {
            workspaceStub.value(undefined);

            expect(getWorkspaceFolder()).to.equal("");
        });

        it("should return empty string when workspace folders is empty array", () => {
            workspaceStub.value([]);

            expect(getWorkspaceFolder()).to.equal("");
        });
    });

    describe("stripWorkspaceFromFile", () => {
        beforeEach(() => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            sinon.stub(mockWorkspaceFolder.uri, "path").value("C:/workspace");
            workspaceStub.value([mockWorkspaceFolder]);
        });

        it("should strip workspace path from file", () => {
            expect(stripWorkspaceFromFile("C:/workspace/game/script.rpy")).to.equal("game/script.rpy");
        });

        it("should handle case insensitive workspace path", () => {
            expect(stripWorkspaceFromFile("c:/workspace/game/script.rpy")).to.equal("game/script.rpy");
        });

        it("should handle mixed case workspace path", () => {
            expect(stripWorkspaceFromFile("C:/WORKSPACE/game/script.rpy")).to.equal("game/script.rpy");
        });

        it("should handle path not in workspace", () => {
            expect(stripWorkspaceFromFile("C:/other/game/script.rpy")).to.equal("C:/other/game/script.rpy");
        });

        it("should remove leading slashes", () => {
            expect(stripWorkspaceFromFile("/C:/workspace/game/script.rpy")).to.equal("game/script.rpy");
        });

        it("should handle relative paths", () => {
            expect(stripWorkspaceFromFile("game/script.rpy")).to.equal("game/script.rpy");
        });
    });

    describe("getFileWithPath", () => {
        beforeEach(() => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            sinon.stub(mockWorkspaceFolder.uri, "path").value("C:/workspace");
            workspaceStub.value([mockWorkspaceFolder]);
        });

        it("should return absolute path if filename starts with workspace", () => {
            const filename = "C:/workspace/game/script.rpy";
            expect(getFileWithPath(filename)).to.equal(filename);
        });

        it("should prefer game subfolder when file exists", () => {
            mockFs({
                "C:/workspace/game/script.rpy": "mock file content",
            });

            expect(getFileWithPath("script.rpy")).to.equal("C:/workspace/game/script.rpy");
        });

        it("should fallback to workspace root when file not in game folder", () => {
            mockFs({
                "C:/workspace/script.rpy": "mock file content",
            });

            expect(getFileWithPath("script.rpy")).to.equal("C:/workspace/script.rpy");
        });

        it("should return filename when no workspace folder", () => {
            workspaceStub.value(undefined);

            expect(getFileWithPath("script.rpy")).to.equal("script.rpy");
        });

        it("should return filename when empty workspace folder", () => {
            workspaceStub.value([]);

            expect(getFileWithPath("script.rpy")).to.equal("script.rpy");
        });
    });

    describe("getImagesFolder", () => {
        beforeEach(() => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            sinon.stub(mockWorkspaceFolder.uri, "path").value("C:/workspace");
            workspaceStub.value([mockWorkspaceFolder]);
        });

        it("should return game/images when it exists", () => {
            mockFs({
                "C:/workspace/game/images": {},
            });

            expect(getImagesFolder()).to.equal("C:/workspace/game/images");
        });

        it("should fallback to workspace/images when game/images doesn't exist", () => {
            mockFs({
                "C:/workspace/images": {},
            });

            expect(getImagesFolder()).to.equal("C:/workspace/images");
        });
    });

    describe("getAudioFolder", () => {
        beforeEach(() => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            sinon.stub(mockWorkspaceFolder.uri, "path").value("C:/workspace");
            workspaceStub.value([mockWorkspaceFolder]);
        });

        it("should return game/audio when it exists", () => {
            mockFs({
                "C:/workspace/game/audio": {},
            });

            expect(getAudioFolder()).to.equal("C:/workspace/game/audio");
        });

        it("should fallback to workspace/audio when game/audio doesn't exist", () => {
            mockFs({
                "C:/workspace/audio": {},
            });

            expect(getAudioFolder()).to.equal("C:/workspace/audio");
        });
    });

    describe("getNavigationJsonFilepath", () => {
        beforeEach(() => {
            const mockWorkspaceFolder: WorkspaceFolder = {
                uri: Uri.parse("file:///C:/workspace"),
                name: "workspace",
                index: 0,
            };
            sinon.stub(mockWorkspaceFolder.uri, "path").value("C:/workspace");
            workspaceStub.value([mockWorkspaceFolder]);
        });

        it("should return path to saves/navigation.json in game folder", () => {
            mockFs({
                "C:/workspace/game/saves/navigation.json": "{}",
            });

            expect(getNavigationJsonFilepath()).to.equal("C:/workspace/game/saves/navigation.json");
        });

        it("should return path to saves/navigation.json in workspace root", () => {
            mockFs({
                "C:/workspace/saves/navigation.json": "{}",
            });

            expect(getNavigationJsonFilepath()).to.equal("C:/workspace/saves/navigation.json");
        });
    });
});
