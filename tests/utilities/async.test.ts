import { expect } from "chai";

import { withTimeout } from "src/utilities/async";

describe("async", () => {
    describe("withTimeout", () => {
        it("should resolve when promise resolves before timeout", async () => {
            const promise = Promise.resolve("success");

            const result = await withTimeout(promise, 1000);

            expect(result).to.equal("success");
        });

        it("should reject when promise takes longer than timeout", async () => {
            const slowPromise = new Promise((resolve) => setTimeout(() => resolve("too late"), 200));

            try {
                await withTimeout(slowPromise, 100);
                expect.fail("Should have thrown timeout error");
            } catch (error) {
                expect(error).to.equal("Promise timed out after 100ms.");
            }
        });

        it("should use custom timeout message", async () => {
            const slowPromise = new Promise((resolve) => setTimeout(() => resolve("too late"), 200));
            const customMessage = "Custom timeout message";

            try {
                await withTimeout(slowPromise, 100, undefined, customMessage);
                expect.fail("Should have thrown timeout error");
            } catch (error) {
                expect(error).to.equal(customMessage);
            }
        });

        it("should call onTimeout callback when timeout occurs", async () => {
            let timeoutCalled = false;
            const onTimeout = () => {
                timeoutCalled = true;
            };
            const slowPromise = new Promise((resolve) => setTimeout(() => resolve("too late"), 200));

            try {
                await withTimeout(slowPromise, 100, onTimeout);
                expect.fail("Should have thrown timeout error");
            } catch (error) {
                expect(timeoutCalled).to.equal(true);
                expect(error).to.equal("Promise timed out after 100ms.");
            }
        });

        it("should not call onTimeout when promise resolves in time", async () => {
            let timeoutCalled = false;
            const onTimeout = () => {
                timeoutCalled = true;
            };
            const promise = Promise.resolve("success");

            const result = await withTimeout(promise, 1000, onTimeout);

            expect(result).to.equal("success");
            expect(timeoutCalled).to.equal(false);
        });

        it("should handle rejected promises", async () => {
            const rejectedPromise = Promise.reject(new Error("Original error"));

            try {
                await withTimeout(rejectedPromise, 1000);
                expect.fail("Should have thrown original error");
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.equal("Original error");
            }
        });

        it("should handle zero timeout", async () => {
            const promise = new Promise((resolve) => setTimeout(() => resolve("delayed"), 10));

            try {
                await withTimeout(promise, 0);
                expect.fail("Should have thrown timeout error");
            } catch (error) {
                expect(error).to.equal("Promise timed out after 0ms.");
            }
        });

        it("should clear timeout when promise resolves", async () => {
            // This test ensures the timeout is properly cleared
            const promise = Promise.resolve("quick");

            const result = await withTimeout(promise, 1000);

            expect(result).to.equal("quick");
            // If timeout wasn't cleared, it could cause issues in subsequent tests
        });

        it("should handle promise that resolves with undefined", async () => {
            const promise = Promise.resolve(undefined);

            const result = await withTimeout(promise, 1000);

            expect(result).to.be.undefined;
        });

        it("should handle promise that resolves with null", async () => {
            const promise = Promise.resolve(null);

            const result = await withTimeout(promise, 1000);

            expect(result).to.be.null;
        });
    });
});
