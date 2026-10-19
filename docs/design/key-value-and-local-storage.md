# Local storage adapters with explicit namespaces

Status: Implemented and locally verified with the asynchronous string/object contract in [ADR 0002](../adr/0002-value-store-serialisation.md). The package remains unpublished at `0.0.0`; consumer adoption and migration remain separate work.

Date: 2026-10-18

## Scope

Leave the existing IndexedDB `KeyValueStore` family and `PersistentMap` unchanged. Develop a separate asynchronous string and JSON-object capability for Obsidian, explicitly configured older Obsidian hosts, browsers, and Node.js. This follows SecretStore's composition pattern without importing its encryption, key management, or name restrictions.

The unpublished `0.0.0` package exposes `LocalValueReader`, `LocalValueStore`, `ObjectValue`, `ValueSerializer`, and `MemoryLocalValueStore` from its neutral root. The package and its exports remain independently versioned; the superseded unpublished Phase 3c method names have no compatibility aliases, and no release is implied by implementation work.

## Common contract

The unpublished `0.0.0` package exports the asynchronous `LocalValueReader` and `LocalValueStore` contracts, the recursive `ObjectValue` type, the paired `ValueSerializer` type, fixed errors, and `MemoryLocalValueStore`.

```ts
type ObjectValue =
  | string
  | number
  | boolean
  | null
  | ObjectValue[]
  | { [key: string]: ObjectValue };

interface ValueSerializer {
  serialize(key: string, value: string): string | Promise<string>;
  deserialize(key: string, value: string): string | Promise<string>;
}

interface LocalValueReader {
  getValue(key: string): Promise<string | null>;
  getObject(key: string): Promise<ObjectValue | undefined>;
}

interface LocalValueStore extends LocalValueReader {
  setValue(key: string, value: string): Promise<void>;
  setObject(key: string, value: ObjectValue): Promise<void>;
  delete(key: string): Promise<void>;
}
```

`getValue` returns a logical string or `null` for absence. `getObject` parses that logical string as JSON, returning `undefined` for absence and preserving a stored JSON `null`. `setValue` accepts strings; an empty local value deletes before the serializer runs. `setObject` snapshots and validates a JSON value, encodes it as JSON text, then uses the same string boundary. Thus a top-level `null`, empty string, zero, negative zero, or `false` passed to `setObject` is stored as data. JSON conversion represents nested negative zero as zero.

Runtime object values may contain only finite numbers, strings, booleans, `null`, arrays, and plain records. Reject `NaN`, infinities, `undefined`, functions, symbols, bigints, class instances, sparse arrays, accessors, and cycles as `invalid-value`, without invoking getters or `toJSON`. Parsed invalid or malformed stored data rejects as `invalid-data`. Keys and prefixes remain exact JavaScript strings, without coercion, trimming, encoding, or normalisation.

Neutral factories `createLocalValueReader` and `createLocalValueStore` accept explicit raw string backends and optional `{ serializer }` options. The reader backend needs only `get`; a writable backend adds `set` and `delete`. The serializer is a complete pair, defaults to identity conversion, and may return synchronously or asynchronously. Each factory captures the pair once, preserves its receiver, and performs no backend I/O during construction. The local and secret packages expose structurally compatible `ValueSerializer` interfaces without a runtime dependency between them.

The operation order is `setObject: validate and snapshot -> JSON text -> serialize -> backend write`; reads do `backend read -> deserialize -> parse and validate` for object methods. Validate caller keys and values before calling the serializer or backend. Deletion and empty local `setValue` bypass the serializer; absence bypasses `deserialize`. A serializer cannot turn a non-empty local value into an empty backend string. Validate transform outputs, map failures to fixed `LocalStorageError` codes, and never fall back to plaintext, another backend, or an empty value. Do not add retries, read-back, or probe writes. Calls return promises even when the backend is synchronous; callers await dependent operations, and concurrent calls have no invocation-order or transaction guarantee.

`MemoryLocalValueStore` owns separate instance state, accepts optional serializer options, stores only strings in its private map, snapshots object inputs, and returns fresh object snapshots. It has no persistence or secure-erasure guarantee.

## Explicit prefixes and Obsidian construction

Every persistent adapter receives an explicit `prefix` and maps a logical key to `prefix + key` exactly. No separator, encoding, trimming, Vault ID, or plug-in ID is inserted. An empty prefix explicitly selects unprefixed keys. Callers own stable, disjoint prefixes and their delimiters. Prefixes avoid collisions; they are not access control.

The direct Obsidian adapter uses only the official `App.loadLocalStorage` and `App.saveLocalStorage` methods. The host owns Vault scoping; the application supplies its complete plug-in prefix. The adapter sends raw strings: `setValue` stores a string, object methods encode and parse JSON text, and local deletion maps to `saveLocalStorage(key, null)`. It adds no persistence envelope, read-back, probe write, Vault discovery, or `appId` lookup. The public methods return promises although the host methods are synchronous. A host method that throws becomes a fixed `LocalStorageError`.

Obsidian's raw storage API deletes falsy values supplied directly, so the adapter sends a non-empty string for stored data and uses `null` only for explicit deletion. JSON encoding lets `setObject` retain top-level `false`, zero, empty string, and `null` as data. Obsidian 1.13.6 also catches internal storage failures: a read may appear indistinguishable from a missing key, and a write may fail without an error reaching the adapter. The adapter cannot report failures the host hides. Do not add extra operations to infer them. The asynchronous string/object scenario passes on reviewed Obsidian 1.13.6, including persistence after renderer restart.

