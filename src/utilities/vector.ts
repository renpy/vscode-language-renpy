/**
 * A dynamically sized array that can be used to store items of any type.
 */
export class Vector<T> implements Iterable<T> {
    private buffer: Array<T | null> = [];

    private headPtr = -1;
    private itemCount = 0;

    private tailRef: T | null = null;
    private headRef: T | null = null;

    /**
     * Construct a new empty vector
     * @param capacity The amount of items this vector should be able to hold
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
     * Add a new item to the end of the vector
     * @param item The item to add
     */
    public pushBack(item: T) {
        if (this.size === this.capacity) {
            this._grow();
        }

        ++this.itemCount;
        ++this.headPtr;

        this.buffer[this.headPtr] = item;
        this.headRef = this.buffer[this.headPtr];

        if (this.headPtr === 0) {
            this.tailRef = this.buffer[this.headPtr];
        }
    }

    /**
     * Sort the vector using the specified comparison function
     * @param compareFn The comparison function to use
     */
    public sort(compareFn: (a: T, b: T) => number) {
        this.buffer.sort((a, b) => {
            if (a === null || b === null) return 0;
            return compareFn(a, b);
        });
    }

    /**
     * Get the item at the end of the vector, and remove it from the vector
     * @returns The item at the end
     */
    public popBack() {
        if (this.headPtr === -1) throw new RangeError("Vector was already empty. Can't pop another item.");

        const result = this.buffer[this.headPtr];

        this.buffer[this.headPtr] = null;
        --this.itemCount;
        --this.headPtr;

        if (this.isEmpty()) {
            this.headRef = null;
            this.tailRef = null;
        } else {
            this.headRef = this.buffer[this.headPtr];
        }

        return result;
    }

    public at(index: number): T {
        if (index < 0 || index >= this.itemCount) throw new RangeError("Index out of range");
        // Convert to T since we only added the null type to create a storage buffer
        return this.buffer[index] as T;
    }

    public front() {
        return this.tailRef;
    }

    public back() {
        return this.headRef;
    }

    /**
     * Insert a new element at the specified index, pushing the remaining items to the back
     * @param item The item to insert
     * @param index The index to insert the item at
     */
    public insert(item: T, index: number) {
        throw new Error("Not yet implemented");
    }

    /**
     * Remove the first occurrence of the item from the vector, if it exists
     * @param item The item to remove
     */
    public erase(item: T) {
        const index = this.indexOf(item);
        this.eraseAt(index);
    }

    /**
     * Remove the item at the specified index
     * @param index The index of the item to remove
     * @throws RangeError if the index is out of range
     */
    public eraseAt(index: number) {
        if (index < 0 || index >= this.itemCount) throw new RangeError("Index out of range");

        // Move all items after the index to the left
        for (let i = index; i < this.itemCount - 1; ++i) {
            this.buffer[i] = this.buffer[i + 1];
        }
        this.popBack();
    }

    /**
     * Swap the items at the specified indices
     * @param elementIndexA The index of the first item
     * @param elementIndexB The index of the second item
     * @throws RangeError if either index is out of range
     */
    public swapElements(elementIndexA: number, elementIndexB: number) {
        if (elementIndexA < 0 || elementIndexA >= this.itemCount) throw new RangeError("ElementIndexA out of range");
        if (elementIndexB < 0 || elementIndexB >= this.itemCount) throw new RangeError("ElementIndexB out of range");

        const temp = this.buffer[elementIndexB];
        this.buffer[elementIndexB] = this.buffer[elementIndexA];
        this.buffer[elementIndexA] = temp;
    }

    public forEach(callback: (item: T) => void) {
        for (let i = 0; i < this.itemCount; ++i) {
            callback(this.buffer[i] as T);
        }
    }

    /**
     * Swap the item at the specified index with the item at the back of the vector
     * @param index The index of the item to swap to the back
     * @throws RangeError if the index is out of range
     */
    public swapToBack(index: number) {
        if (index < 0 || index >= this.itemCount) throw new RangeError("Index out of range");

        const temp = this.back();
        this.buffer[this.headPtr] = this.buffer[index];
        this.buffer[index] = temp;
    }

    /**
     * Returns the index of the first occurrence of a value in an array, or -1 if it is not present.
     * @param searchElement The value to locate in the array.
     * @param fromIndex The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.
     */
    public indexOf(item: T, fromIndex?: number) {
        const index = this.buffer.indexOf(item, fromIndex);
        if (index >= this.itemCount) return -1;

        return index;
    }

    /**
     * Get the amount of items that the vector is able to hold at this time
     * @returns The amount items that could fit in the internal memory buffer
     */
    get capacity() {
        return this.buffer.length;
    }

    /**
     * Get the amount of items that are on the vector
     * @returns The number of items
     */
    get size() {
        return this.itemCount;
    }

    /**
     * Test if the vector is currently empty
     * @returns True if the vector currently contains no items
     */
    public isEmpty() {
        return this.itemCount === 0;
    }

    /**
     * Copies all the elements of the internal buffer to an array
     * @returns The new array with copied contents
     */
    public toArray() {
        // Convert to T[] since we only added the null type to create a storage buffer
        return this.buffer.slice(0, this.itemCount) as T[];
    }

    /**
     * Remove all items from the vector
     * @param shrink If true it will also shrink the internal memory buffer to zero
     */
    public clear(shrink = false) {
        for (let i = 0; i < this.itemCount; ++i) {
            this.buffer[i] = null;
        }

        this.itemCount = 0;
        this.headPtr = -1;
        this.headRef = null;
        this.tailRef = null;

        if (shrink) this.shrink();
    }

    /**
     * Shrink the internal memory buffer to match the size of the vector
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
