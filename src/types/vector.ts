/**
 * A generic, dynamic array implementation, similar to C++'s `std::vector`.
 *
 * The `Vector` class provides a resizable array-like container. Elements are
 * stored in a contiguous block of memory, allowing for efficient random access
 * via an index. When the number of elements exceeds the current capacity, the
 * internal buffer is automatically reallocated to accommodate more items.
 *
 * This class implements the `Iterable<T>` interface, allowing it to be used
 * directly in `for...of` loops and with the spread syntax (`...`).
 *
 * @template T The type of elements held in the vector.
 *
 * @example
 * ```typescript
 * // Create a new vector of numbers
 * const numbers = new Vector<number>();
 *
 * // Add elements to the end
 * numbers.pushBack(10);
 * numbers.pushBack(20);
 * numbers.pushBack(30);
 *
 * // Access elements by index
 * console.log(numbers.at(1)); // Outputs: 20
 *
 * // Get the current size and capacity
 * console.log(numbers.size);     // Outputs: 3
 * console.log(numbers.capacity); // Outputs: 3 (or more, depending on growth strategy)
 *
 * // Iterate over the vector
 * for (const num of numbers) {
 *   console.log(num); // Outputs: 10, 20, 30
 * }
 *
 * // Use with the spread operator
 * const arr = [...numbers]; // arr is [10, 20, 30]
 *
 * // Remove the last element
 * const last = numbers.popBack();
 * console.log(last); // Outputs: 30
 * console.log(numbers.size); // Outputs: 2
 * ```
 */
export class Vector<T> implements Iterable<T> {
    /**
     * The internal buffer to store the elements of the vector.
     * `null` values are used to represent empty or cleared slots.
     * @internal
     */
    private buffer: Array<T | null> = [];

    /**
     * The index pointer to the head of the vector.
     * It represents the index of the last element added.
     * An initial value of -1 signifies that the vector is empty.
     * @internal
     */
    private headPtr = -1;
    /**
     * The number of items currently stored in the vector.
     * @private
     */
    private itemCount = 0;

    /**
     * A reference to the last element in the vector.
     * This allows for O(1) push operations.
     * @internal
     */
    private tailRef: T | null = null;
    /**
     * A reference to the head (first element) of the collection.
     * It is `null` if the collection is empty.
     * @internal
     */
    private headRef: T | null = null;

    /**
     * Creates a new Vector instance.
     * @param - The initial capacity of the vector. If not provided, it defaults to 0.
     * @throws If the capacity is a negative number.
     * @example
     * // Create a vector with a default initial capacity
     * const vec1 = new Vector<number>();
     *
     * // Create a vector with a specific initial capacity
     * const vec2 = new Vector<string>(10);
     */
    constructor(capacity = 0) {
        this.reserve(capacity);
    }

    /**
     * Ensures that the vector has at least the specified capacity.
     * If the current capacity is less than the requested capacity,
     * the internal buffer is resized to accommodate the new capacity.
     *
     * @param capacity The minimum capacity that the vector should have.
     * @throws If the capacity is a negative number.
     * @returns This method does not return a value.
     * @sideeffect This method may modify the internal buffer of the vector.
     * @example
     * ```typescript
     * const vec = new Vector<number>();
     * console.log(vec.capacity); // Outputs: 0
     *
     * vec.reserve(10);
     * console.log(vec.capacity); // Outputs: 10
     *
     * vec.reserve(5);
     * console.log(vec.capacity); // Outputs: 10 (no change, as current capacity is already sufficient)
     * ```
     */
    public reserve(capacity: number) {
        if (capacity < 0) {
            throw new RangeError("Vector capacity must be a non-negative number.");
        }

        this.buffer = this.buffer.concat(new Array<T | null>(capacity - this.capacity).fill(null));
    }

