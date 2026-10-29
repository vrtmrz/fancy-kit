# Octagonal Wheels

`octagonal-wheels` is an ESM collection of specialised utilities used in browser, Electron, and extension applications. It includes binary conversion, concurrency, data structures, persistence, cryptography, events, iterables, caching, and browser lifecycle helpers.

The library is exercised in maintained Self-hosted LiveSync, DiffZip, and Screwdriver workflows. See [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md) for the selected entry points and the tests which surround each application boundary.

The APIs are designed for specific trade-offs rather than as universal replacements for platform or standard-library features. Select the smallest public entry point whose contract fits the application.

> [!IMPORTANT]
> This package remains in `0.x` development. npm's normal compatible range accepts patch releases but not the next minor release. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly.

```bash
npm install octagonal-wheels
```

## Imports

The package has no default export. The root entry point exposes module namespaces:

```ts
import { binary, promises } from "octagonal-wheels";

const bytes = binary.hexStringToUint8Array("46616e6379204b6974");
const text = binary.uint8ArrayToHexString(bytes);
await promises.delay(10);
```

Focused subpaths expose a module directly and are preferable when only one area is needed:

```ts
import {
  hexStringToUint8Array,
  uint8ArrayToHexString,
} from "octagonal-wheels/binary";

const bytes = hexStringToUint8Array("00ff10");
console.log(uint8ArrayToHexString(bytes)); // "00ff10"
```

Public subpaths are declared by the package export map. Extensionless imports, such as `octagonal-wheels/iterable/map`, are the recommended form; `.js` aliases exist for compatibility. Do not import package `src` or `dist` files.

The shared runtime utilities include `createOwnedResource`, `withOwnedResource`, `createDeferredAction`, `createCoalescingNotifier`, `withCounting`, compact duration formatting, JSON-based cloning, delimiter lists, UTF-8 component inspection, and cyclic indices. Their contracts and focused imports are described in the [runtime guide](guides/imports-and-runtime.md).

## Module areas

| Area | Examples |
| --- | --- |
| Data conversion and utility functions | `binary`, `collection`, `function`, `iterable`, `number`, `object`, `path`, and `string` |
| Scheduling and coordination | `actor`, `bureau`, `channel`, `concurrency`, `conduit`, `events`, and `promises` |
| State and storage | `BackedQueue`, `databases`, `dataobject`, and `memory` |
| Hashing and cryptography | `encoding`, `encryption`, and `hash` |
| Platform integration | `browser`, including the reference-counted screen wake-lock manager |

The [generated API index](https://github.com/vrtmrz/fancy-kit/blob/main/packages/octagonal-wheels/docs/modules.md) links to per-module and per-symbol TSDoc. The [import and runtime guide](https://github.com/vrtmrz/fancy-kit/blob/main/packages/octagonal-wheels/guides/imports-and-runtime.md) explains entry-point selection, platform dependencies, testing boundaries, and maintained examples.

## Blob conversion and comparison

`binary/blob` provides `createTextBlob`, `createBinaryBlob`, and `toBlob` for
standard Blob inputs. Creation returns a new Blob; `toBlob` preserves an
existing Blob's identity and MIME type. `isBlobContentEqual` compares bytes in
bounded parts, with an optional synchronous or asynchronous equality predicate.
See the [Blob guide](guides/imports-and-runtime.md#blob-creation-and-normalisation)
for input types, line endings, binary view ranges, comparison, and runtime requirements.

## Apply content when it changes

Use `createContentApplier` from the unreleased `content` entry to compose reading,
decoding, comparison, and conditional writing. Inject storage and recovery policy;
only a read failure invokes the supplied fallback. The result distinguishes a
completed write from an unchanged target. See the
[content guide](guides/imports-and-runtime.md#apply-content-when-it-changes).

## Deferred actions

Use `createDeferredAction` from `concurrency/deferredAction` when one owner
needs to reschedule, cancel, or dispose a delayed callback. Each action owns
at most one pending timeout. An injected `TimeoutScheduler` selects the host
operation; the default uses global timers only when needed. See the
[deferred action guide](guides/imports-and-runtime.md#own-one-delayed-callback) for
lifecycle and testing contracts.

## Hold a semaphore permit

Use `withSemaphore` from `concurrency/semaphore` to acquire a permit, run a
callback, and release the permit when the callback settles. Pass an existing
semaphore or an injected acquisition capability. See the
[semaphore guide](guides/imports-and-runtime.md#hold-a-semaphore-permit) for
result, failure, and ownership contracts.

## Multi-key operations and repeated values

Use `serializedByKeys` from `concurrency/lock` to hold a caller-ordered set of
unique keys for one asynchronous operation. Use `wrapMemo` from `function` to
suppress consecutive strictly equal callback arguments. The [runtime guide](guides/imports-and-runtime.md#serialise-an-operation-across-several-keys)
describes lock ordering, initial values, and failure behaviour.

## Bounded asynchronous work

`asyncMapWithConcurrency` retains input order while limiting concurrent callbacks. `withConcurrency` uses completion order instead:

```ts
import { asyncMapWithConcurrency } from "octagonal-wheels/iterable/map";

const output: string[] = [];
for await (const value of asyncMapWithConcurrency(
  ["one", "two", "three"],
  async (input) => input.toUpperCase(),
  2,
)) {
  output.push(value);
}
```

## Best-effort screen wake lock

The browser wake-lock manager shares one platform sentinel across overlapping logical leases, responds to document visibility, and exposes injectable platform contracts for tests:

```ts
import { createScreenWakeLockManager } from "octagonal-wheels/browser/wakeLock";

declare function createBackup(): Promise<void>;

const wakeLock = createScreenWakeLockManager();
try {
  await wakeLock.run(async () => {
    await createBackup();
  }, { label: "backup" });
} finally {
  await wakeLock.dispose();
}
```

Platform acquisition is best effort: an unavailable API or rejected request does not prevent the callback from running. A screen wake lock does not guarantee background execution or prevent operating-system suspension.

## Runtime boundary

The primary test runtime is Chromium. Individual entry points may require DOM scheduling APIs, IndexedDB, Web Crypto, `navigator`, or other browser facilities. Some pure utilities also work in Node.js, but the package does not make a package-wide Node.js compatibility claim. The screen wake-lock entry point is explicitly tested for safe import and best-effort use without DOM globals.

Use focused imports, inspect the selected API contract, and inject a consumer-owned boundary when application policy must be tested independently of a browser or persistent store.

See [updates](updates.md) for released and pending user-visible changes.
