/**
 * Interface for types that support custom equality comparison.
 * @template T The type to compare.
 */
export interface IEquatable<T> {
    /**
     * Determines whether this instance is equal to another.
     * @param object The object to compare with.
     * @returns `true` if the instances are equal; otherwise, `false`.
     */
    equals(object: T): boolean;
}
