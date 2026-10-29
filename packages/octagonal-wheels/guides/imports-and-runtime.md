# Imports and runtime guide

`octagonal-wheels` publishes a broad ESM utility surface. This guide describes how to choose public entry points, identify platform dependencies, and test application policy without treating every module as interchangeable or universally portable.

## Choose an import style

### Root namespaces

The root entry point groups modules into namespaces:

```ts
import { binary, iterable, promises } from "octagonal-wheels";

const bytes = binary.hexStringToUint8Array("010203");
const values = iterable.chunks.asChunk(bytes, { unit: 2 });
await promises.delay(5);
```

This style is convenient when a file coordinates several areas. It also makes the module family visible at each call site.

### Category entry points

A category entry point exposes its public index:

```ts
import { concatUInt8Array } from "octagonal-wheels/binary";
import { createScreenWakeLockManager } from "octagonal-wheels/browser";
```

### Focused module entry points

Use a focused module when the application depends on one contract:

```ts
import { asyncMapWithConcurrency } from "octagonal-wheels/iterable/map";
import { LRUCache } from "octagonal-wheels/memory/LRUCache";
import { createScreenWakeLockManager } from "octagonal-wheels/browser/wakeLock";
```

The package export map is authoritative. It publishes extensionless and `.js` aliases for most modules; prefer the extensionless form in new code. Imports from `octagonal-wheels/src/...` or `octagonal-wheels/dist/...` bypass the public contract and are not supported.

## Understand runtime families

Runtime requirements belong to individual entry points, not to the package name as a whole:

| Family | Typical runtime considerations |
| --- | --- |
| `binary`, `collection`, `function`, `iterable`, `number`, `object`, `path`, and `string` | Many functions use standard JavaScript values only. Individual binary and scheduling functions may select newer platform methods or browser-compatible fallbacks. |
| `actor`, `bureau`, `channel`, `concurrency`, `conduit`, `events`, and `promises` | Timers, microtasks, asynchronous iterables, and lifecycle ownership are common. Functions named for animation frames or idle callbacks require the corresponding browser facility or documented fallback. |
| `BackedQueue` and `databases` | Persistent implementations use IndexedDB through `idb`; memory-backed implementations have a different persistence boundary. |
| `dataobject` and `memory` | APIs own mutable state, caches, subscriptions, or disposal. Read constructor and terminal-state contracts before sharing an instance. |
| `encoding`, `encryption`, and `hash` | APIs may rely on Web Crypto, WebAssembly, compatibility formats, or browser byte primitives. Preserve documented format and key-management semantics. |
| `browser` | APIs integrate with browser lifecycle capabilities. `browser/wakeLock` resolves globals only when its factory is called and is explicitly tested without DOM globals. |

The TypeScript configuration includes DOM declarations and the main Vitest suite runs in Chromium. This does not mean that every API requires a browser, nor that every entry point is supported in Node.js. Verify the focused module used by the consumer.

## Binary conversion example

The hexadecimal helpers round-trip a `Uint8Array`:

```ts
import {
  hexStringToUint8Array,
  uint8ArrayToHexString,
} from "octagonal-wheels/binary/hex";

const encoded = "46616e6379204b6974";
const bytes = hexStringToUint8Array(encoded);

if (uint8ArrayToHexString(bytes) !== encoded.toLowerCase()) {
  throw new Error("Hexadecimal round-trip failed");
}
```

The category import `octagonal-wheels/binary` exposes the same helpers alongside the other binary APIs.

## Blob creation and normalisation

Use `octagonal-wheels/binary/blob` to prepare text or bytes for an API which
accepts a Blob:

```ts
import { createBinaryBlob, createTextBlob, toBlob } from "octagonal-wheels/binary/blob";

const text = createTextBlob(["first\r", "\nsecond"]);
const bytes = new Uint8Array([255, 1, 2, 255]);
const binary = createBinaryBlob(bytes.subarray(1, 3));
const sameBlob = toBlob(text); // sameBlob === text
```

