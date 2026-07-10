import { describe, it, expect } from "vitest";
import { extractObject, isObjectDifferent } from "./object.ts";

describe("extractObject", () => {
    it("should return a new object with properties from the template object filled with corresponding values from the input object", () => {
        const template = { name: "", age: 0, email: "" };
        const obj = { name: "John", age: 25, email: "john@example.com" };
        const result = extractObject(template, obj);
        expect(result).to.deep.equal(obj);
    });

    it("should not modify the template object", () => {
        const template = { name: "", age: 0, email: "" };
        const obj = { name: "John", age: 25, email: "john@example.com" };
        extractObject(template, obj);
        expect(template).to.deep.equal({ name: "", age: 0, email: "" });
    });

    it("should handle nested objects", () => {
        const template = { name: "", address: { city: "", country: "" } };
        const obj = { name: "John", address: { city: "New York", country: "USA" } };
        const result = extractObject(template, obj);
        expect(result).to.deep.equal(obj);
    });

    it("should handle extra properties in the input object", () => {
        const template = { name: "", age: 0, email: "" };
        const obj = { name: "John", age: 25, address: { city: "New York", country: "USA" } };
        const result = extractObject(template, obj);
        expect(result).to.deep.equal({ name: "John", age: 25, email: undefined });
    });

    it("should handle missing properties in the input object", () => {
        const template = { name: "", age: 0, email: "" };
        const obj = { name: "John", age: 25 };
        const result = extractObject(template, obj);
        expect(result).to.deep.equal({ name: "John", age: 25, email: undefined });
    });
});
describe("isObjectDifferent", () => {
    it("should return false for two equal objects", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: 25 };
        const result = isObjectDifferent(obj1, obj2);
        expect(result).to.be.false;
    });

    it("should return true for two different objects", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: 30 };
        const result = isObjectDifferent(obj1, obj2);
        expect(result).to.be.true;
    });

    it("should return true for objects with different properties", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", email: "john@example.com" };
        const result = isObjectDifferent(obj1, obj2);
        expect(result).to.be.true;
    });

    it("should return true for objects with nested objects", () => {
        const obj1 = { name: "John", address: { city: "New York", country: "USA" } };
        const obj2 = { name: "John", address: { city: "Los Angeles", country: "USA" } };
        const result = isObjectDifferent(obj1, obj2);
        expect(result).to.be.true;
    });

    it("should return false when ignoreUndefined is true and some properties are undefined", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: undefined };
        const result = isObjectDifferent(obj1, obj2, true);
        expect(result).to.be.false;
    });

    it("should return true when ignoreUndefined is false and some properties are undefined", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: undefined };
        const result = isObjectDifferent(obj1, obj2, false);
        expect(result).to.be.true;
    });

    it("should return true when ignoreUndefined is false and both properties are undefined", () => {
        const obj1 = { name: "John", age: undefined };
        const obj2 = { name: "John", age: undefined };
        const result = isObjectDifferent(obj1, obj2, false);
        expect(result).to.be.false;
    });

    it("should return false when ignoreUndefined is true and some extra properties are undefined", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: 25, email: undefined };
        const result = isObjectDifferent(obj1, obj2, true);
        expect(result).to.be.false;
        const result2 = isObjectDifferent(obj2, obj1, true);
        expect(result2).to.be.false;
    });

    it("should return true when ignoreUndefined is false and some extra properties are undefined", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: 25, email: undefined };
        const result = isObjectDifferent(obj1, obj2, false);
        expect(result).to.be.true;
        const result2 = isObjectDifferent(obj2, obj1, false);
        expect(result2).to.be.true;
    });
});
