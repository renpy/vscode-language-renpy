import { expect } from "chai";

import { Vector } from "src/types";

describe("Vector", () => {
    let vector: Vector<number>;

    beforeEach(() => {
        vector = new Vector<number>();
    });

    it("should create empty vector with default capacity", () => {
        expect(vector.size).to.equal(0);
        expect(vector.capacity).to.equal(0);
        expect(vector.isEmpty()).to.equal(true);
    });

    it("should create vector with specified capacity", () => {
        const vectorWithCapacity = new Vector<number>(10);
        expect(vectorWithCapacity.capacity).to.equal(10);
        expect(vectorWithCapacity.size).to.equal(0);
        expect(vectorWithCapacity.isEmpty()).to.equal(true);
    });

    it("should push items to back of vector", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        expect(vector.size).to.equal(3);
        expect(vector.isEmpty()).to.equal(false);
        expect(vector.back()).to.equal(3);
        expect(vector.front()).to.equal(1);
    });

    it("should pop items from back of vector", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        expect(vector.popBack()).to.equal(3);
        expect(vector.popBack()).to.equal(2);
        expect(vector.size).to.equal(1);
        expect(vector.back()).to.equal(1);
    });

    it("should throw error when popping from empty vector", () => {
        expect(() => vector.popBack()).to.throw(RangeError, "Vector was already empty. Can't pop another item.");
    });

    it("should access elements by index", () => {
        vector.pushBack(10);
        vector.pushBack(20);
        vector.pushBack(30);

        expect(vector.at(0)).to.equal(10);
        expect(vector.at(1)).to.equal(20);
        expect(vector.at(2)).to.equal(30);
    });

    it("should throw error for out of range index access", () => {
        vector.pushBack(1);

        expect(() => vector.at(-1)).to.throw(RangeError, "Index out of range");
        expect(() => vector.at(1)).to.throw(RangeError, "Index out of range");
        expect(() => vector.at(10)).to.throw(RangeError, "Index out of range");
    });

    it("should insert elements at specified index", () => {
        vector.pushBack(1);
        vector.pushBack(3);
        vector.insert(2, 1); // Insert 2 at index 1

        expect(vector.size).to.equal(3);
        expect(vector.at(0)).to.equal(1);
        expect(vector.at(1)).to.equal(2);
        expect(vector.at(2)).to.equal(3);
    });

    it("should throw error for out of range index insertion", () => {
        vector.pushBack(1);

        expect(() => vector.insert(2, -1)).to.throw(RangeError, "Index out of range");
        expect(() => vector.insert(2, 2)).to.throw(RangeError, "Index out of range");
    });

    it("should erase elements by value", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);
        vector.pushBack(2); // Duplicate

        vector.erase(2); // Should remove first occurrence

        expect(vector.size).to.equal(3);
        expect(vector.at(0)).to.equal(1);
        expect(vector.at(1)).to.equal(3);
        expect(vector.at(2)).to.equal(2);
    });

    it("should erase elements by index", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        vector.eraseAt(1); // Remove element at index 1

        expect(vector.size).to.equal(2);
        expect(vector.at(0)).to.equal(1);
        expect(vector.at(1)).to.equal(3);
    });

    it("should throw error for out of range index erasure", () => {
        vector.pushBack(1);

        expect(() => vector.eraseAt(-1)).to.throw(RangeError, "Index out of range");
        expect(() => vector.eraseAt(1)).to.throw(RangeError, "Index out of range");
    });

    it("should check if vector contains element", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        expect(vector.contains(2)).to.equal(true);
        expect(vector.contains(4)).to.equal(false);
    });

    it("should find index of element", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);
        vector.pushBack(2);

        expect(vector.indexOf(2)).to.equal(1); // First occurrence
        expect(vector.indexOf(4)).to.equal(-1); // Not found
        expect(vector.indexOf(2, 2)).to.equal(3); // Search from index 2
    });

    it("should swap elements at specified indices", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        vector.swapElements(0, 2);

        expect(vector.at(0)).to.equal(3);
        expect(vector.at(1)).to.equal(2);
        expect(vector.at(2)).to.equal(1);
    });

    it("should throw error for out of range swap indices", () => {
        vector.pushBack(1);

        expect(() => vector.swapElements(-1, 0)).to.throw(RangeError, "ElementIndexA out of range");
        expect(() => vector.swapElements(0, -1)).to.throw(RangeError, "ElementIndexB out of range");
        expect(() => vector.swapElements(1, 0)).to.throw(RangeError, "ElementIndexA out of range");
        expect(() => vector.swapElements(0, 1)).to.throw(RangeError, "ElementIndexB out of range");
    });

    it("should swap element to back", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        vector.swapToBack(0); // Swap element at index 0 to back

        expect(vector.at(0)).to.equal(3);
        expect(vector.at(1)).to.equal(2);
        expect(vector.at(2)).to.equal(1);
        expect(vector.back()).to.equal(1);
    });

    it("should iterate through all elements", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        const elements: number[] = [];
        for (const element of vector) {
            elements.push(element);
        }

        expect(elements).to.deep.equal([1, 2, 3]);
    });

    it("should check if any element matches condition", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        expect(vector.any((x) => x > 2)).to.equal(true);
        expect(vector.any((x) => x > 5)).to.equal(false);
    });

    it("should map elements to new vector", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        const mapped = vector.map((x) => x * 2);

        expect(mapped.size).to.equal(3);
        expect(mapped.at(0)).to.equal(2);
        expect(mapped.at(1)).to.equal(4);
        expect(mapped.at(2)).to.equal(6);
    });

    it("should sort elements", () => {
        vector.pushBack(3);
        vector.pushBack(1);
        vector.pushBack(2);

        vector.sort((a, b) => a - b);

        expect(vector.at(0)).to.equal(1);
        expect(vector.at(1)).to.equal(2);
        expect(vector.at(2)).to.equal(3);
    });

    it("should convert to array", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        const array = vector.toArray();

        expect(array).to.deep.equal([1, 2, 3]);
        expect(array).to.be.instanceOf(Array);
    });

    it("should convert to string", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        const str = vector.toString();

        expect(str).to.equal("[1,2,3]");
    });

    it("should clone vector correctly", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        const cloned = vector.clone();

        expect(cloned.size).to.equal(vector.size);
        expect(cloned.capacity).to.equal(vector.capacity);
        expect(cloned.toArray()).to.deep.equal(vector.toArray());

        // Verify independence
        cloned.pushBack(4);
        expect(vector.size).to.equal(3);
        expect(cloned.size).to.equal(4);
    });

    it("should clear vector without shrinking by default", () => {
        const vectorWithCapacity = new Vector<number>(10);
        vectorWithCapacity.pushBack(1);
        vectorWithCapacity.pushBack(2);

        vectorWithCapacity.clear();

        expect(vectorWithCapacity.size).to.equal(0);
        expect(vectorWithCapacity.isEmpty()).to.equal(true);
        expect(vectorWithCapacity.capacity).to.equal(10);
    });

    it("should clear vector and shrink when requested", () => {
        const vectorWithCapacity = new Vector<number>(10);
        vectorWithCapacity.pushBack(1);
        vectorWithCapacity.pushBack(2);

        vectorWithCapacity.clear(true);

        expect(vectorWithCapacity.size).to.equal(0);
        expect(vectorWithCapacity.isEmpty()).to.equal(true);
        expect(vectorWithCapacity.capacity).to.equal(0);
    });

    it("should shrink capacity to match size", () => {
        const vectorWithCapacity = new Vector<number>(10);
        vectorWithCapacity.pushBack(1);
        vectorWithCapacity.pushBack(2);

        vectorWithCapacity.shrink();

        expect(vectorWithCapacity.capacity).to.equal(2);
        expect(vectorWithCapacity.size).to.equal(2);
    });

    it("should grow capacity automatically when needed", () => {
        const smallVector = new Vector<number>(1);
        const initialCapacity = smallVector.capacity;

        smallVector.pushBack(1);
        smallVector.pushBack(2); // Should trigger growth

        expect(smallVector.capacity).to.be.greaterThan(initialCapacity);
        expect(smallVector.size).to.equal(2);
    });

    it("should handle string elements", () => {
        const stringVector = new Vector<string>();

        stringVector.pushBack("hello");
        stringVector.pushBack("world");

        expect(stringVector.size).to.equal(2);
        expect(stringVector.at(0)).to.equal("hello");
        expect(stringVector.at(1)).to.equal("world");
    });

    it("should handle complex object elements", () => {
        interface TestObject {
            id: number;
            name: string;
        }

        const objectVector = new Vector<TestObject>();
        const obj1 = { id: 1, name: "first" };
        const obj2 = { id: 2, name: "second" };

        objectVector.pushBack(obj1);
        objectVector.pushBack(obj2);

        expect(objectVector.size).to.equal(2);
        expect(objectVector.at(0)).to.deep.equal(obj1);
        expect(objectVector.at(1)).to.deep.equal(obj2);
    });

    it("should handle empty vector operations gracefully", () => {
        expect(vector.front()).to.be.null;
        expect(vector.back()).to.be.null;
        expect(vector.toArray()).to.deep.equal([]);
        expect(vector.toString()).to.equal("[]");
        expect(vector.indexOf(1)).to.equal(-1);
        expect(vector.contains(1)).to.equal(false);
        expect(vector.any((x) => x > 0)).to.equal(false);

        let callCount = 0;
        vector.map(() => (callCount += 1));
        expect(callCount).to.equal(0);
    });

    it("should throw error for negative capacity in constructor", () => {
        expect(() => new Vector<number>(-1)).to.throw(RangeError, "Vector capacity must be a non-negative number.");
        expect(() => new Vector<number>(-10)).to.throw(RangeError, "Vector capacity must be a non-negative number.");
    });

    it("should handle sort with null values correctly", () => {
        // This tests the internal null handling in sort method
        const vectorWithCapacity = new Vector<number>(5);
        vectorWithCapacity.pushBack(3);
        vectorWithCapacity.pushBack(1);
        vectorWithCapacity.pushBack(2);

        vectorWithCapacity.sort((a, b) => a - b);

        expect(vectorWithCapacity.at(0)).to.equal(1);
        expect(vectorWithCapacity.at(1)).to.equal(2);
        expect(vectorWithCapacity.at(2)).to.equal(3);
    });

    it("should handle indexOf with fromIndex parameter", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(1);
        vector.pushBack(3);

        expect(vector.indexOf(1)).to.equal(0); // First occurrence
        expect(vector.indexOf(1, 1)).to.equal(2); // Starting from index 1
        expect(vector.indexOf(1, 3)).to.equal(-1); // Starting from index 3
        expect(vector.indexOf(2, 2)).to.equal(-1); // Starting beyond the element
    });

    it("should handle map with different return type", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        const stringVector = vector.map((x) => x.toString());

        expect(stringVector.size).to.equal(3);
        expect(stringVector.at(0)).to.equal("1");
        expect(stringVector.at(1)).to.equal("2");
        expect(stringVector.at(2)).to.equal("3");
    });

    it("should grow to the expected capacity when full", () => {
        // Test the specific growth strategy mentioned in JSDoc
        const smallVector = new Vector<number>(2);
        const initialCapacity = smallVector.capacity;

        // Fill to capacity
        smallVector.pushBack(1);
        smallVector.pushBack(2);
        expect(smallVector.capacity).to.equal(initialCapacity);

        // Trigger growth
        smallVector.pushBack(3);

        // Should grow by at least 50% (Math.ceil(2/2) = 1, so new capacity should be at least 3)
        expect(smallVector.capacity).to.be.at.least(3);
    });

    it("should handle iteration after modifications", () => {
        vector.pushBack(1);
        vector.pushBack(2);
        vector.pushBack(3);

        vector.eraseAt(1); // Remove middle element

        const elements: number[] = [];
        for (const element of vector) {
            elements.push(element);
        }

        expect(elements).to.deep.equal([1, 3]);
    });
});