`createTextBlob` always creates a new `text/plain` Blob. String parts are
concatenated without separators, with transparent line endings and the native
Blob constructor's conversion of each string part. `createBinaryBlob` always
creates a new `application/octet-stream` Blob from an ArrayBuffer or an
ArrayBuffer-backed Uint8Array. It snapshots only the view's visible bytes, so
later input changes do not alter the Blob.

`toBlob` accepts either input family or an existing Blob. It returns an existing
Blob unchanged, including its identity and MIME type; it creates a text or
binary Blob for other supported inputs. This is normalisation, which explains
the `to` prefix. It does not decode bytes, inspect file extensions, or interpret
application document metadata. Instance checks use the current realm's global
constructors.

To compare content independently of MIME types, pass two Blobs to
`isBlobContentEqual`:

```ts
import { isBlobContentEqual, toBlob } from "octagonal-wheels/binary/blob";

const equal = await isBlobContentEqual(toBlob("same"), new Blob(["same"], { type: "application/custom" }));
```

Different sizes return false without reading content; empty Blobs return true.
Equal-sized inputs are read sequentially in pairs of parts containing at most
10,000 bytes each. The default predicate compares their Base64 encodings. An
optional `ArrayBufferContentEquality` predicate receives the left and right
ArrayBuffers and returns a boolean or `PromiseLike<boolean>`. Each predicate
finishes before the next pair is read, and false stops further reads. Read and
predicate failures propagate unchanged. Host-specific comparison selection
remains with the caller; this function does not select IndexedDB.

The focused entry imports without DOM, fetch, IndexedDB, FileReader, or Blob
globals. Creation and normalisation require the standard global Blob
constructor. Comparison uses the supplied Blobs; its default predicate uses
the existing Base64 encoder, including its native Uint8Array or `btoa` path.
Browser contract tests and Node tests cover this boundary; packed-consumer
checks also exercise the installed entry and its public declarations. The
category entry `octagonal-wheels/binary` exposes the same functions alongside
other binary utilities.

## Apply content when it changes

The unreleased `createContentApplier` factory in `octagonal-wheels/content`
accepts a `ContentApplierAdapter<TTarget, TSource, TExisting, TContent>` and
returns a `ContentApplier<TTarget, TSource>`. The adapter supplies `read`,
`onReadError`, `decode`, `isSame`, and `write` callbacks. Each accepts synchronous
or promise-like results; each stage finishes before the next begins.

Only a `read` failure enters `onReadError`. A true comparison resolves to
`unchanged` without writing. Otherwise the factory waits for `write` and resolves
to `changed`, ignoring the write's resolved value. Recovery, decoding, comparison,
and write failures reject unchanged. The adapter, target, and source retain their
identities. Invocations are independent; locking, retry, rollback, storage
atomicity, and follow-up state updates belong to the consumer.

The focused entry has no host globals or DOM/Node declaration dependency.
The `.js` alias and root `content` namespace expose the same implementation.

## Own one delayed callback

`createDeferredAction` gives each owner an independent pending callback:

```ts
import { createDeferredAction } from "octagonal-wheels/concurrency/deferredAction";

declare function refreshPreview(): void;

const refresh = createDeferredAction(refreshPreview);
refresh.schedule(250);
refresh.schedule(500); // cancels and replaces the pending registration
refresh.cancel(); // a later schedule is still allowed
refresh.dispose(); // ends this action's lifetime
```

The action starts idle. `schedule(delayMs)` cancels the pending
registration before creating another and passes the delay unchanged to its
scheduler. `cancel()` is idempotent while idle. `dispose()` is idempotent,
cancels pending work, and makes later scheduling a no-op. Expiry releases the
registration before invoking the callback, allowing the callback to schedule
again. It does not interrupt work which the callback has already started.

Inject a `TimeoutScheduler` as the second argument to select a host or drive
the callback in a unit test. It receives a callback and delay and returns a
cancellation function for that registration. The scheduler must invoke the
callback asynchronously. Wrap host methods to retain their receiver. Stale
callbacks are suppressed after cancellation, replacement, or disposal;
scheduling, cancellation, and callback errors propagate.

