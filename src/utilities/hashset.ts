import { Vector } from "./vector";

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
    add(value: T) {
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

    has(otherValue: T): boolean {
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
