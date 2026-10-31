import assert from "node:assert/strict";
import { serialized, withLocks, isLockAcquired } from "octagonal-wheels/concurrency/lock";
import { withLocks as aliasLock } from "octagonal-wheels/concurrency/lock.js";
import { onlyWhenChanged } from "octagonal-wheels/function";
import { onlyWhenChanged as aliasMemo } from "octagonal-wheels/function.js";
import { createCommandCheck } from "@vrtmrz/obsidian-plugin-kit/command";

assert.equal(aliasLock, withLocks);
assert.equal(aliasMemo, onlyWhenChanged);
const keys = Object.freeze(["packed:primitives:a", "packed:primitives:b"]);
let release;
const gate = new Promise(resolve => { release = resolve; });
let singleRan = false;
const locked = withLocks(keys, async () => {
  assert.ok(keys.every(isLockAcquired));
  await gate;
  return "complete";
});
const single = serialized(keys[1], () => { singleRan = true; });
try {
  await withLocks(["packed:primitives:c"], async () => {});
  assert.equal(singleRan, false);
} finally {
  release();
  assert.equal(await locked, "complete");
  await single;
}
assert.equal(singleRan, true);
assert.equal(keys.some(isLockAcquired), false);
const failure = new Error("callback failure");
await assert.rejects(withLocks(keys, async () => { throw failure; }), error => error === failure);
assert.equal(await withLocks(keys, async () => 42), 42);
assert.equal(await withLocks([], async () => 7), 7);

const values = [];
const remember = onlyWhenChanged(value => { values.push(value); });
for (const value of [undefined, "one", "one", undefined, undefined, NaN, NaN, 0, -0]) remember(value);
assert.deepEqual(values, ["one", undefined, NaN, NaN, 0]);
let attempts = 0;
const retry = onlyWhenChanged(() => { if (++attempts === 1) throw failure; });
assert.throws(() => retry("same"), error => error === failure);
retry("same");
retry("same");
assert.equal(attempts, 2);

let selected;
const executions = [];
const check = createCommandCheck(() => selected, value => { executions.push(value); });
for (const value of [undefined, null, false, "", 0, NaN]) {
  selected = value;
  assert.equal(check(true), false);
  assert.equal(check(false), false);
}
assert.equal(executions.length, 0);
selected = { id: "first" };
assert.equal(check(true), true);
assert.equal(executions.length, 0);
const second = { id: "second" };
selected = second;
assert.equal(check(false), true);
assert.equal(executions[0], second);


const { createModificationHandler } = await import("octagonal-wheels/modification");
const { createModificationHandler: aliasApplier } = await import("octagonal-wheels/modification.js");
assert.equal(createModificationHandler, aliasApplier);
const target = { value: "old" };
let writes = 0;
const applyContent = createModificationHandler({
  read: item => item.value,
  onReadError: error => { throw error; },
  decode: source => source,
  isSame: (old, next) => old === next,
  write: (item, next) => { writes++; item.value = next; },
});
assert.equal(await applyContent(target, "old"), "unchanged");
assert.equal(writes, 0);
assert.equal(await applyContent(target, "new"), "changed");
assert.equal(target.value, "new");
assert.equal(writes, 1);

const legacyUtf16 = await import("octagonal-wheels/binary/encodedUTF16");
const legacyUtf16Js = await import("octagonal-wheels/binary/encodedUTF16.js");
assert.equal(legacyUtf16Js.encodeBinaryEach, legacyUtf16.encodeBinaryEach);
assert.equal(legacyUtf16Js._encodeBinary, legacyUtf16._encodeBinary);
const legacyEncoded = "\u00c0\u00e5&\u00faA~\u013f\u0140\u01be\u01bf";
const legacyBytes = new Uint8Array([0, 0x25, 0x26, 0x3a, 0x41, 0x7e, 0x7f, 0x80, 0xfe, 0xff]);
assert.deepEqual(new Uint8Array(legacyUtf16._decodeToArrayBuffer(legacyEncoded)), legacyBytes);
assert.deepEqual(new Uint8Array(legacyUtf16.decodeToArrayBuffer([legacyEncoded])), legacyBytes);
for (const suffix of ["", ".js"]) {
  await assert.rejects(import("octagonal-wheels/binary/encodedUTF16.deprecated" + suffix), error => error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED");
  await assert.rejects(import("octagonal-wheels/binary/encodedUTF16.tables.internal" + suffix), error => error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED");
}
const legacyHash = await import("octagonal-wheels/hash/crc32");
assert.equal(legacyHash.crc32CHash(""), "-i93f7");
assert.equal(legacyHash.crc32CKHash("日本語😀"), "-dqsqid--3kp69c");
