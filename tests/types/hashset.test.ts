import { expect } from "chai";

import { HashSet } from "src/types";

describe("HashSet", () => {
    let hashSet: HashSet<string>;
    const simpleHashFunction = (value: string): number => {
        return value.charCodeAt(0) % 10; // Simple hash for testing
    };

    beforeEach(() => {
        hashSet = new HashSet<string>(simpleHashFunction);
    });

    it("should add values to correct buckets", () => {
        hashSet.add("apple");
        hashSet.add("banana");

        expect(hashSet.size).to.equal(2);
        expect(hashSet.has("apple")).to.be.true;
        expect(hashSet.has("banana")).to.be.true;
    });

    it("should handle hash collisions", () => {
        // These will have the same hash with our simple function
        hashSet.add("a"); // charCode 97 % 10 = 7
        hashSet.add("g"); // charCode 103 % 10 = 3 (different)
        hashSet.add("q"); // charCode 113 % 10 = 3 (same as 'g')

        expect(hashSet.size).to.equal(3);
        expect(hashSet.has("a")).to.be.true;
        expect(hashSet.has("g")).to.be.true;
        expect(hashSet.has("q")).to.be.true;
    });

    it("should not add duplicate values", () => {
        hashSet.add("test");
        hashSet.add("test"); // Duplicate

        expect(hashSet.size).to.equal(1);
    });

    it("should add multiple values with addRange", () => {
        const values = ["apple", "banana", "cherry"];
        hashSet.addRange(values);

        expect(hashSet.size).to.equal(3);
        values.forEach((value) => {
            expect(hashSet.has(value)).to.be.true;
        });
    });

    it("should remove values correctly", () => {
        hashSet.add("apple");
        hashSet.add("banana");

        hashSet.remove("apple");

        expect(hashSet.size).to.equal(1);
        expect(hashSet.has("apple")).to.be.false;
        expect(hashSet.has("banana")).to.be.true;
    });

    it("should handle removing non-existent values", () => {
        hashSet.add("apple");
        hashSet.remove("banana"); // Not in set

        expect(hashSet.size).to.equal(1);
        expect(hashSet.has("apple")).to.be.true;
    });

    it("should be iterable", () => {
        const values = ["apple", "banana", "cherry"];
        hashSet.addRange(values);

        const iteratedValues: string[] = [];
        for (const value of hashSet) {
            iteratedValues.push(value);
        }

        expect(iteratedValues).to.have.lengthOf(3);
        values.forEach((value) => {
            expect(iteratedValues).to.include(value);
        });
    });

    it("should convert to array correctly", () => {
        const values = ["apple", "banana", "cherry"];
        hashSet.addRange(values);

        const array = hashSet.toArray();
        expect(array).to.have.lengthOf(3);
        values.forEach((value) => {
            expect(array).to.include(value);
        });
    });

    it("should handle empty hash set", () => {
        expect(hashSet.size).to.equal(0);
        expect(hashSet.has("anything")).to.be.false;
        expect(hashSet.toArray()).to.have.lengthOf(0);

        const iteratedValues: string[] = [];
        for (const value of hashSet) {
            iteratedValues.push(value);
        }
        expect(iteratedValues).to.have.lengthOf(0);
    });

    it("should handle numeric hash function", () => {
        const numberHashSet = new HashSet<number>((x) => x % 5);

        numberHashSet.add(1);
        numberHashSet.add(6); // Same hash bucket (1)
        numberHashSet.add(11); // Same hash bucket (1)
        numberHashSet.add(2);

        expect(numberHashSet.size).to.equal(4);
        expect(numberHashSet.has(1)).to.be.true;
        expect(numberHashSet.has(6)).to.be.true;
        expect(numberHashSet.has(11)).to.be.true;
        expect(numberHashSet.has(2)).to.be.true;
    });

    it("should enumerate through all values without skipping any", () => {
        const values = ["apple", "banana", "cherry", "date", "elderberry"];
        hashSet.addRange(values);

        const enumeratedValues: string[] = [];
        for (const value of hashSet) {
            enumeratedValues.push(value);
        }

        expect(enumeratedValues).to.have.lengthOf(5);
        values.forEach((value) => {
            expect(enumeratedValues).to.include(value);
        });

        // Verify no duplicates in enumeration
        const uniqueEnumerated = new Set(enumeratedValues);
        expect(uniqueEnumerated.size).to.equal(enumeratedValues.length);
    });

    it("should handle enumeration after removals", () => {
        const values = ["apple", "banana", "cherry", "date"];
        hashSet.addRange(values);

        hashSet.remove("banana");
        hashSet.remove("date");

        const enumeratedValues: string[] = [];
        for (const value of hashSet) {
            enumeratedValues.push(value);
        }

        expect(enumeratedValues).to.have.lengthOf(2);
        expect(enumeratedValues).to.include("apple");
        expect(enumeratedValues).to.include("cherry");
        expect(enumeratedValues).to.not.include("banana");
        expect(enumeratedValues).to.not.include("date");
    });
});
