import assert from "node:assert/strict";

const nativeSetTimeout = globalThis.setTimeout;
const nativeClearTimeout = globalThis.clearTimeout;
for (const name of [
  "setTimeout",
  "clearTimeout",
  "window",
  "document",
  "fetch",
  "indexedDB",
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error("Unexpected global access: " + name);
    },
  });
}
const { createDeferredAction } =
  await import("octagonal-wheels/concurrency/deferredAction");

const entries = [];
let cancellations = 0;
let calls = 0;
const controller = createDeferredAction(
  () => calls++,
  (callback, delayMs) => {
    entries.push({ callback, delayMs });
    return () => cancellations++;
  },
);
const unusedDefault = createDeferredAction(() => {});
unusedDefault.dispose();
controller.schedule(25);
assert.equal(entries[0].delayMs, 25);
controller.schedule(50);
assert.equal(cancellations, 1);
entries[0].callback();
assert.equal(calls, 0);
entries[1].callback();
assert.equal(calls, 1);
controller.schedule(75);
controller.dispose();
controller.dispose();
controller.schedule(100);
entries[2].callback();
assert.equal(entries.length, 3);
assert.equal(cancellations, 2);
assert.equal(calls, 1);

Object.defineProperty(globalThis, "setTimeout", {
  configurable: true,
  value: nativeSetTimeout,
});
Object.defineProperty(globalThis, "clearTimeout", {
  configurable: true,
  value: nativeClearTimeout,
});
let resolveFired;
const fired = new Promise((resolve) => {
  resolveFired = resolve;
});
const nativeController = createDeferredAction(() => resolveFired());
nativeController.schedule(0);
await fired;
nativeController.dispose();

let unwantedCalls = 0;
const cancelledNative = createDeferredAction(() => unwantedCalls++);
cancelledNative.schedule(0);
cancelledNative.dispose();
await new Promise((resolve) => nativeSetTimeout(resolve, 10));
assert.equal(unwantedCalls, 0);