    /**
     * Creates a shallow copy of the vector.
     * The elements themselves are not cloned.
     * @returns {Vector<T>} A new vector instance that is a shallow copy of this one.
     * @example
     * const vec1 = new Vector<number>();
     * vec1.pushBack(1);
     * vec1.pushBack(2);
     *
     * const vec2 = vec1.clone();
     * vec2.pushBack(3);
     *
     * console.log(vec1.size); // 2
     * console.log(vec2.size); // 3
     */
    public clone(): Vector<T> {
        const newVector = new Vector<T>(this.capacity);
        newVector.buffer = this.buffer.slice();
        newVector.headPtr = this.headPtr;
        newVector.itemCount = this.itemCount;
        newVector.tailRef = this.tailRef;
        newVector.headRef = this.headRef;
        return newVector;
    }

    /**
     * Gets an iterator for the vector.
     * This allows the vector to be used in `for...of` loops and with the spread operator.
     * @returns {Iterator<T>} An iterator for the elements in the vector.
     * @example
     * const vec = new Vector<number>();
     * vec.pushBack(1);
     * vec.pushBack(2);
     * for (const item of vec) {
     *   console.log(item); // 1, then 2
     * }
     * const arr = [...vec]; // [1, 2]
     */
    [Symbol.iterator](): Iterator<T> {
        let idx = 0;
        return {
            next: () => {
                if (idx >= this.size) {
                    return { done: true, value: null };
                }
                return { done: false, value: this.buffer[idx++] as T };
            },
        };
    }

