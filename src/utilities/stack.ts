import { Vector } from "./vector";

/**
 * Represents a Last-In-First-Out (LIFO) collection of items.
 * @template T The type of elements stored in the stack.
 * @example
 * ```ts
 * const stack = new Stack<number>(3);
 * stack.push(1);
 * stack.push(2);
 * console.log(stack.peek()); // Output: 2
 * console.log(stack.pop());  // Output: 2
 * ```
 */
export class Stack<T> implements Iterable<T> {
    private buffer: Vector<T | null>;

    /**
     * Initializes a new instance of the `Stack`.
     * @param capacity The initial number of slots in the internal buffer.
     * @remarks If `capacity` is `0`, starts with an empty buffer.
     */
    constructor(capacity = 0) {
        this.buffer = new Vector<T | null>(capacity);
    }

    /**
     * Creates a shallow copy of the current stack.
     * @returns A new `Stack` containing the same elements and capacity.
     * @example
     * ```ts
     * const snapshot = stack.clone();
     * ```
     */
    public clone(): Stack<T> {
        const newStack = new Stack<T>(this.capacity);
        newStack.buffer = this.buffer.clone();
        return newStack;
    }

    /**
     * Returns an iterator over the stack’s elements from bottom (first pushed) to top (last pushed).
     * @returns An iterator yielding each element in insertion order.
     */
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
     * Pushes an item onto the top of the stack.
     * @param item The element to add.
     * @example
     * ```ts
     * stack.push("apple");
     * ```
     */
    public push(item: T) {
        this.buffer.pushBack(item);
    }

    /**
     * Removes and returns the item at the top of the stack.
     * @returns The element that was removed.
     * @throws `RangeError` if the stack is empty.
     * @example
     * ```ts
     * const last = stack.pop();
     * ```
     */
    public pop() {
        if (this.buffer.isEmpty()) {
            throw new RangeError("Stack was already empty. Can't pop another item.");
        }

        return this.buffer.popBack();
    }

    /**
     * Returns the item at the top of the stack without removing it.
     * @returns The element at the top, or `null` if the stack is empty.
     * @example
     * ```ts
     * const top = stack.peek();
     * ```
     */
    public peek() {
        return this.buffer.back();
    }

    /**
     * Gets the current capacity of the stack’s internal buffer.
     * @returns The maximum number of elements before resizing.
     */
    get capacity() {
        return this.buffer.capacity;
    }

    /**
     * Gets the number of elements currently in the stack.
     * @returns The count of items on the stack.
     */
    get size() {
        return this.buffer.size;
    }

    /**
     * Determines whether the stack is empty.
     * @returns `true` if no elements are present; otherwise, `false`.
     */
    public isEmpty() {
        return this.buffer.isEmpty();
    }

    /**
     * Removes all elements from the stack.
     * @param shrink If `true`, also resets the internal buffer’s capacity to zero.
     * @example
     * ```ts
     * stack.clear(true);
     * ```
     */
    public clear(shrink = false) {
        this.buffer.clear(shrink);
    }
}
