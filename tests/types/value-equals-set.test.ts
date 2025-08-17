import { expect } from "chai";

import { IEquatable, ValueEqualsSet } from "src/types";

class TestEquatable implements IEquatable<TestEquatable> {
    constructor(public value: number) {}

    equals(other: TestEquatable): boolean {
        return this.value === other.value;
    }
}

describe("ValueEqualsSet", () => {
    let set: ValueEqualsSet<TestEquatable>;

    beforeEach(() => {
        set = new ValueEqualsSet<TestEquatable>();
    });

    it("should add unique values based on equals method", () => {
        const item1 = new TestEquatable(1);
        const item2 = new TestEquatable(1); // Same value, different instance
        const item3 = new TestEquatable(2);

        set.add(item1);
        set.add(item2); // Should not be added due to equals
        set.add(item3);

        expect(set.size).to.equal(2);
    });

    it("should return itself when adding items", () => {
        const item = new TestEquatable(1);
        const result = set.add(item);

        expect(result).to.equal(set);
    });

    it("should detect existing values using equals method", () => {
        const item1 = new TestEquatable(1);
        const item2 = new TestEquatable(1); // Same value, different instance

        set.add(item1);

        expect(set.has(item2)).to.be.true;
    });

    it("should detect non-existing values", () => {
        const item1 = new TestEquatable(1);
        const item2 = new TestEquatable(2);

        set.add(item1);

        expect(set.has(item2)).to.be.false;
    });

    it("should add multiple values with addRange", () => {
        const items = [
            new TestEquatable(1),
            new TestEquatable(2),
            new TestEquatable(1), // Duplicate
            new TestEquatable(3),
        ];

        set.addRange(items);

        expect(set.size).to.equal(3);
    });

    it("should return itself when adding range", () => {
        const items = [new TestEquatable(1)];
        const result = set.addRange(items);

        expect(result).to.equal(set);
    });

    it("should convert to array correctly", () => {
        const item1 = new TestEquatable(1);
        const item2 = new TestEquatable(2);

        set.add(item1);
        set.add(item2);

        const array = set.toArray();
        expect(array).to.have.lengthOf(2);
        expect(array).to.include(item1);
        expect(array).to.include(item2);
    });

    it("should handle empty set", () => {
        expect(set.size).to.equal(0);
        expect(set.toArray()).to.have.lengthOf(0);
        expect(set.has(new TestEquatable(1))).to.be.false;
    });

    it("should handle complex equality scenarios", () => {
        class ComplexEquatable implements IEquatable<ComplexEquatable> {
            constructor(
                public id: number,
                public name: string
            ) {}

            equals(other: ComplexEquatable): boolean {
                return this.id === other.id && this.name === other.name;
            }
        }

        const complexSet = new ValueEqualsSet<ComplexEquatable>();
        const obj1 = new ComplexEquatable(1, "test");
        const obj2 = new ComplexEquatable(1, "test"); // Same content, different instance
        const obj3 = new ComplexEquatable(1, "different"); // Same id, different name

        complexSet.add(obj1);
        complexSet.add(obj2); // Should not be added due to equals
        complexSet.add(obj3); // Should be added (different name)

        expect(complexSet.size).to.equal(2);
        expect(complexSet.has(obj2)).to.be.true; // Should find obj1 via equals
        expect(complexSet.has(obj3)).to.be.true;
    });

    it("should support method chaining", () => {
        const item1 = new TestEquatable(1);
        const item2 = new TestEquatable(2);
        const items = [new TestEquatable(3), new TestEquatable(4)];

        const result = set.add(item1).add(item2).addRange(items);

        expect(result).to.equal(set);
        expect(set.size).to.equal(4);
    });
});
