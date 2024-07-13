export interface IEquatable<T> {
    /**
     * Returns `true` if the two objects are equal, `false` otherwise.
     */
    equals(object: T): boolean;
}

/**
 * A set that only allows unique values based on the `equals` method.
 * @param T The type of the values in the set
 * @remarks This is a workaround for the fact that `Set` doesn't allow custom equality checks.
 * The current implementation is not very efficient, but it works.
 */
export class ValueEqualsSet<T extends IEquatable<T>> extends Set<T> {
    override add(value: T) {
        if (!this.has(value)) {
            super.add(value);
        }
        return this;
    }

    addRange(values: Iterable<T>) {
        for (const value of values) {
            this.add(value);
        }
        return this;
    }

    override has(otherValue: T): boolean {
        for (const value of this.values()) {
            if (value.equals(otherValue)) {
                return true;
            }
        }
        return false;
    }

    toArray(): T[] {
        return Array.from(this);
    }
}

/**
 * An optimized hash set implementation which uses a hashing function and buckets to store values.
 * @remarks This is a work in progress, and has not been tested yet.
 */
export class HashSet<T> implements Iterable<T> {
    private _buckets: T[][] = [];
    private _size = 0;

    constructor(private readonly _hash: (value: T) => number) {}

    get size() {
        return this._size;
    }

    add(value: T) {
        const hash = this._hash(value);
        const bucket = this._buckets[hash];
        if (bucket === undefined) {
            this._buckets[hash] = [value];
        } else {
            if (!bucket.includes(value)) {
                bucket.push(value);
            }
        }
        this._size++;
    }

    addRange(values: Iterable<T>) {
        for (const value of values) {
            this.add(value);
        }
    }

    has(value: T) {
        const hash = this._hash(value);
        const bucket = this._buckets[hash];
        return bucket !== undefined && bucket.includes(value);
    }

    remove(value: T) {
        const hash = this._hash(value);
        const bucket = this._buckets[hash];
        if (bucket !== undefined) {
            const index = bucket.indexOf(value);
            if (index >= 0) {
                bucket.splice(index, 1);
                this._size--;
            }
        }
    }

    [Symbol.iterator](): Iterator<T> {
        let index = 0;
        let bucketIndex = 0;
        let bucket: T[] | undefined = this._buckets[0];
        return {
            next: () => {
                while (bucket === undefined || index >= bucket.length) {
                    bucket = this._buckets[++bucketIndex];
                    index = 0;
                }
                return { value: bucket[index++], done: false };
            },
        };
    }

    toArray(): T[] {
        const result: T[] = [];
        for (const bucket of this._buckets) {
            if (bucket !== undefined) {
                result.push(...bucket);
            }
        }
        return result;
    }
}
