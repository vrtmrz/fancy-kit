import assert from "node:assert/strict";
import { wrapMemo } from "octagonal-wheels/function";
import { wrapMemo as aliasMemo } from "octagonal-wheels/function.js";

assert.equal(aliasMemo, wrapMemo);
const failure = new Error("callback failure");

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
