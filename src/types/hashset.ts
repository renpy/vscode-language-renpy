/**
 * A hash-based set optimized for fast lookups using buckets.
 * @template T The element type.
 * @example
 * ```typescript
 * const hashSet = new HashSet<string>(s => s.length);
 * hashSet.add("hello");
 * console.log(hashSet.has("hello")); // true
 * ```
 */
export class HashSet<T> implements Iterable<T> {
    private _buckets: T[][] = [];
    private _size = 0;

    /**
     * Initializes a new hash set.
     * @param _hash A function that computes a non-negative integer hash for each element.
     */
    constructor(private readonly _hash: (value: T) => number) {}

    /**
     * Gets the number of elements in the set.
     */
    get size() {
        return this._size;
    }

    /**
     * Adds an element to the set.
     * @param value The element to add.
     * @remarks Creates a new bucket if none exists for the computed hash.
     */
    add(value: T) {
        const hash = this._hash(value);
        // Early exit if the value is already present
        if (this._buckets[hash]?.includes(value)) {
            return;
        }
        // Initialize the bucket if it doesn't exist
        if (this._buckets[hash] == null) {
            this._buckets[hash] = [];
        }
        this._buckets[hash].push(value);
        this._size++;
    }

    /**
     * Adds multiple elements from an iterable.
     * @param values An iterable of elements to add.
     */
    addRange(values: Iterable<T>) {
        for (const value of values) {
            this.add(value);
        }
    }

    /**
     * Determines if the set contains a given element.
     * @param value The element to locate.
     * @returns `true` if the element is present; otherwise, `false`.
     */
    has(value: T) {
        const hash = this._hash(value);
        const bucket = this._buckets[hash];
        return bucket != null && bucket.includes(value);
    }

    /**
     * Removes an element from the set.
     * @param value The element to remove.
     * @remarks Has no effect if the element is not found.
     */
    remove(value: T) {
        const hash = this._hash(value);
        const bucket = this._buckets[hash];
        if (bucket != null) {
            const index = bucket.indexOf(value);
            if (index >= 0) {
                bucket.splice(index, 1);
                this._size--;
            }
        }
    }

    /**
     * Returns an iterator over the set’s elements.
     * @returns An iterator yielding each element in the set.
     */
    [Symbol.iterator](): Iterator<T> {
        let index = 0;
        let bucketIndex = 0;
        let bucket: T[] | undefined = this._buckets[0];
        return {
            next: () => {
                while (bucket == null || index >= bucket.length) {
                    bucketIndex++;
                    if (bucketIndex >= this._buckets.length) {
                        return { value: undefined!, done: true };
                    }
                    bucket = this._buckets[bucketIndex];
                    index = 0;
                }
                return { value: bucket[index++], done: false };
            },
        };
    }

    /**
     * Retrieves all elements as an array.
     * @returns An array of all elements in the set.
     */
    toArray(): T[] {
        const result: T[] = [];
        for (const bucket of this._buckets) {
            if (bucket != null) {
                result.push(...bucket);
            }
        }
        return result;
    }
}