The official declarations mark the methods available since Obsidian 1.8.7; the existing plug-in kit peer floor remains `obsidian >=1.8.7`. A passing 1.7.7 regression probe also exposes both official methods; it remains outside the reviewed catalogue and does not extend the peer support floor. The declarations do not expose `appId`, and the adapter must not derive scope from a Vault display name.

A separate compatibility factory selects its source once at construction. It uses the official methods when both are available. Only when both are absent may it evaluate the explicitly supplied legacy provider, once. Partial API support, malformed capabilities, and missing legacy configuration fail. A missing key or later operation error never switches sources.

The Web Storage source is explicitly passed as a capability. For an older Obsidian host, its physical prefix includes the consumer's explicit Vault and plug-in scope. Selecting a source does not migrate data. Any later migration remains an application-owned, selected-key operation.

## Browser and Node construction

The Web Storage adapter stores logical strings directly at `prefix + key`, then returns them through `getValue`. Object methods use JSON text through that same string backend. A normal write calls `setItem` once and does not read back or probe; empty-string `setValue` and explicit deletion use `removeItem` before serialisation. The object methods do not guess a representation or migrate data: raw `Alice` is a valid value for `getValue` but invalid JSON for `getObject`; JSON text written by `setObject` can be read as an object.

The Node entry is for small, infrequently changed settings. `createNodeLocalStore({ filePath, prefix, serializer })` exposes the asynchronous local-value contract over synchronous file I/O. Its strict version-1 document stores unique physical-key/string pairs as `{ version: 1, entries: [[key, value], ...] }`. The complete UTF-8 JSON document has an inclusive 1 MiB limit. Each operation reads the current document; mutations replace it through a temporary file in the same existing directory. A missing file at construction represents an empty store without creating or writing the file. Malformed data, or disappearance after the instance has read or written the file, is an error rather than an empty reset. The adapter adds no implicit cache, background flush, lock service, recovery journal, or automatic migration.

The Node file requires one writer process. Same-directory replacement avoids exposing a partly written document, but concurrent read/modify/write and hardware power-loss guarantees are outside the contract. The parent directory must already exist and remain the same directory; the selected file must be regular and must not be a symbolic link or have extra hard links. Platform and filesystem qualification remains separate. The factory validates the configured path and existing document during construction; the neutral raw-backend factories themselves perform no construction-time I/O.

`ObjectValue` accepts finite numbers, strings, booleans, `null`, arrays, and plain records. The snapshot and JSON conversion represent negative zero as zero. Strings may include NUL, a leading BOM, or lone UTF-16 surrogates. An empty local `setValue` deletes before serialisation, but an empty string passed to `setObject` is stored as JSON data, including when nested.

Do not require Node's global `localStorage`: [Node 24.18.0](https://nodejs.org/download/release/v24.18.0/docs/api/globals.html#localstorage) requires explicit web-storage enablement and a command-line persistence file, and shares that store across the process's server requests. A caller may still inject an explicitly provisioned compatible object through the generic Web Storage adapter. None of these paths is a secret store.

## Package placement

| Entry | Contents |
| --- | --- |
| `@vrtmrz/local-storage` | Asynchronous string and JSON-object contracts, paired serializer types, fixed errors, and instance-scoped memory storage. |
| `@vrtmrz/local-storage/web-storage` | Structural Web Storage adapter and explicit namespace handling; no browser-global discovery. |
| `@vrtmrz/local-storage/node` | Focused Node JSON file implementation using built-in APIs. |
| `@vrtmrz/obsidian-plugin-kit/local-storage` | Direct official host adapter and a separate construction-time compatibility selector. |

Focused exports must ensure that importing the neutral or Web Storage entry neither evaluates Node modules nor requires Node types. The UI-specific browser kit does not need to own storage. One new package is sufficient because the Node implementation adds no third-party runtime dependency. The completed SecretStore work remains separate; neither IndexedDB nor `PersistentMap` is modified.

## Implementation and verification

- Package-owned tests cover asynchronous string and object operations, absent versus JSON null, empty-value deletion, JSON falsy data, exact keys and prefixes, snapshots, invalid values, paired serializers, fixed errors, and backend-call ordering.
- Real Chromium tests verify raw strings, JSON object representation, exact UTF-16 strings, and persistence across browser restart. The injected OW HKDF example also decrypts ciphertext after a fresh module instance starts. The adapter itself does not discover browser globals.
- The isolated real-Obsidian scenario passes on reviewed 1.13.6 with official storage, explicitly selected legacy Web Storage, persistence across restart, and prefix separation. Official empty writes delete, while external empty Web Storage strings remain readable. The legacy selector is exercised by explicitly omitting the official capability; no API-absent host version is qualified.
- Node tests cover restart reconstruction, malformed documents, size limits, deletion, write failures, temporary-file cleanup, uncertain replacement outcomes, and asynchronous serializer failures on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64 with ext4. The installed package also reads and writes from a separate process.
- The workspace gate and installed-tarball checks pass for package boundaries, public exports, and neutral/Web Storage imports without Node code. The complete reviewed Obsidian 1.13.6 suite passes all twelve scenarios. Consumer adoption and data migration remain separate work.
