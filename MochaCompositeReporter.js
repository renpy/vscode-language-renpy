/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

const { reporters } = require("mocha");
const MochaJUnitReporter = require("mocha-junit-reporter");

class CompositeReporter extends reporters.Base {
    constructor(runner, options) {
        super(runner, options);
        const reporterOptions = (options && (options.reporterOptions ?? options.reporterOption)) ?? {};

        this.reporters = {
            spec: new reporters.Spec(runner, { reporterOption: reporterOptions.spec }),
            json: new reporters.JSON(runner, { reporterOption: reporterOptions.json }),
            // MochaJunitReporter is an older style reporter that expects options under `reporterOptions` key.
            junit: new MochaJUnitReporter(runner, { reporterOptions: reporterOptions.junit }),
        };
    }
}

module.exports = CompositeReporter;
