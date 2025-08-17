import { expect } from "chai";

import { Stack } from "src/types";

describe("Stack", () => {
    let stack: Stack<number>;

    beforeEach(() => {
        stack = new Stack<number>();
    });

    it("should create empty stack with default capacity", () => {
        expect(stack.size).to.equal(0);
        expect(stack.capacity).to.equal(0);
        expect(stack.isEmpty()).to.equal(true);
    });

    it("should create stack with specified capacity", () => {
        const stackWithCapacity = new Stack<number>(10);
        expect(stackWithCapacity.capacity).to.equal(10);
        expect(stackWithCapacity.size).to.equal(0);
        expect(stackWithCapacity.isEmpty()).to.equal(true);
    });

    it("should push items to stack", () => {
        stack.push(1);
        stack.push(2);
        stack.push(3);

        expect(stack.size).to.equal(3);
        expect(stack.isEmpty()).to.equal(false);
    });

    it("should peek at top item without removing it", () => {
        stack.push(1);
        stack.push(2);
        stack.push(3);

        expect(stack.peek()).to.equal(3);
        expect(stack.size).to.equal(3);
    });

    it("should pop items from stack in LIFO order", () => {
        stack.push(1);
        stack.push(2);
        stack.push(3);

        expect(stack.pop()).to.equal(3);
        expect(stack.pop()).to.equal(2);
        expect(stack.pop()).to.equal(1);
        expect(stack.size).to.equal(0);
        expect(stack.isEmpty()).to.equal(true);
    });

    it("should throw error when popping from empty stack", () => {
        expect(() => stack.pop()).to.throw(RangeError, "Stack was already empty. Can't pop another item.");
    });

    it("should return null when peeking empty stack", () => {
        expect(stack.peek()).to.be.null;
    });

    it("should be iterable", () => {
        stack.push(1);
        stack.push(2);
        stack.push(3);

        const values: number[] = [];
        for (const value of stack) {
            values.push(value);
        }

        expect(values).to.deep.equal([1, 2, 3]);
    });

    it("should clone stack correctly", () => {
        stack.push(1);
        stack.push(2);
        stack.push(3);

        const clonedStack = stack.clone();

        expect(clonedStack.size).to.equal(stack.size);
        expect(clonedStack.capacity).to.equal(stack.capacity);
        expect(clonedStack.peek()).to.equal(stack.peek());

        // Verify they are independent
        clonedStack.push(4);
        expect(stack.size).to.equal(3);
        expect(clonedStack.size).to.equal(4);
    });

    it("should clear stack without shrinking by default", () => {
        const stackWithCapacity = new Stack<number>(10);
        stackWithCapacity.push(1);
        stackWithCapacity.push(2);

        stackWithCapacity.clear();

        expect(stackWithCapacity.size).to.equal(0);
        expect(stackWithCapacity.isEmpty()).to.equal(true);
        expect(stackWithCapacity.capacity).to.equal(10); // Should maintain capacity
    });

    it("should clear stack and shrink when requested", () => {
        const stackWithCapacity = new Stack<number>(10);
        stackWithCapacity.push(1);
        stackWithCapacity.push(2);

        stackWithCapacity.clear(true);

        expect(stackWithCapacity.size).to.equal(0);
        expect(stackWithCapacity.isEmpty()).to.equal(true);
        expect(stackWithCapacity.capacity).to.equal(0); // Should shrink
    });

    it("should handle string type", () => {
        const stringStack = new Stack<string>();

        stringStack.push("hello");
        stringStack.push("world");

        expect(stringStack.size).to.equal(2);
        expect(stringStack.peek()).to.equal("world");
        expect(stringStack.pop()).to.equal("world");
        expect(stringStack.pop()).to.equal("hello");
    });

    it("should handle complex object types", () => {
        interface TestObject {
            id: number;
            name: string;
        }

        const objectStack = new Stack<TestObject>();
        const obj1 = { id: 1, name: "first" };
        const obj2 = { id: 2, name: "second" };

        objectStack.push(obj1);
        objectStack.push(obj2);

        expect(objectStack.size).to.equal(2);
        expect(objectStack.peek()).to.deep.equal(obj2);
        expect(objectStack.pop()).to.deep.equal(obj2);
        expect(objectStack.pop()).to.deep.equal(obj1);
    });

    it("should maintain capacity when growing", () => {
        const smallStack = new Stack<number>(2);

        // Fill beyond initial capacity
        smallStack.push(1);
        smallStack.push(2);
        smallStack.push(3);
        smallStack.push(4);
        smallStack.push(5);

        expect(smallStack.size).to.equal(5);
        expect(smallStack.capacity).to.be.greaterThan(2);
    });

    it("should handle negative capacity in constructor", () => {
        expect(() => new Stack<number>(-1)).to.throw(RangeError, /capacity must be a non-negative number/);
    });
});
