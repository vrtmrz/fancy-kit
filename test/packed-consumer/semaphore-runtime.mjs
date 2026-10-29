import assert from "node:assert/strict";

for (const name of ["setTimeout", "clearTimeout", "window", "document", "fetch", "indexedDB"]) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        get() {
            throw new Error("Unexpected global access: " + name);
        },
    });
}
const { Semaphore, withSemaphore } = await import("octagonal-wheels/concurrency/semaphore");
const semaphore = Semaphore(1);
let startFirst;
const firstStarted = new Promise((resolve) => {
    startFirst = resolve;
});
let finishFirst;
const gate = new Promise((resolve) => {
    finishFirst = resolve;
});
const expected = { value: 42 };
const events = [];
const first = withSemaphore(semaphore, async () => {
    events.push("first:start");
    startFirst();
    await gate;
    events.push("first:end");
    return expected;
});
const failure = new Error("second operation");
const second = withSemaphore(semaphore, () => {
    events.push("second:start");
    throw failure;
});
const results = Promise.allSettled([first, second]);
await firstStarted;
assert.deepEqual(events, ["first:start"]);
assert.equal(semaphore.waiting, 1);
finishFirst();
const settled = await results;
assert.equal(settled[0].status, "fulfilled");
assert.equal(settled[0].value, expected);
assert.equal(settled[1].status, "rejected");
assert.equal(settled[1].reason, failure);
assert.deepEqual(events, ["first:start", "first:end", "second:start"]);
assert.equal(await withSemaphore(semaphore, () => "reusable"), "reusable");
assert.equal(semaphore.waiting, 0);

let operationCalls = 0;
const acquireFailure = new Error("acquire");
await assert.rejects(
    withSemaphore(
        {
            acquire: async () => {
                throw acquireFailure;
            },
        },
        () => operationCalls++
    ),
    (error) => error === acquireFailure
);
assert.equal(operationCalls, 0);
let releases = 0;
const injected = {
    async acquire() {
        assert.equal(this, injected);
        return () => releases++;
    },
};
assert.equal(await withSemaphore(injected, () => 7), 7);
assert.equal(releases, 1);
