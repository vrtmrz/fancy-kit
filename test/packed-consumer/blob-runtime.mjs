import assert from "node:assert/strict";

const NativeBlob = globalThis.Blob;
for (const name of [
  "Blob",
  "window",
  "document",
  "fetch",
  "indexedDB",
  "FileReader",
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`Unexpected global access: ${name}`);
    },
  });
}
const { createTextBlob, createBinaryBlob, toBlob, isBlobContentEqual } =
  await import("octagonal-wheels/binary/blob");
Object.defineProperty(globalThis, "Blob", {
  configurable: true,
  value: NativeBlob,
});

const original = new Blob(["payload"], { type: "application/custom" });
assert.equal(toBlob(original), original);
assert.equal(toBlob(original).type, "application/custom");
const text = createTextBlob(["first\r", "\n日本語"]);
assert.equal(await text.text(), "first\r\n日本語");
assert.equal(text.type, "text/plain");
const bytes = new Uint8Array([255, 1, 2, 255]);
const binary = createBinaryBlob(bytes.subarray(1, 3));
bytes.fill(0);
assert.deepEqual(
  new Uint8Array(await binary.arrayBuffer()),
  new Uint8Array([1, 2]),
);
assert.equal(binary.type, "application/octet-stream");
assert.equal(toBlob([]).size, 0);
assert.equal(toBlob(new ArrayBuffer(0)).type, "application/octet-stream");
assert.equal(
  await isBlobContentEqual(
    new Blob(["same"], { type: "text/plain" }),
    new Blob(["same"], { type: "application/custom" }),
  ),
  true,
);
const longContent = new Uint8Array(10_002).fill(23);
const differentLongContent = longContent.slice();
differentLongContent[10_001] = 24;
assert.equal(
  await isBlobContentEqual(
    new Blob([longContent]),
    new Blob([differentLongContent]),
  ),
  false,
);
const customLeft = new Uint8Array(10_003).fill(7);
const customRight = customLeft.slice();
const comparedPartLengths = [];
assert.equal(
  await isBlobContentEqual(
    new Blob([customLeft]),
    new Blob([customRight]),
    async (left, right) => {
      assert.equal(left.byteLength, right.byteLength);
      comparedPartLengths.push(left.byteLength);
      const leftBytes = new Uint8Array(left);
      const rightBytes = new Uint8Array(right);
      return leftBytes.every((byte, index) => byte === rightBytes[index]);
    },
  ),
  true,
);
assert.deepEqual(comparedPartLengths, [10_000, 3]);
