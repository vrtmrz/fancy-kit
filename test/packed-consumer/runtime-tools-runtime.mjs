import assert from "node:assert/strict";

const originalTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalEncoder = globalThis.TextEncoder;
for (const name of ["window", "document", "fetch", "indexedDB", "setTimeout", "clearTimeout", "TextEncoder"]) {
  Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error(`Unexpected global access: ${name}`); } });
}
const { createOwnedResource, withOwnedResource } = await import("octagonal-wheels/resource");
const { withCounting } = await import("octagonal-wheels/concurrency/counting");
const { createCoalescingNotifier } = await import("octagonal-wheels/concurrency/coalescingNotifier");
const { formatDuration } = await import("octagonal-wheels/notation/duration");
const { cloneViaJSON } = await import("octagonal-wheels/encoding/json");
const { findPathComponentsExceedingUtf8Limit } = await import("octagonal-wheels/path");
const { splitDelimitedList, joinDelimitedList } = await import("octagonal-wheels/string");
const { stepCyclicIndex } = await import("octagonal-wheels/collection");
for (const [entry, name, implementation] of [
  ["resource", "createOwnedResource", createOwnedResource],
  ["resource", "withOwnedResource", withOwnedResource],
  ["concurrency/counting", "withCounting", withCounting],
  ["concurrency/coalescingNotifier", "createCoalescingNotifier", createCoalescingNotifier],
  ["notation/duration", "formatDuration", formatDuration],
  ["encoding/json", "cloneViaJSON", cloneViaJSON],
  ["path", "findPathComponentsExceedingUtf8Limit", findPathComponentsExceedingUtf8Limit],
  ["string", "splitDelimitedList", splitDelimitedList],
  ["collection", "stepCyclicIndex", stepCyclicIndex],
]) assert.equal((await import(`octagonal-wheels/${entry}.js`))[name], implementation);

const messages = [];
let releases = 0;
const log = message => messages.push(message);
const ownedLog = createOwnedResource(log, value => {
  assert.equal(value, log);
  releases++;
});
assert.equal(ownedLog.value, log);
assert.equal("dispose" in log, false);
assert.equal(releases, 0);
assert.equal(await withOwnedResource(ownedLog, owned => {
  owned.value("entry");
  return "logged";
}), "logged");
ownedLog.dispose();
assert.equal(releases, 1);
assert.deepEqual(messages, ["entry"]);
const disposalFailure = new Error("cleanup");
const rejectedCleanup = Promise.reject(disposalFailure);
const ownedFailure = createOwnedResource(42, () => rejectedCleanup);
await assert.rejects(withOwnedResource(ownedFailure, () => { throw new Error("operation"); }), candidate => candidate === disposalFailure);
assert.equal(ownedFailure.dispose(), rejectedCleanup);

const counter = { value: 2 };
let finish;
const result = withCounting(counter, () => new Promise(resolve => { finish = resolve; }));
assert.equal(counter.value, 3);
finish(42);
assert.equal(await result, 42);
assert.equal(counter.value, 2);
const error = new Error("failed");
await assert.rejects(withCounting(counter, () => { throw error; }), candidate => candidate === error);
assert.equal(counter.value, 2);

const counts = [];
const counting = createCoalescingNotifier({ everyCount: 100, leading: true, onNotify: value => counts.push(value) });
for (let count = 1; count <= 202; count++) counting.update(count);
assert.deepEqual(counts, [1, 101, 201]);
counting.flush();
assert.deepEqual(counts, [1, 101, 201, 202]);
counting.dispose();

const registrations = [];
const notifications = [];
const notifier = createCoalescingNotifier({
  everyCount: 25, maxWaitMs: 2000, getCount: value => value.count,
  onNotify: value => notifications.push(value),
  scheduleTimeout: (callback, delayMs) => {
    const entry = { callback, delayMs, cancelled: false };
    registrations.push(entry);
    return () => { entry.cancelled = true; };
  },
});
notifier.update({ count: 1, bytes: 10 });
notifier.update({ count: 2, bytes: 30 });
assert.equal(registrations.length, 1);
assert.equal(registrations[0].delayMs, 2000);
registrations[0].callback();
assert.deepEqual(notifications, [{ count: 2, bytes: 30 }]);
notifier.update({ count: 27, bytes: 100 });
assert.equal(notifications.length, 2);
notifier.update({ count: 28, bytes: 110 });
notifier.dispose();
registrations[1].callback();
assert.equal(registrations[1].cancelled, true);
assert.equal(notifications.length, 2);

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

Object.defineProperty(globalThis, "setTimeout", { configurable: true, value: originalTimeout });
Object.defineProperty(globalThis, "clearTimeout", { configurable: true, value: originalClearTimeout });
let resolveNotification;
const delivered = new Promise(resolve => { resolveNotification = resolve; });
const timed = createCoalescingNotifier({ maxWaitMs: 0, onNotify: resolveNotification });
timed.update("latest");
assert.equal(await delivered, "latest");
timed.dispose();