The focused entry imports and creates actions without accessing timer,
DOM, or fetch globals. Its public types need neither DOM nor Node declarations.
The default resolves global timer methods when scheduling or cancelling.
Source and packed-consumer tests cover the injected and native Node boundary.
This action owns callbacks; the existing `cancelableDelay` and
`extendableDelay` Promise contracts retain their existing behaviour.

## Suppress consecutive duplicate arguments

`wrapMemo` from `function` owns one last-argument value per wrapper. It invokes
the callback when the next argument is strictly unequal to that value:

```ts
import { wrapMemo } from "octagonal-wheels/function";

declare function setLabel(value: string): void;
const updateLabel = wrapMemo(setLabel);
updateLabel("Ready");
updateLabel("Ready"); // The callback is not repeated.
updateLabel("Working");
updateLabel("Ready"); // Returning to an earlier value invokes it again.
```

The remembered value starts as `undefined`, so an initial `undefined` is
skipped. Comparison uses strict equality: `NaN` always invokes the callback,
signed zeros compare equal, and objects compare by identity. A synchronous
exception propagates and leaves the preceding value intact. Return values are
discarded; promises are not awaited, and their failures remain caller-owned.
This suppresses repeated arguments rather than caching function results.

## Ordered and completion-order concurrency

`asyncMapWithConcurrency` limits the number of in-flight callbacks and yields results in input order:

```ts
import { asyncMapWithConcurrency } from "octagonal-wheels/iterable/map";

const transform = async (value: number): Promise<number> => value * 2;
const results: number[] = [];
for await (const result of asyncMapWithConcurrency(
  [1, 2, 3, 4],
  async (value) => await transform(value),
  2,
)) {
  results.push(result);
}
```

`withConcurrency` applies the same bound but yields a result when its callback completes, so output order is not guaranteed. Select between them deliberately, and provide a positive concurrency limit.

## Inject the wake-lock platform boundary

The screen wake-lock manager has explicit minimal interfaces for the provider, sentinel, and visibility document. Production code can use browser globals, while application-flow tests can disable or replace the platform capability:

```ts
import {
  createScreenWakeLockManager,
  type ScreenWakeLockEvent,
} from "octagonal-wheels/browser/wakeLock";

const events: ScreenWakeLockEvent[] = [];
const wakeLock = createScreenWakeLockManager({
  provider: null,
  document: null,
  onEvent: (event) => events.push(event),
});

const result = await wakeLock.run(() => "completed", { label: "export" });
if (result !== "completed") throw new Error("The protected task did not run");

await wakeLock.dispose();
```

An unavailable or failing provider is diagnostic rather than fatal to the protected task. Overlapping logical leases share the platform sentinel, the final lease releases it, and `dispose()` permanently ends the manager lifecycle. Prefer `run()` for a bounded callback because it releases its lease in `finally`. Use `acquire()` only when the consumer owns a split lifecycle, then dispose the returned lease explicitly.

An `AbortSignal` can end one logical lease. Document visibility can release a held sentinel while leases remain and request another when visibility returns. User-agent or operating-system policy may still release or deny a wake lock.

## Put consumer policy behind narrow boundaries

Not every module provides a built-in driver. Keep browser, persistence, and scheduling choices at the consumer composition root when application policy needs isolated tests. For example:

```ts
interface ExportAwakeScope {
  run<T>(task: () => T | PromiseLike<T>): Promise<T>;
}

export async function exportArchive(
  awake: ExportAwakeScope,
  writeArchive: (destination: string) => Promise<void>,
  destination: string,
): Promise<void> {
  await awake.run(async () => {
    await writeArchive(destination);
  });
}
```

`ScreenWakeLockManager` satisfies this structural type in a browser. A focused application test can supply a small fake without emulating `navigator`, visibility events, or power policy. Apply the same technique around IndexedDB or Web Crypto when the consumer is testing orchestration rather than the platform implementation.

## Own a value and its cleanup

`DisposableResource` from `octagonal-wheels/resource` describes an explicit
`dispose(): void | Promise<void>` operation. The owner ends the lifetime;
borrowers receive the capabilities they use. `OwnedResource<T>` adds a readonly
`value` without requiring `T` to implement disposal.

