# ValueStore and storage adapters

Status: Implemented and locally verified under [ADR 0003](../adr/0003-value-store-capabilities.md). ADR 0003 supersedes the package split and implicit empty-string deletion rule in [ADR 0002](../adr/0002-value-store-serialisation.md). The affected packages remain unpublished at `0.0.0`; no consumer migration or registry release is included.

Date: 2026-10-19

## Scope and package boundaries

`@vrtmrz/value-store` owns shared asynchronous string and JSON-object operations, defaults, snapshots, serializer invocation, and fixed errors. It does not identify a backend, select a store, or provide secret-management guarantees. The package has no runtime, peer, or optional package dependencies. Existing Octagonal Wheels IndexedDB `KeyValueStore` APIs and `PersistentMap` remain unchanged.

| Entry | Responsibility |
| --- | --- |
| `@vrtmrz/value-store` | `ValueReader`, `ValueStore`, `ValueDeleter`, `ObjectValue`, `ValueSerializer`, `ValueStoreError`, value factories, and `MemoryValueStore`. |
| `@vrtmrz/value-store/web-storage` | Explicitly injected Web Storage with a literal prefix; `createWebStorageValueStore`. |
| `@vrtmrz/value-store/node-json-file` | Bounded JSON-file adapter using Node built-ins; `createJsonFileValueStore`. Node imports remain isolated to this entry. |
| `@vrtmrz/secret-store` | Separate named-secret profile, composed over the exported ValueStore API and retaining its portable name and well-formed Unicode validation. |
| `@vrtmrz/obsidian-plugin-kit/local-storage` | Obsidian App local-storage adapter and explicit construction-time legacy Web Storage selection. Host-specific `local-storage` naming remains appropriate. |

The repository retains eight independently versioned npm packages. `value-store` has no external package dependencies; `secret-store` depends on `value-store`; `secret-store-node` depends on `secret-store`, `value-store` for the shared error type, and the pinned age implementation. The ValueStore artefact must not ship the secret profile or cryptographic implementation.

## Public capabilities and values

The root exports `ValueReader`, `ValueStore`, and the separate `ValueDeleter` capability. `createValueReader` needs only raw `get`; `createValueStore` needs raw `get` and `set`; `createDeletableValueStore` also requires raw `delete` and returns `ValueStore & ValueDeleter`. `MemoryValueStore`, Web Storage, JSON-file, and Obsidian local-storage adapters expose deletion. A store without the deletion capability does not acquire it from the shape of another interface.

`getValue` returns a string or `null` when absent. `getObject` parses JSON, returns `undefined` when absent, and preserves stored JSON `null`. An optional getter default is validated before I/O, and object defaults are snapshotted before awaiting. Defaults are used only for absence; they are not serialised or persisted. Object writes snapshot JSON-compatible values before encoding: finite numbers, strings, booleans, `null`, arrays, and plain records. Invalid values and malformed stored data reject with fixed errors.

The shared `ValueStoreError` and `ValueStoreErrorCode` cover the existing fixed diagnostic categories. A paired `ValueSerializer` is captured once with its receiver, defaults to identity conversion, and may be synchronous or asynchronous. Object operations send JSON text through that same string boundary. Serializer failures are sanitised; no automatic fallback, retries, or backend selection are introduced.

Deletion is explicit. `setValue(key, '')` is an ordinary value write and invokes the serializer. `setObject(key, '')` stores the JSON representation of an empty string. Other falsy JSON values remain data, too. `delete(key)` skips the serializer and is available only where the backend capability is present. Generic stores may represent empty strings; an adapter which cannot represent the resulting physical value must reject it before mutation.

Keys and supplied prefixes remain literal JavaScript strings without normalisation. Persistent adapters map a logical key to `prefix + key`; callers own disjoint prefixes. Prefixes are namespace conventions, not access control.

## Adapter behaviour

The Web Storage adapter accepts a `Storage` capability explicitly and stores strings directly at the prefixed key. It does not discover browser globals. Empty strings can be stored; explicit deletion calls `removeItem`.

The Node file adapter is intended for small, infrequently changed settings. Its strict version-1 JSON document contains unique physical-key/string pairs as `{ version: 1, entries: [[key, value], ...] }`, with an inclusive 1 MiB UTF-8 limit. Each operation reads the current document; mutations replace it through a temporary file in the same existing directory. The API is asynchronous over synchronous Node I/O. Its existing authority, replacement, and single-writer limits remain in force, and the public `/node-json-file` entry is the only ValueStore entry which imports Node built-ins.

The official Obsidian adapter uses `App.loadLocalStorage` and `App.saveLocalStorage`. Obsidian owns Vault scoping; the application supplies its literal plug-in prefix. Explicit deletion maps to `saveLocalStorage(key, null)`. The host treats an empty raw string as deletion, so this adapter rejects an empty physical output with `invalid-value` before calling the host, preserving any previous value. A serializer which maps an empty logical string to non-empty physical text can preserve it. `setObject(key, '')` remains supported because JSON text is non-empty. Obsidian may suppress internal storage errors; the adapter cannot report failures the host hides.

The compatibility factory chooses between the official methods and an explicitly supplied legacy Web Storage provider once at construction. It uses legacy storage only when both official methods are absent. It does not migrate data or switch sources after an operation failure, including an empty-output rejection. The existing `obsidian >=1.8.7` peer floor is unchanged; the 1.7.7 probe remains an unverified regression probe.

## Verification status

Fresh validation on 2026-10-19 passed `npm run verify:workspace`, including type checks, package tests, release-tool tests, browser persistence, builds, dry-run packs, and installed-tarball consumer checks. The standalone ValueStore installation added only that package, with no runtime, peer, or optional dependencies. Its artefact contains no secret profile or cryptographic implementation; root and Web Storage bundles exclude Node code. Public type fixtures distinguish read, write, and deletion capabilities.

The ValueStore, SecretStore, and Node age suites passed 123, 114, and 58 tests respectively on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64, with file fixtures on ext4. The Chromium scenario passed empty-value preservation, explicit deletion, literal prefixes, injected OW encryption, and persistence after restart. The separate native age/rage interoperability suite passed all 22 checks.

The complete twelve-scenario validated Obsidian suite passed on reviewed 1.13.6. Its local-storage scenario checks rejection of unrepresentable physical empty writes before mutation, JSON empty values, explicit deletion, selected legacy storage, and restart. The historical 1.7.7 probe remains outside the reviewed catalogue.

Package-owned test sources live under `packages/value-store/test`; the browser scenario is `test/value-store-browser/web-storage.mjs`; packed public-consumer fixtures are under `test/packed-consumer`; and the Obsidian adapter remains under `packages/obsidian-plugin-kit`. This is package-owned evidence, not maintained consumer adoption. The injected OW HKDF example demonstrates a serializer boundary, not a cryptographic audit. ValueStore is not encrypted by default, and its memory store makes no persistence or secure-erasure guarantee.
