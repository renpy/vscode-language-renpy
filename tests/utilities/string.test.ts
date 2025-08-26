import { expect } from "chai";

import { escapeRegExpCharacters } from "src/utilities/string";

describe("string", () => {
    describe("escapeRegExpCharacters", () => {
        it("should escape basic regex special characters", () => {
            const input = "test.string";
            const expected = "test\\.string";

            expect(escapeRegExpCharacters(input)).to.equal(expected);
        });

        it("should escape all regex special characters", () => {
            const input = "[-\\{}*+?|^$.,[]()#\\s]";
            const expected = "\\[\\-\\\\\\{\\}\\*\\+\\?\\|\\^\\$\\.\\,\\[\\]\\(\\)\\#\\\\s\\]";

            expect(escapeRegExpCharacters(input)).to.equal(expected);
        });

        it("should handle empty string", () => {
            expect(escapeRegExpCharacters("")).to.equal("");
        });

        it("should handle string with no special characters", () => {
            const input = "normaltext";
            expect(escapeRegExpCharacters(input)).to.equal(input);
        });

        it("should handle string with spaces", () => {
            const input = "test string with spaces";
            const expected = "test\\ string\\ with\\ spaces";

            expect(escapeRegExpCharacters(input)).to.equal(expected);
        });

        it("should handle mixed content", () => {
            const input = "test (group) [class] {count}";
            const expected = "test\\ \\(group\\)\\ \\[class\\]\\ \\{count\\}";

            expect(escapeRegExpCharacters(input)).to.equal(expected);
        });
    });
});
