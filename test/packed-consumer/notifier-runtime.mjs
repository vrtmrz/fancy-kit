import assert from "node:assert/strict";

const { createNotifier } = await import("octagonal-wheels/concurrency/notifier");
const { createNotifier: createNotifierJs } = await import("octagonal-wheels/concurrency/notifier.js");
assert.equal(createNotifierJs, createNotifier);

const notifier = createNotifier();
const { wait, notify } = notifier;
notify();
notify();

let resolved = false;
const current = wait();
const observed = current.then(() => {
  resolved = true;
});
assert.equal(wait(), current);
await Promise.resolve();
assert.equal(resolved, false);
notify();
notify();
await observed;
assert.equal(resolved, true);

const next = wait();
assert.notEqual(next, current);
notify();
await next;

for (const specifier of [
  "octagonal-wheels/concurrency/processor_v1",
  "octagonal-wheels/concurrency/processor_v2",
]) {
  const { Notifier } = await import(specifier);
  const legacy = new Notifier();
  const legacyWait = legacy.nextNotify;
  assert.equal(legacy.nextNotify, legacyWait);
  assert.equal(legacy._p.promise, legacyWait);
  legacy.notify();
  assert.equal(legacy.isUsed, false);
  assert.notEqual(legacy._p.promise, legacyWait);
  await legacyWait;
  legacy.notify();
}