```ts
import { createOwnedResource, withOwnedResource } from "octagonal-wheels/resource";

const listener = () => console.log("Changed");
const events = new EventTarget();
events.addEventListener("change", listener);
const registration = createOwnedResource(listener, value => {
  events.removeEventListener("change", value);
});

await withOwnedResource(registration, async owned => {
  events.dispatchEvent(new Event("change"));
  // Borrowers can use owned.value without receiving the cleanup capability.
  owned.value();
});
```

`createOwnedResource(value, release)` wraps an already acquired value, preserves
its identity, and calls `release(value)` only on the first disposal. Synchronous
cleanup runs immediately. Later calls retain the first completion promise or
synchronous failure, including rejected cleanup, without retrying. The wrapper
does not modify the value or prevent its use after disposal. The value's own
contract determines what further use means.

`withOwnedResource(resource, operation)` passes the original resource to the
operation and awaits its result before awaiting `dispose()` in `finally`.
It accepts ownership wrappers and existing objects with a disposal method.
A cleanup failure takes precedence when both the operation and cleanup fail.
Acquire asynchronous resources before entering the scope, and give each
lifetime one owner. For a host-owned lifetime, keep the wrapper with the host
and register disposal with that host's termination mechanism.

`DeferredAction` and `CoalescingNotifier` satisfy `DisposableResource` while
retaining their synchronous disposal contracts. Notifier disposal discards
pending updates; request `flush()` explicitly when the last update should be
delivered. A plain log or notification function can be borrowed directly when
there is no owned registration or other cleanup.

These APIs use ordinary methods and promises. They do not require disposal
symbols, `using`, a host global, or a polyfill.

## Lifecycle and side effects

Review object ownership for stateful APIs. Caches, queues, event hubs, reactive objects, locks, and browser managers can retain mutable state or listeners. Keep instances scoped to an explicit owner and call their documented release, close, or disposal operation when one exists.

Importing `browser/wakeLock` does not request a wake lock and is tested without DOM globals. Calling `createScreenWakeLockManager()` resolves the default `navigator.wakeLock` and `document` capabilities at that time. Other module families have their own import and call-time behaviour; do not generalise the wake-lock guarantee to the package root.

## API references and evidence

The [generated API index](../docs/modules.md) provides per-module and per-symbol TSDoc for the generated module set. The package export map and current source TSDoc remain the authority for public entry points added since the last documentation build.

Focused tests and maintained consumers establish representative contracts:

| Public area | Evidence or example |
| --- | --- |
| Hexadecimal native selection, browser fallback, and round-trips | [`src/binary/hex.test.ts`](../src/binary/hex.test.ts) |
| Ordered and completion-order asynchronous mapping | [`src/iterable/map.test.ts`](../src/iterable/map.test.ts) |
| Promise delays, cancellation sentinels, and scheduling helpers | [`src/promises.test.ts`](../src/promises.test.ts) |
| Semaphore, lock, task, processor, and bulk coordination | Tests under [`src/concurrency`](../src/concurrency) |
| IndexedDB and memory-backed storage contracts | Tests under [`src/databases`](../src/databases) and [`src/BackedQueue`](../src/BackedQueue) |
| Ownership wrappers, cleanup completion, failure propagation, and disposal scopes | [`src/resource.test.ts`](../src/resource.test.ts) |
| Screen wake-lock leases, visibility, failure handling, injection, and disposal | [`src/browser/wakeLock.test.ts`](../src/browser/wakeLock.test.ts) |
| Screen wake-lock import and best-effort use without DOM globals | [`test-node/wakeLock.test.ts`](../test-node/wakeLock.test.ts) |
| Real Obsidian/Electron wake-lock composition | [`apps/obsidian-harness/main.ts`](../../../apps/obsidian-harness/main.ts) and [`test/e2e-obsidian/scripts/mobile.ts`](../../../test/e2e-obsidian/scripts/mobile.ts) |

The Chromium suite is broad, but support claims still belong to the selected entry point and its tests. Consumer code owns integration with its target browser, Electron version, persistence policy, and application workflow.

