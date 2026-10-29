# Updates

## Unreleased

### New features

- Added the focused `binary/blob` entry with `createTextBlob`, `createBinaryBlob`, and `toBlob`. Creation preserves line endings and binary view ranges; normalisation preserves existing Blob identity. The entry can be imported without DOM or fetch globals; creation and normalisation use the standard Blob constructor when called.
- Added `isBlobContentEqual` for sequential byte comparison in parts of at most 10,000 bytes, independently of MIME types. Its optional `ArrayBufferContentEquality` predicate supports synchronous or asynchronous host strategies.

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
