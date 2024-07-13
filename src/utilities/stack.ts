import { Vector } from "./vector";

export class Stack<T> implements Iterable<T> {
    private buffer: Vector<T | null>;

    /**
     * Construct a new empty stack
     * @param capacity The amount of items this stack should be able to hold
     */
    constructor(capacity = 0) {
        this.buffer = new Vector<T | null>(capacity);
    }

    /**
     * Create a copy of the current Stack so we can later restart from there.
     */
    public clone(): Stack<T> {
        const newStack = new Stack<T>(this.capacity);
        newStack.buffer = this.buffer.clone();
        return newStack;
    }

    [Symbol.iterator](): Iterator<T> {
        let index = 0;
        return {
            next: () => {
                if (index >= this.size) {
                    return { done: true, value: null };
                }
                return { done: false, value: this.buffer.at(index++) as T };
            },
        };
    }

    /**
     * Add a new item on top of the stack
     * @param item The item to add
     */
    public push(item: T) {
        this.buffer.pushBack(item);
    }

    /**
     * Get the item at the top of the stack, and remove it from the stack
     * @returns The item at the top
     */
    public pop() {
        if (this.buffer.isEmpty()) {
            throw new RangeError("Stack was already empty. Can't pop another item.");
        }

        return this.buffer.popBack();
    }

    /**
     * Get the item at the top of the stack, without touching the stack
     * @returns The item at the top
     */
    public peek() {
        return this.buffer.back();
    }

    /**
     * Get the amount of items that the stack is able to hold at this time
     * @returns The amount items that could fit in the internal memory buffer
     */
    get capacity() {
        return this.buffer.capacity;
    }

    /**
     * Get the amount of items that are on the stack
     * @returns The number of items
     */
    get size() {
        return this.buffer.size;
    }

    /**
     * Test if the stack is currently empty
     * @returns True if the stack currently contains no items
     */
    public isEmpty() {
        return this.buffer.isEmpty();
    }

    /**
     * Remove all items from the stack
     * @param shrink If true it will also shrink the internal memory buffer to zero
     */
    public clear(shrink = false) {
        this.buffer.clear(shrink);
    }
}
