import assert from "node:assert/strict";

const globalNames = [
  "window",
  "document",
  "fetch",
  "AbortController",
  "setTimeout",
  "clearTimeout",
];
const descriptors = new Map(
  globalNames.map((name) => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  ]),
);
for (const name of globalNames) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`Unexpected import-time global access: ${name}`);
    },
  });
}
const { scoped, withScope } = await import("octagonal-wheels/resource/scope");
const { withCancellation } =
  await import("octagonal-wheels/concurrency/cancellation");
const { mapInScope } =
  await import("octagonal-wheels/concurrency/scopedIteration");
const { acquirePermit, Semaphore } =
  await import("octagonal-wheels/concurrency/semaphore");
assert.equal(
  (await import("octagonal-wheels/resource/scope.js")).withScope,
  withScope,
);
assert.equal(
  (await import("octagonal-wheels/concurrency/cancellation.js"))
    .withCancellation,
  withCancellation,
);
assert.equal(
  (await import("octagonal-wheels/concurrency/scopedIteration.js")).mapInScope,
  mapInScope,
);

const events = [];
const semaphore = Semaphore(1);
const program = scoped()
  .pipe(acquirePermit(semaphore))
  .pipe((ctx) => {
    ctx.defer(() => {
      events.push("parent");
    });
    return ctx.value;
  })
  .pipeScoped((ctx) => {
    ctx.defer(async () => {
      events.push("child");
    });
    return `${ctx.value}:read`;
  })
  .pipe((ctx) => {
    assert.deepEqual(events, ["child"]);
    return ctx.value.length;
  });
assert.equal(await withScope("source", program), 11);
assert.deepEqual(events, ["child", "parent"]);
const release = await semaphore.tryAcquire();
assert.equal(typeof release, "function");
release();

const mapped = await withScope({ factor: 2 }, (ctx) =>
  mapInScope(
    ctx,
    [Promise.resolve(3), Promise.resolve(1)],
    { concurrency: 2 },
    (item, child) => {
      child.defer(async () => {
        events.push(`item:${item}`);
      });
      return item * child.value.factor;
    },
  ),
);
assert.deepEqual(mapped, { status: "completed", values: [6, 2] });
assert.ok(events.includes("item:3") && events.includes("item:1"));

const bodyFailure = new Error("body");
const closeFailure = new Error("close");
await assert.rejects(
  withScope(undefined, (ctx) => {
    ctx.defer(() => {
      throw closeFailure;
    });
    throw bodyFailure;
  }),
  (error) =>
    error instanceof AggregateError &&
    error.errors[0] === bodyFailure &&
    error.errors[1] === closeFailure,
);

for (const [name, descriptor] of descriptors) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete globalThis[name];
}
const parent = new AbortController();
const reason = { cancelled: true };
let ownedSignal;
const partial = await withCancellation(
  "input",
  { signal: parent.signal },
  async (ctx) => {
    ownedSignal = ctx.signal;
    const result = await mapInScope(ctx, [1, 2, 3], {}, (item, child) => {
      assert.equal(child.signal, ctx.signal);
      parent.abort(reason);
      return item;
    });
    return result;
  },
);
assert.deepEqual(partial, { status: "cancelled", values: [1] });
assert.equal(ownedSignal.reason, reason);
const normalParent = new AbortController();
assert.equal(
  await withCancellation(4, { signal: normalParent.signal }, (ctx) => {
    ownedSignal = ctx.signal;
    return ctx.value;
  }),
  4,
);
assert.equal(normalParent.signal.aborted, false);
assert.equal(ownedSignal.aborted, true);
