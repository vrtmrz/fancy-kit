# Updates

## Unreleased

### New features

- Added the focused `binary/blob` entry with `createTextBlob`, `createBinaryBlob`, and `toBlob`. Creation preserves line endings and binary view ranges; normalisation preserves existing Blob identity. The entry can be imported without DOM or fetch globals; creation and normalisation use the standard Blob constructor when called.
- Added `isBlobContentEqual` for sequential byte comparison in parts of at most 10,000 bytes, independently of MIME types. Its default comparison uses native `Uint8Array.toBase64` where available and direct byte comparison otherwise, avoiding encoded-string allocation in the fallback. Its optional `ArrayBufferContentEquality` predicate supports synchronous or asynchronous host strategies.

### Legacy compatibility

- Old percent-prefixed UTF-16 data remains readable through the existing binary entry. Decoder fixtures now check fixed expected bytes; retired encoder code is separated behind the existing deprecated exports.
- Existing CRC-derived string hash values remain reproducible through `crc32CHash`, `crc32CKHash`, and the CRC namespace. These entries are now marked deprecated and retained for compatibility.

### Cache behaviour

- Accessing a cached falsy value or a falsy key through reverse lookup now refreshes its LRU position. Cache membership checks preserve empty strings, zero, false, null, and undefined as stored data, so a recently accessed entry is not evicted as the oldest entry.

### Encryption diagnostics

- The `testCrypt` entry no longer carries a deprecation annotation, so consumers can retain its combined diagnostics for legacy encryption formats and HKDF without a deprecation warning.

### Resource ownership

- Added the focused `resource` entry with `DisposableResource`, `OwnedResource<T>`, `createOwnedResource`, and `withOwnedResource`. Owners can pair any value with synchronous or asynchronous cleanup, retain one disposal outcome, and await cleanup after a scoped operation. `DeferredAction` and `CoalescingNotifier` share the disposal interface while preserving their existing behaviour.

### Shared value utilities

- Typed JSON cloning accepts recursively checked JSON-compatible types, including ordinary interfaces and readonly arrays. Date, functions, and other non-data values are rejected in typed calls; the output defaults to the input type. Explicit output types remain caller assertions, and runtime JSON behaviour is unchanged.
- Positive infinite durations display as `∞y`.

- Added `formatDuration`, `cloneViaJSON`, `findPathComponentsExceedingUtf8Limit`, `splitDelimitedList`, `joinDelimitedList`, and `stepCyclicIndex`, with focused imports and explicit conversion and boundary contracts.

### Modification handling

- Consumers can reuse a read, decode, compare, and conditional-write operation through `createModificationHandler` from `modification`. Synchronous and asynchronous adapters retain application storage, equality, and recovery policy. Only read failures enter the supplied fallback; later failures propagate, and `changed` is returned after writing completes.

### Callback utilities

- Consumers can suppress consecutive duplicate callback arguments with `onlyWhenChanged` from `function`. Each wrapper retains its own last value, initially `undefined`, and uses strict equality. Synchronous failures leave the previous value intact; callback return values are discarded.

### Concurrency

- Applications can wait for notifications independently of processing queues through `createNotifier` from `concurrency/notifier`. Current waiters share a promise, idle notifications are discarded, and the legacy `Notifier` classes retain their entry points through the same state operations.
- Single-key operations can use `withLock` alongside `withLocks`; legacy `serialized` shares their lock registry.
- Scoped pipelines use the `ScopedPipeline` type and the focused `concurrency/scoped.iteration` entry. The previous iteration entry remains a compatibility re-export.

- Operations can acquire several shared lock groups with `withLocks` from `concurrency/lock`. The helper awaits the callback and releases every acquired lock on success or failure. Callers provide unique keys in a consistent order and retain responsibility for avoiding nested acquisition of held keys.

- Added `withCounting` for an operation-scoped mutable count and `createCoalescingNotifier` for the latest pending update after a count increase or maximum wait. The notifier supports explicit flush and disposal, an optional progress-count selector, and an injected scheduler.

- We can hold a semaphore permit for an operation and release it on success or failure.
    - `withSemaphore` in `concurrency/semaphore` starts a callback after acquisition, awaits its result, and releases once in `finally`. An injected acquisition capability supports composition tests.

### Scheduling

- We can reschedule, cancel, and dispose a delayed callback independently for each owner.
    - `concurrency/deferredAction` provides `createDeferredAction`, `DeferredAction`, and `TimeoutScheduler`, with an injectable scheduler and a focused entry which imports without timer or browser globals.

## 0.1.55

### Maintenance

- Our browser-test toolchain now uses patched Vitest dependencies. Development metadata uses Vitest 4.1.11 and its Playwright provider, removing the vulnerable Tinypool dependency and the unused WebdriverIO dependency path.

## 0.1.54

### Fixed

- `EventHub.on` and `EventHub.onEvent` now honour caller-supplied abort signals. Their returned disposers are registration-scoped and idempotent, so an old disposer cannot remove a later subscription.

### Improved

- `EventHub.once` and `EventHub.onceEvent` now accept native `AddEventListenerOptions`, including abort signals, while retaining one-time delivery.

## 0.1.53

### Fixed

- Generated legacy TypeScript declaration mappings from the package's public export inventory, allowing every supported subpath to resolve under `Node10` module resolution without changing runtime exports.

## 0.1.52

### Fixed

- Large-buffer base64 encoding now works in Node 22 and 24 without a `FileReader` polyfill, covering both `arrayBufferToBase64` and `encodeBinary`.

### Documentation

- Reworked the package overview around focused imports and runtime boundaries, and added an import and testing guide to the npm package. The full generated TSDoc reference remains available in the repository.

## 0.1.51

### New features

- Added a lifecycle-aware Screen Wake Lock manager for browser consumers. Bounded work can use the recommended closure-based `run()` API, while longer split lifecycles can acquire and dispose of an explicit lease.

### Improved

- Screen Wake Lock requests now share one platform sentinel across overlapping logical leases, respond to document visibility changes, and expose instance-scoped diagnostics and dependency injection for tests.