For maintained application examples, see [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md). Self-hosted LiveSync exercises concurrency, reactive state, storage, binary, and browser-lifecycle modules at scale; DiffZip composes wake-lock, encryption, promise, and binary entries; and Screwdriver applies the path contract before restoring untrusted document paths. These are entry-point-specific examples rather than a package-wide platform guarantee.


## Count operations and coalesce notifications

`withCounting` in `concurrency/counting` increments a mutable numeric `value`
before calling an operation, awaits the result, and decrements in `finally`.
It supports plain objects and reactive sources without importing a reactive
implementation. Overlapping operations share the count while their lifetimes
remain independent. An increment failure prevents the operation; a decrement
failure takes precedence over the result or error, as with ordinary `finally`.

`createCoalescingNotifier<T>` in `concurrency/coalescingNotifier` returns a
`CoalescingNotifier<T>` with `update`, `flush`, and `dispose`:

```ts
import { createCoalescingNotifier } from "octagonal-wheels/concurrency/coalescingNotifier";

declare function showProgress(value: { count: number; bytes: number }): void;
const progress = createCoalescingNotifier({
  onNotify: showProgress,
  everyCount: 100,
  maxWaitMs: 2000,
  getCount: value => value.count,
  leading: true,
});
progress.update({ count: 1, bytes: 512 });
progress.update({ count: 2, bytes: 1024 });
progress.flush();
progress.dispose();
```

Supply a positive integer `everyCount`, a finite non-negative `maxWaitMs`, or
both. Without `getCount`, each update counts once; with it, the caller supplies
a cumulative, non-decreasing count. Each notification establishes the next
count baseline. `leading` defaults to false; enabling it preserves schedules
such as the first, 101st, and 201st updates for a count interval of 100.

The first pending update starts the maximum wait. Later updates replace its
value without extending the deadline. A count-triggered notification cancels
that timer. No timer runs when nothing is pending. Values are retained by
reference: pass fresh snapshots when later mutation would be misleading.
`flush` delivers only the pending latest value; `dispose` discards it and
permanently ignores further updates. Flush before disposal when a final
notification is required.

Callbacks are synchronous observers; returned values are ignored. Pending
state is cleared before invoking a callback, allowing reentrant updates.
Callback and scheduler errors propagate without retries. A callback invoked
by a timer throws through the scheduler, so it cannot reject an earlier
`update` call. Consumers retain responsibility for their error boundary.
The optional `scheduleTimeout` uses the same contract as `DeferredAction`.
Both focused entries import without timer or DOM globals and their declarations
require neither DOM nor Node types. Timed use resolves the selected scheduler
only when pending work needs a timer.

## Format and transform small values

| Entry | Operation and contract |
| --- | --- |
| `notation/duration` | `formatDuration(milliseconds)` returns two decimal places with `s`, `m`, `h`, `d`, or `y`. Thresholds use 60 seconds, 60 minutes, 24 hours, and 365 days. Rounding does not promote the unit; negative and non-finite inputs follow number comparison and `toFixed` semantics. |
| `encoding/json` | `cloneViaJSON(value)` uses native JSON serialisation and parsing. Its result is `unknown`: Dates become strings, non-finite numbers become null, and object properties containing undefined disappear. Native errors and `toJSON` hooks are preserved. |
| `path` | `findPathComponentsExceedingUtf8Limit(path, maxBytes)` reports non-empty forward-slash components strictly exceeding the supplied limit, in order. Calling it requires `TextEncoder`; importing the module does not. Application-specific limits remain with the caller. |
| `string` | `splitDelimitedList(source, delimiter)` drops empty parts without trimming or escaping. `joinDelimitedList(items, delimiter)` retains empty items. These helpers therefore do not form a lossless round trip. |
| `collection` | `stepCyclicIndex(index, count, direction)` wraps an index for `prev` or `next`. An unselected index of -1 selects the last or first item respectively. An empty collection retains the input index. Callers supply a non-negative integer count and an index of -1 or a valid position. |

The `notation` and `encoding` category entries expose the corresponding
formatting and JSON helpers. Packed fixtures exercise focused entries, `.js`
aliases, category declarations, Node execution, and focused browser bundles.
