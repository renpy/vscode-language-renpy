import { expect } from "chai";
import * as sinon from "sinon";
import { CustomExecution, ShellExecution } from "vscode";

import { Configuration } from "src/configuration";
import { RenpyTaskProvider } from "src/task-provider";

describe("RenpyTaskProvider", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("should provide tasks that report the problem when no executable is configured", () => {
        sinon.stub(Configuration, "getRenpyExecutablePath").returns("");

        const tasks = new RenpyTaskProvider().provideTasks();

        expect(tasks.map((t) => t.name)).to.deep.equal(["compile", "dialogue", "lint", "rmpersistent"]);
        for (const task of tasks) {
            expect(task.execution).to.be.instanceOf(CustomExecution);
        }
    });

    it("should provide shell tasks that use the current executable setting", () => {
        const stub = sinon.stub(Configuration, "getRenpyExecutablePath").returns("/opt/renpy/renpy.sh");
        const provider = new RenpyTaskProvider();

        const first = provider.provideTasks()[0].execution as ShellExecution;
        expect(first).to.be.instanceOf(ShellExecution);
        expect(first.command).to.deep.include({ value: "/opt/renpy/renpy.sh" });

        stub.returns("/other/renpy.sh");
        const second = provider.provideTasks()[0].execution as ShellExecution;
        expect(second.command).to.deep.include({ value: "/other/renpy.sh" });
    });
});
