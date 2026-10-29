import assert from "node:assert/strict";

const originalEncoder = globalThis.TextEncoder;
for (const name of ["window", "document", "fetch", "indexedDB", "setTimeout", "clearTimeout", "TextEncoder"]) {
  Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error(`Unexpected global access: ${name}`); } });
}
const { formatDuration } = await import("octagonal-wheels/notation/duration");
const { cloneViaJSON } = await import("octagonal-wheels/encoding/json");
const { findPathComponentsExceedingUtf8Limit } = await import("octagonal-wheels/path");
const { splitDelimitedList, joinDelimitedList } = await import("octagonal-wheels/string");
const { stepCyclicIndex } = await import("octagonal-wheels/collection");
for (const [entry, name, implementation] of [
  ["notation/duration", "formatDuration", formatDuration],
  ["encoding/json", "cloneViaJSON", cloneViaJSON],
  ["path", "findPathComponentsExceedingUtf8Limit", findPathComponentsExceedingUtf8Limit],
  ["string", "splitDelimitedList", splitDelimitedList],
  ["collection", "stepCyclicIndex", stepCyclicIndex],
]) assert.equal((await import(`octagonal-wheels/${entry}.js`))[name], implementation);

assert.equal(formatDuration(60_000), "1.00m");
assert.equal(formatDuration(-1000), "-1.00s");
assert.deepEqual(cloneViaJSON({ date: new Date("2024-01-01T00:00:00Z"), missing: undefined }), { date: "2024-01-01T00:00:00.000Z" });
assert.throws(() => cloneViaJSON(undefined), SyntaxError);
assert.deepEqual(splitDelimitedList("|a||b|", "|"), ["a", "b"]);
assert.equal(joinDelimitedList(["", "a", ""], "|"), "|a|");
assert.equal(stepCyclicIndex(-1, 3, "prev"), 2);
assert.equal(stepCyclicIndex(-1, 0, "next"), -1);
Object.defineProperty(globalThis, "TextEncoder", { configurable: true, value: originalEncoder });
assert.deepEqual(findPathComponentsExceedingUtf8Limit("a/日本語", 3), [{ component: "日本語", utf8Bytes: 9 }]);
