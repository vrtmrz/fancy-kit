import { expect, test } from "vitest";
import { digestHash } from "./xxhash.ts";
import { sha1 } from "./purejs.ts";

test("sha1 should return the correct hash for a given string", async () => {
    const input = "Hello, World!";
    const expectedHash = "CgqfKmdylCVXq1NV12r0Qvj2XgE=";

    const result = await sha1(input);

    expect(result).to.equal(expectedHash);
});

test("sha1 should return a different hash for different input strings", async () => {
    const input1 = "Hello, World!";
    const input2 = "Lorem ipsum dolor sit amet";

    const result1 = await sha1(input1);
    const result2 = await sha1(input2);

    expect(result1).to.not.equal(result2);
});
test("digestHash should return an empty string when given an empty array", () => {
    const input: string[] = [];
    const expectedHash = "536de2dd";

    const result = digestHash(input);

    expect(result).to.equal(expectedHash);
});

test("digestHash should return the correct hash for a given array of strings", () => {
    const input: string[] = ["Hello", "World"];
    const expectedHash = "1a4ef2d7";

    const result = digestHash(input);

    expect(result).to.equal(expectedHash);
});

test("digestHash should return a different hash for different input arrays", () => {
    const input1: string[] = ["Hello", "World"];
    const input2: string[] = ["Lorem", "Ipsum"];

    const result1 = digestHash(input1);
    const result2 = digestHash(input2);

    expect(result1).to.not.equal(result2);
});
