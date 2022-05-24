export class Vector<T> {
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

    /**
     * Add a new item to the end of the vector
     * @param item The item to add
     */
    public pushBack(item: T) {
        if (this.size() === this.capacity()) {
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
        if (index >= this.itemCount) throw new RangeError("Index out of range");
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

    public erase(item: T) {
        throw new Error("Not yet implemented");
    }

    public eraseAt(index: number) {
        throw new Error("Not yet implemented");
    }

    /**
     * Get the amount of items that the vector is able to hold at this time
     * @returns The amount items that could fit in the internal memory buffer
     */
    public capacity() {
        return this.buffer.length;
    }

    /**
     * Get the amount of items that are on the vector
     * @returns The number of items
     */
    public size() {
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
        this.buffer.length = this.size();
    }

    /**
     * Grow the buffer to double the current capacity
     */
    private _grow() {
        const currentCapacity = Math.max(this.capacity(), 1);

        this.buffer = this.buffer.concat(new Array<T | null>(currentCapacity).fill(null));
    }
}
