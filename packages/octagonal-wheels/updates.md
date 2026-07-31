# Updates

## Unreleased

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