    /**
     * Appends a new element to the end of the vector.
     *
     * If the vector's size has reached its capacity, this method triggers an
     * internal resizing of the buffer to accommodate the new element.
     *
     * @param item The element to be added to the vector.
     * @returns This method does not return a value.
     *
     * @sideEffects
     * - Modifies the vector in-place by adding the new element.
     * - Increments the `itemCount` property.
     * - May reallocate the internal buffer and copy existing elements if the
     *   vector's capacity is exceeded, which can be a costly operation.
     *
     * @example
     * ```typescript
     * const vec = new Vector<string>();
     * vec.pushBack("hello");
     * vec.pushBack("world");
     * // The vector now contains ["hello", "world"]
     * ```
     */
    public pushBack(item: T): void {
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
     * Sorts the elements of the vector in place.
     * This method mutates the vector and does not return a value.
     * It internally handles `null` values, so the provided compare function
     * does not need to account for them.
     *
     * @param compareFn A function that defines the sort order.
     * If `compareFn(a, b)` returns a value less than 0, `a` will come before `b`.
     * If `compareFn(a, b)` returns a value greater than 0, `b` will come before `a`.
     * If `compareFn(a, b)` returns 0, the order of `a` and `b` will not change.
     * @returns This method does not return a value; it sorts the vector in place.
     * @example
     * ```typescript
     * const vector = new Vector<number>();
     * vector.push(10, 1, 5);
     * // Sort in ascending order
     * vector.sort((a, b) => a - b);
     * // vector's internal buffer is now [1, 5, 10]
     *
     * // Sort in descending order
     * vector.sort((a, b) => b - a);
     * // vector's internal buffer is now [10, 5, 1]
     * ```
     */
    public sort(compareFn: (a: T, b: T) => number) {
        this.buffer.sort((a, b) => {
            if (a == null || b == null) {
                return 0;
            }
            return compareFn(a, b);
        });
    }

    /**
     * Removes and returns the last element from the vector.
     *
     * This operation modifies the vector in-place. If the vector becomes empty
     * after the pop operation, its internal references are reset.
     *
     * @returns The element that was removed from the end of the vector.
     * @throws {RangeError} Throws an error if the vector is empty and `popBack` is called.
     *
     * @example
     * ```typescript
     * const myVector = new Vector<string>();
     * myVector.pushBack("hello");
     * myVector.pushBack("world");
     *
     * const lastElement = myVector.popBack();
     * // lastElement is "world"
     * // myVector now contains only "hello"
     *
     * myVector.popBack(); // Removes "hello"
     * // myVector is now empty
     *
     * myVector.popBack(); // Throws RangeError: "Vector was already empty. Can't pop another item."
     * ```
     */
    public popBack(): T {
        if (this.headPtr === -1) {
            throw new RangeError("Vector was already empty. Can't pop another item.");
        }

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

        return result as T;
    }

    /**
     * Returns the element at a specified index in the vector.
     *
     * @param index The zero-based index of the element to retrieve.
     * @returns The element at the specified `index`.
     * @throws `RangeError` if the `index` is out of bounds (i.e., less than 0 or greater than or equal to the item count).
     * @example
     * ```typescript
     * const vector = new Vector<string>();
     * vector.push("hello");
     * vector.push("world");
     *
     * const element = vector.at(1);
     * console.log(element); // Outputs: "world"
     *
     * try {
     *   vector.at(5);
     * } catch (e) {
     *   console.error(e); // Throws RangeError: Index out of range
     * }
     * ```
     */
    public at(index: number): T {
        if (index < 0 || index >= this.itemCount) {
            throw new RangeError("Index out of range");
        }
        // Convert to T since we only added the null type to create a storage buffer
        return this.buffer[index] as T;
    }

    /**
     * Returns a reference to the last element in the vector.
     * Note: Despite the name `front`, this method returns the tail element.
     *
     * @returns A reference to the last element.
     * @example
     * ```typescript
     * const vector = new Vector<number>();
     * vector.push(10);
     * vector.push(20);
     * const last = vector.front();
     * console.log(last); // Outputs: 20
     * ```
     */
    public front() {
        return this.tailRef;
    }

    /**
     * Gets the last element in the vector.
     *
     * This method provides access to the most recently added element without removing it.
     * It does not throw an exception if the vector is empty; instead, it will return `undefined`.
     *
     * @returns The last element of the vector, or `undefined` if the vector is empty.
     * @example
     * ```typescript
     * const myVector = new Vector<string>();
     * myVector.push("hello");
     * myVector.push("world");
     *
     * const lastElement = myVector.back();
     * console.log(lastElement); // Outputs: "world"
     * ```
     */
    public back() {
        return this.headRef;
    }

    /**
     * Inserts an item at a specific index in the vector.
     *
     * This method shifts all elements from the specified index to the right
     * to make space for the new item. If the vector's capacity is reached,
     * it will automatically grow to accommodate the new element.
     *
     * @param item The item to insert into the vector.
     * @param index The zero-based index at which the item should be inserted.
     * @throws `RangeError` if the `index` is less than 0 or greater than or equal to the current item count.
     *
     * @example
     * ```typescript
     * const vec = new Vector<number>();
     * vec.push(10);
     * vec.push(30);
     * vec.insert(20, 1); // vec now contains [10, 20, 30]
     * ```
     */
    public insert(item: T, index: number) {
        if (index < 0 || index >= this.itemCount) {
            throw new RangeError("Index out of range");
        }

        if (this.size === this.capacity) {
            this._grow();
        }

        // Move all items after the index to the right
        for (let i = this.itemCount; i > index; --i) {
            this.buffer[i] = this.buffer[i - 1];
        }

        this.buffer[index] = item;
        ++this.itemCount;
        ++this.headPtr;
    }

    /**
     * Removes the first occurrence of a specific item from the vector.
     * If the item is not found, this method has no effect on the vector's contents,
     * as `eraseAt` will be called with an index of -1.
     *
     * @param item The item to remove from the vector.
     * @throws `RangeError` if the `index` is out of the valid range (i.e., `index < 0 || index >= this.itemCount`).
     *
     * @example
     * ```typescript
     * const myVector = new Vector<string>();
     * myVector.push("apple", "banana", "cherry");
     * myVector.erase("banana");
     * // myVector now contains ["apple", "cherry"]
     * ```
     */
    public erase(item: T) {
        const index = this.indexOf(item);
        this.eraseAt(index);
    }

    /**
     * Checks if the vector contains the specified item.
     * This method performs a linear search to find the item.
     *
     * @param item The item to search for within the vector.
     * @returns `true` if the item is found in the vector, otherwise `false`.
     * @example
     * ```typescript
     * const vector = new Vector<string>();
     * vector.push("apple", "banana", "cherry");
     *
     * if (vector.contains("banana")) {
     *   console.log("The vector contains 'banana'.");
     * }
     *
     * console.log(vector.contains("date")); // Outputs: false
     * ```
     */
    public contains(item: T) {
        return this.indexOf(item) !== -1;
    }

    /**
     * Removes the element at the specified index from the vector.
     *
     * This method shifts any subsequent elements to the left, subtracting one from their indices.
     * The size of the vector is decreased by one.
     *
     * @param index The zero-based index of the element to remove.
     * @throws `RangeError` if the `index` is out of the valid range (i.e., `index < 0 || index >= this.itemCount`).
     * @example
     * ```typescript
     * const vec = new Vector<string>();
     * vec.pushBack("a");
     * vec.pushBack("b");
     * vec.pushBack("c");
     * // vec contains ["a", "b", "c"]
     *
     * vec.eraseAt(1); // Removes "b"
     * // vec now contains ["a", "c"]
     * ```
     */
    public eraseAt(index: number) {
        if (index < 0 || index >= this.itemCount) {
            throw new RangeError("Index out of range");
        }

        // Move all items after the index to the left
        for (let i = index; i < this.itemCount - 1; ++i) {
            this.buffer[i] = this.buffer[i + 1];
        }
        this.popBack();
    }

    /**
     * Swaps two elements in the vector at the specified indices.
     *
     * @param elementIndexA The index of the first element to swap.
     * @param elementIndexB The index of the second element to swap.
     * @returns This method does not return a value.
     * @throws {RangeError} if `elementIndexA` or `elementIndexB` is out of the valid range (0 to `itemCount` - 1).
     * @sideeffect This method modifies the vector in-place.
     * @example
     * ```typescript
     * const vector = new Vector<number>();
     * vector.push(10, 20, 30);
     * // vector contains [10, 20, 30]
     * vector.swapElements(0, 2);
     * // vector now contains [30, 20, 10]
     * ```
     */
    public swapElements(elementIndexA: number, elementIndexB: number) {
        if (elementIndexA < 0 || elementIndexA >= this.itemCount) {
            throw new RangeError("ElementIndexA out of range");
        }
        if (elementIndexB < 0 || elementIndexB >= this.itemCount) {
            throw new RangeError("ElementIndexB out of range");
        }

        const temp = this.buffer[elementIndexB];
        this.buffer[elementIndexB] = this.buffer[elementIndexA];
        this.buffer[elementIndexA] = temp;
    }

    /**
     * Executes a provided function once for each vector element.
     *
     * @param callback A function to execute for each element in the vector.
     * It receives the element as its only argument.
     * @returns This method does not return a value (`undefined`).
     * @example
     * ```typescript
     * const myVector = new Vector<number>();
     * myVector.add(1);
     * myVector.add(2);
     * myVector.forEach(item => console.log(item));
     * // Output:
     * // 1
     * // 2
     * ```
     */
    public forEach(callback: (item: T) => void) {
        for (let i = 0; i < this.itemCount; ++i) {
            callback(this.buffer[i] as T);
        }
    }

    /**
     * Determines whether any element of the vector satisfies a condition.
     * This method is analogous to `Array.prototype.some`.
     *
     * @param callback A function to test for each element, taking an element as an argument.
     * @returns `true` if the callback function returns a truthy value for any vector element; otherwise, `false`.
     *
     * @example
     * ```typescript
     * const vector = new Vector<number>();
     * vector.push(1, 3, 5, 8, 9);
     * const hasEvenNumber = vector.any(item => item % 2 === 0);
     * // hasEvenNumber is true
     *
     * const hasNegativeNumber = vector.any(item => item < 0);
     * // hasNegativeNumber is false
     * ```
     */
    public any(callback: (item: T) => boolean) {
        for (let i = 0; i < this.itemCount; ++i) {
            if (callback(this.buffer[i] as T)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Creates a new `Vector` populated with the results of calling a provided function on every element in the calling `Vector`.
     * This method does not modify the original `Vector`.
     *
     * @param callback A function to execute for each element in the `Vector`. It receives an element as an argument and should return the new element for the resulting `Vector`.
     * @returns A new `Vector` with each element being the result of the `callback` function.
     *
     * @example
     * ```typescript
     * const numbers = new Vector<number>();
     * numbers.pushBack(1);
     * numbers.pushBack(2);
     *
     * const doubled = numbers.map(num => num * 2);
     * // `doubled` is a new Vector containing [2, 4]
     * // `numbers` remains unchanged as [1, 2]
     * ```
     */
    public map<U>(callback: (item: T) => U) {
        const result = new Vector<U>(this.itemCount);
        for (let i = 0; i < this.itemCount; ++i) {
            result.pushBack(callback(this.buffer[i] as T));
        }
        return result;
    }

    /**
     * Swaps the element at the specified `index` with the last element in the vector.
     * This is useful for a fast, unordered removal.
     *
     * @param index The zero-based index of the element to swap with the last element.
     * @throws {RangeError} Throws an error if the `index` is out of the valid range (i.e., `index < 0` or `index >= this.itemCount`).
     * @example
     * ```typescript
     * const vec = new Vector<number>();
     * vec.push(10, 20, 30, 40);
     * // Vector is now [10, 20, 30, 40]
     *
     * vec.swapToBack(1); // Swaps element at index 1 (20) with the last element (40)
     * // Vector is now [10, 40, 30, 20]
     * ```
     */
    public swapToBack(index: number) {
        if (index < 0 || index >= this.itemCount) {
            throw new RangeError("Index out of range");
        }

        const temp = this.back();
        this.buffer[this.headPtr] = this.buffer[index];
        this.buffer[index] = temp;
        this.headRef = this.buffer[this.headPtr]; // Update the headRef
    }

    /**
     * Returns the first index at which a given element can be found in the vector,
     * or -1 if it is not present. The search is limited to the current number of items
     * in the vector (`itemCount`), not the full buffer capacity.
     *
     * @param item The element to locate in the vector.
     * @param fromIndex The optional index to start the search at. If omitted, the search starts from index 0.
     * @returns The first index of the element in the vector, or -1 if it is not found within the valid item range.
     *
     * @example
     * ```typescript
     * const vec = new Vector<string>();
     * vec.push('a', 'b', 'c', 'b');
     * console.log(vec.indexOf('b'));      // Outputs: 1
     * console.log(vec.indexOf('b', 2));   // Outputs: 3
     * console.log(vec.indexOf('d'));      // Outputs: -1
     * ```
     */
    public indexOf(item: T, fromIndex?: number) {
        const index = this.buffer.indexOf(item, fromIndex);
        if (index >= this.itemCount) {
            return -1;
        }

        return index;
    }

    /**
     * Gets the total number of elements the vector can hold before it needs to resize its underlying buffer.
     * This is equivalent to the length of the internal buffer array.
     *
     * @returns The current capacity of the vector.
     *
     * @example
     * ```typescript
     * const vec = new Vector<number>();
     * vec.push(1, 2, 3);
     * // The actual capacity depends on the initial size and growth strategy.
     * // Let's assume it started with a capacity of 10.
     * console.log(vec.capacity); // Outputs: 10
     * ```
     */
    get capacity() {
        return this.buffer.length;
    }

    /**
     * Gets the number of items in the vector.
     *
     * @returns The total number of items.
     *
     * @example
     * ```typescript
     * const myVector = new Vector<string>();
     * myVector.add("hello");
     * myVector.add("world");
     * console.log(myVector.size); // Outputs: 2
     * ```
     */
    get size() {
        return this.itemCount;
    }

    /**
     * Checks if the vector contains no items.
     * @returns `true` if the vector is empty, `false` otherwise.
     * @example
     * ```typescript
     * const vector = new Vector<number>();
     * console.log(vector.isEmpty()); // Outputs: true
     *
     * vector.push(42);
     * console.log(vector.isEmpty()); // Outputs: false
     * ```
     */
    public isEmpty() {
        return this.itemCount === 0;
    }

    /**
     * Creates a new array containing all the elements in the vector.
     *
     * This method provides a shallow copy of the elements currently stored,
     * trimmed to the actual number of items. It does not modify the original vector.
     *
     * @returns A new array containing the elements of the vector in order.
     * @example
     * ```typescript
     * const vector = new Vector<string>();
     * vector.add("hello");
     * vector.add("world");
     *
     * const newArray = vector.toArray();
     * console.log(newArray); // Output: ["hello", "world"]
     * ```
     */
    public toArray() {
        // Convert to T[] since we only added the null type to create a storage buffer
        return this.buffer.slice(0, this.itemCount) as T[];
    }

    /**
     * Returns a string representation of the vector.
     * The format is a comma-separated list of the vector's components enclosed in square brackets.
     *
     * @returns A string in the format `[x,y,z,...]` representing the vector's components.
     * @example
     * ```typescript
     * const vec = new Vector(10, 20);
     * console.log(vec.toString()); // Outputs: "[10,20]"
     * ```
     */
    public toString() {
        return `[${this.toArray().toString()}]`;
    }

    /**
     * Removes all elements from the vector, leaving it empty.
     *
     * This method resets the internal state of the vector, including the item count and head/tail pointers.
     * Optionally, it can also shrink the internal buffer back to its initial capacity to free up memory.
     *
     * @param shrink If `true`, the internal buffer will be resized to its initial capacity. Defaults to `false`.
     * @returns This method does not return a value.
     * @sideeffect Modifies the vector in-place by removing all its elements. If `shrink` is `true`, it also reallocates the internal buffer.
     * @example
     * ```typescript
     * const vector = new Vector<number>();
     * vector.push(10);
     * vector.push(20);
     * console.log(vector.size); // Output: 2
     *
     * vector.clear();
     * console.log(vector.size); // Output: 0
     *
     * vector.push(30);
     * vector.push(40);
     * vector.clear(true); // Clears and shrinks the buffer
     * console.log(vector.size); // Output: 0
     * ```
     */
    public clear(shrink = false) {
        for (let i = 0; i < this.itemCount; ++i) {
            this.buffer[i] = null;
        }

        this.itemCount = 0;
        this.headPtr = -1;
        this.headRef = null;
        this.tailRef = null;

        if (shrink) {
            this.shrink();
        }
    }

    /**
     * Shrinks the internal buffer to match the current size of the vector.
     * This is useful for releasing memory if the vector's capacity is much larger
     * than its actual number of elements.
     *
     * @remarks
     * This operation has a side effect of modifying the internal `buffer` by setting its `length`
     * to the current `size` of the vector.
     *
     * @example
     * ```typescript
     * // Assuming a Vector class with a public buffer for demonstration
     * const vec = new Vector<number>();
     * vec.push(1, 2, 3);
     * // If the internal buffer was pre-allocated to a larger size (e.g., 10)
     * // vec.buffer.length might be > 3
     *
     * vec.shrink();
     *
     * // After shrinking, the buffer's length will match the number of elements.
     * // vec.buffer.length is now 3
     * ```
     */
    public shrink() {
        this.buffer.length = this.size;
    }

    /**
     * Increases the capacity of the internal buffer by at least 50%.
     *
     * The new capacity is calculated by adding half of the current capacity
     * (rounded up, with a minimum of 1) to the existing capacity.
     *
     * @remarks
     * This is a private helper method with a side effect: it mutates the
     * instance by re-allocating the internal `buffer` and replacing it
     * with a new, larger array. The newly added slots are filled with `null`.
     *
     * @returns This method does not return a value.
     */
    private _grow() {
        const halfCapacity = Math.ceil(Math.max(this.capacity / 2, 1));

        this.buffer = this.buffer.concat(new Array<T | null>(halfCapacity).fill(null));
    }
}
