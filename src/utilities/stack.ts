export class Stack<T> implements Iterable<T> {
    private buffer: Array<T | null> = [];

    private headPtr = -1;
    private itemCount = 0;

    private headRef: T | null = null;

    /**
     * Construct a new empty stack
     * @param capacity The amount of items this stack should be able to hold
     */
    constructor(capacity = 0) {
        if (capacity > 0) this.buffer = new Array<T | null>(capacity).fill(null);
    }

    [Symbol.iterator](): Iterator<T> {
        let index = 0;
        return {
            next: () => {
                if (index >= this.size) {
                    return { done: true, value: null };
                }
                return { done: false, value: this.buffer[index++] as T };
            },
        };
    }

    /**
     * Add a new item on top of the stack
     * @param item The item to add
     */
    public push(item: T) {
        if (this.size === this.capacity) this._grow();

        ++this.itemCount;
        ++this.headPtr;

        this.buffer[this.headPtr] = item;
        this.headRef = this.buffer[this.headPtr];
    }

    /**
     * Get the item at the top of the stack, and remove it from the stack
     * @returns The item at the top
     */
    public pop() {
        if (this.headPtr === -1) throw new RangeError("Stack was already empty. Can't pop another item.");

        const result = this.buffer[this.headPtr];

        this.buffer[this.headPtr] = null;
        --this.itemCount;
        --this.headPtr;

        if (this.isEmpty()) {
            this.headRef = null;
        } else {
            this.headRef = this.buffer[this.headPtr];
        }

        return result;
    }

    /**
     * Get the item at the top of the stack, without touching the stack
     * @returns The item at the top
     */
    public peek() {
        return this.headRef;
    }

    /**
     * Get the amount of items that the stack is able to hold at this time
     * @returns The amount items that could fit in the internal memory buffer
     */
    get capacity() {
        return this.buffer.length;
    }

    /**
     * Get the amount of items that are on the stack
     * @returns The number of items
     */
    get size() {
        return this.itemCount;
    }

    /**
     * Test if the stack is currently empty
     * @returns True if the stack currently contains no items
     */
    public isEmpty() {
        return this.itemCount === 0;
    }

    /**
     * Remove all items from the stack
     * @param shrink If true it will also shrink the internal memory buffer to zero
     */
    public clear(shrink = false) {
        for (let i = 0; i < this.itemCount; ++i) {
            this.buffer[i] = null;
        }

        this.itemCount = 0;
        this.headPtr = -1;
        this.headRef = null;

        if (shrink) this.shrink();
    }

    /**
     * Shrink the internal memory buffer to match the size of the stack
     */
    public shrink() {
        this.buffer.length = this.size;
    }

    /**
     * Grow the buffer to double the current capacity
     */
    private _grow() {
        const currentCapacity = Math.max(this.capacity, 1);

        this.buffer = this.buffer.concat(new Array<T | null>(currentCapacity).fill(null));
    }
}
