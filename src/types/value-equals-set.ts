import { IEquatable } from "./interfaces";

/**
 * A set that enforces uniqueness based on each element’s `equals` method.
 * @template T The element type, which must implement `IEquatable<T>`.
 * @example
 * ```typescript
 * class Point implements IEquatable<Point> {
 *   constructor(public x: number, public y: number) {}
 *   equals(other: Point) {
 *     return this.x === other.x && this.y === other.y;
 *   }
 * }
 * const set = new ValueEqualsSet<Point>();
 * set.add(new Point(1, 2));
 * console.log(set.has(new Point(1, 2))); // true
 * ```
 */

export class ValueEqualsSet<T extends IEquatable<T>> extends Set<T> {
    /**
     * Adds an element if not already present.
     * @param value The element to add.
     * @returns This set instance for chaining.
     */
    override add(value: T) {
        if (!this.has(value)) {
            super.add(value);
        }
        return this;
    }

    /**
     * Adds multiple elements to the set.
     * @param values An iterable of elements to add.
     * @returns This set instance for chaining.
     * @remarks Each element is added via the `add` method, so duplicates are filtered.
     */
    addRange(values: Iterable<T>) {
        for (const value of values) {
            this.add(value);
        }
        return this;
    }

    /**
     * Checks for the presence of an equivalent element.
     * @param otherValue The element to search for.
     * @returns `true` if a matching element is found; otherwise, `false`.
     */
    override has(otherValue: T): boolean {
        for (const value of this.values()) {
            if (value.equals(otherValue)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Converts the set to an array.
     * @returns An array containing all elements in insertion order.
     */
    toArray(): T[] {
        return Array.from(this);
    }
}
