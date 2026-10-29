import assert from "node:assert/strict";
import { serialized, serializedByKeys, isLockAcquired } from "octagonal-wheels/concurrency/lock";
import { serializedByKeys as aliasLock } from "octagonal-wheels/concurrency/lock.js";
import { wrapMemo } from "octagonal-wheels/function";
import { wrapMemo as aliasMemo } from "octagonal-wheels/function.js";
import { createCommandCheck } from "@vrtmrz/obsidian-plugin-kit/command";

assert.equal(aliasLock, serializedByKeys);
assert.equal(aliasMemo, wrapMemo);
const keys = Object.freeze(["packed:primitives:a", "packed:primitives:b"]);
let release;
const gate = new Promise(resolve => { release = resolve; });
let singleRan = false;
const locked = serializedByKeys(keys, async () => {
  assert.ok(keys.every(isLockAcquired));
  await gate;
  return "complete";
});
const single = serialized(keys[1], () => { singleRan = true; });
try {
  await serializedByKeys(["packed:primitives:c"], async () => {});
  assert.equal(singleRan, false);
} finally {
  release();
  assert.equal(await locked, "complete");
  await single;
}
assert.equal(singleRan, true);
assert.equal(keys.some(isLockAcquired), false);
const failure = new Error("callback failure");
await assert.rejects(serializedByKeys(keys, async () => { throw failure; }), error => error === failure);
assert.equal(await serializedByKeys(keys, async () => 42), 42);
assert.equal(await serializedByKeys([], async () => 7), 7);

const values = [];
const remember = wrapMemo(value => { values.push(value); });
for (const value of [undefined, "one", "one", undefined, undefined, NaN, NaN, 0, -0]) remember(value);
assert.deepEqual(values, ["one", undefined, NaN, NaN, 0]);
let attempts = 0;
const retry = wrapMemo(() => { if (++attempts === 1) throw failure; });
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


const { createContentApplier } = await import("octagonal-wheels/content");
const { createContentApplier: aliasApplier } = await import("octagonal-wheels/content.js");
assert.equal(createContentApplier, aliasApplier);
const target = { value: "old" };
let writes = 0;
const applyContent = createContentApplier({
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
