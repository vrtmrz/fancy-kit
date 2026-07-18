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
| Screen wake-lock leases, visibility, failure handling, injection, and disposal | [`src/browser/wakeLock.test.ts`](../src/browser/wakeLock.test.ts) |
| Screen wake-lock import and best-effort use without DOM globals | [`test-node/wakeLock.test.ts`](../test-node/wakeLock.test.ts) |
| Real Obsidian/Electron wake-lock composition | [`apps/obsidian-harness/main.ts`](../../../apps/obsidian-harness/main.ts) and [`test/e2e-obsidian/scripts/mobile.ts`](../../../test/e2e-obsidian/scripts/mobile.ts) |

The Chromium suite is broad, but support claims still belong to the selected entry point and its tests. Consumer code owns integration with its target browser, Electron version, persistence policy, and application workflow.

For maintained application examples, see [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md). Self-hosted LiveSync exercises concurrency, reactive state, storage, binary, and browser-lifecycle modules at scale; DiffZip composes wake-lock, encryption, promise, and binary entries; and Screwdriver applies the path contract before restoring untrusted document paths. These are entry-point-specific examples rather than a package-wide platform guarantee.
