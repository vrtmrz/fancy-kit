# @vrtmrz/value-store

`@vrtmrz/value-store` provides asynchronous string and JSON-value operations, optional paired serialisers, an instance-scoped memory store, an injected Web Storage adapter, and an isolated Node JSON-file adapter. It has no package dependencies. Its platform-neutral root entry does not load browser globals, Node modules, Obsidian APIs, or secret-store code.

The root exports `ObjectValue`, `ValueSerializer`, `ValueStoreOptions`, `ValueReader`, `ValueStore`, `ValueDeleter`, the raw backend capability types, `ValueStoreError`, `sanitiseValueStoreError`, and `MemoryValueStore`. Import Web Storage from `@vrtmrz/value-store/web-storage` and the Node file adapter from `@vrtmrz/value-store/node-json-file`.

## Read, write, and delete values

`ValueReader` provides asynchronous `getValue` and `getObject`. `ValueStore` adds replacement writes through `setValue` and `setObject`. `ValueDeleter` is a separate capability, so a `ValueStore` does not promise deletion. The memory, Web Storage, and Node JSON-file implementations also implement `ValueDeleter`.

`getValue` returns the exact stored string or, without a default, `null` when the backend reports absence. `getObject` parses stored JSON and, without a default, returns `undefined` for absence, preserving stored top-level JSON `null` as `null`. `ObjectValue` is JSON-shaped data: `null`, booleans, finite numbers, strings, arrays, and plain records composed recursively from those values.

Every `setValue` call writes a value, including an empty string. It invokes the configured serialiser and passes the result to the backend. Use `delete` explicitly to remove an entry; deletion skips the serialiser. `setObject` JSON-encodes its value, so top-level `null`, empty strings, zero, negative zero, and `false` are data. Empty arrays and records are data as well.

```ts
import { MemoryValueStore } from '@vrtmrz/value-store';
import type { ValueReader } from '@vrtmrz/value-store';

const memory = new MemoryValueStore();
await memory.setValue('device-label', 'laptop');
await memory.setValue('optional-label', '');
await memory.delete('optional-label');
await memory.setObject('preferences', {
  theme: 'dark',
  options: { showHints: false, retries: 0, label: '' },
});

async function readSetting(reader: ValueReader, key: string) {
  return reader.getObject(key);
}

const preferences = await readSetting(memory, 'preferences');
```

Each `MemoryValueStore` owns separate state and starts empty. It is useful for tests and ephemeral state, but it does not persist values. It snapshots objects passed to `setObject` and returns fresh deep copies from `getObject`, so later caller mutation cannot change stored state. Create the store at the application composition root and pass a `ValueReader` to code that only needs to read.

The `ObjectValue` validator rejects non-finite numbers, `undefined`, functions, symbols, bigints, class instances, accessors, and cyclic values with `invalid-value`. String values and keys remain exact JavaScript strings; they are not coerced, trimmed, encoded, or normalised. Empty strings, NUL characters, a leading BOM, and lone UTF-16 surrogates remain permitted where accepted. JSON serialisation represents negative zero as zero.

Both getters accept an optional second argument used only for absence:

```ts
const label = await memory.getValue('missing-label', '');
const options = await memory.getObject('missing-options', { enabled: false });
```

Defaults follow the corresponding string or JSON-value rules and are validated before I/O. Object defaults are detached snapshots taken before asynchronous work starts. Defaults are never passed to the serialiser or stored. They do not replace stored empty strings, JSON `null`, other falsy data, or errors. Omit the argument or pass `undefined` to retain the absence sentinel. A supplied default removes absence from the return type without promising the shape of stored JSON.

## Inject a raw backend

The core factories require only the capabilities their returned facade needs. `createValueReader` captures only a raw backend's `get` method. `createValueStore` accepts and captures `get` and `set`, and returns a `ValueStore`. `createDeletableValueStore` also requires and captures `delete`, and returns `ValueStore & ValueDeleter`. These factories do not probe or write to the backend during construction.

```ts
import { createValueStore } from '@vrtmrz/value-store';

const store = createValueStore({
  get: async (key) => readRawValue(key),
  set: async (key, value) => writeRawValue(key, value),
});
```

The raw backend's `get` returns `null` only for absence. Keys are passed through unchanged. Applications select the backend explicitly; this package does not select or migrate storage automatically.

## Transform stored strings

`ValueSerializer` is an optional paired `serialize(key, value)` and `deserialize(key, value)` capability. Each method may return a string directly or a promise. The facade captures both methods and their receiver once at construction. Without a serialiser, stored strings are unchanged. Object writes first encode a JSON snapshot, then call `serialize`; object reads call `deserialize`, then parse JSON. Validation happens before a transform or backend call. Empty serialiser output is permitted as stored string data; an adapter whose backend cannot represent it must reject before mutation. Missing reads and explicit deletes do not invoke the serialiser. A transform failure rejects with a fixed `ValueStoreError`; there is no fallback, retry, read-back, or automatic migration.

## Prefixes

Persistent adapters prepend the supplied prefix to each key literally: `prefix + key`. They do not add a separator or alter either string. For example, prefix `'settings:'` and key `'theme'` address `'settings:theme'`; prefix `'settings'` and key `'theme'` address `'settingstheme'`. An empty prefix explicitly selects unprefixed keys. Choose a complete prefix, including any desired delimiter, and keep prefixes for separate stores distinct. A prefix helps avoid collisions; it is not an access-control boundary.

## Inject Web Storage

The application selects the storage object and passes it to the Web adapter:

```ts
import { createWebStorageValueStore } from '@vrtmrz/value-store/web-storage';

const storage = window.localStorage;
const browserSettings = createWebStorageValueStore(storage, {
  prefix: 'my-plugin:settings:',
});

await browserSettings.setValue('device-label', 'laptop');
await browserSettings.setValue('optional-label', '');
await browserSettings.setObject('preferences', {
  theme: 'dark',
  options: { showHints: false, retries: 0 },
});
await browserSettings.delete('optional-label');
```

The adapter uses only the supplied `getItem`, `setItem`, and `removeItem` methods. `setValue` stores raw strings, including empty strings; `setObject` stores JSON text at `prefix + key`. It performs one `setItem` call per write without a read-back or probe write. It does not read browser globals itself.

Raw `getValue` reads do not detect or migrate older JSON-encoded strings. For example, an older JSON text value `'"Alice"'` is returned with its quotes by `getValue`; use `getObject` only for data that is JSON. Invalid JSON supplied to `getObject` causes `invalid-data`. Backend failures remain errors rather than missing values. Choosing a different adapter does not move or copy existing data; migration belongs to the application.

For Obsidian's host-managed Vault storage, the separate `@vrtmrz/obsidian-plugin-kit/local-storage` entry provides `createObsidianLocalStore` and `createCompatibleObsidianLocalStore`. It passes raw strings to the host API, and object methods use JSON text with no envelope or read-back. The host deletes a raw empty-string write, so the official adapter rejects an empty physical output with `invalid-value` before calling the host. Explicit deletion maps to `saveLocalStorage(key, null)`. A serialiser can preserve an empty logical value by encoding it to a non-empty string. The host may hide some storage errors; see the plug-in kit usage guide for that limit. The compatibility selector can choose an explicitly supplied legacy Web Storage source only when both official host methods are absent. It never falls back after a selected backend operation fails, and neither factory migrates data.

## Use the Node JSON-file adapter

The Node entry is intended for small, infrequently changed settings. It uses synchronous Node filesystem and crypto APIs, which block the event loop while they run. Node built-ins are isolated to this entry.

```ts
import { join } from 'node:path';
import { createJsonFileValueStore } from '@vrtmrz/value-store/node-json-file';

const settings = createJsonFileValueStore({
  filePath: join(process.cwd(), 'data', 'settings.json'),
  prefix: 'my-plugin:',
});

await settings.setObject('preferences', { theme: 'dark', showHints: false });
await settings.setValue('optional-label', '');
const preferences = await settings.getObject('preferences');
```

The example assumes that the `data` directory already exists. `filePath` selects one dedicated JSON document; the file itself may be missing. A missing file starts as an empty store, and construction does not create or write it. Construction reads and validates an existing document. If a document that this instance has read or successfully written later disappears, or if stored data is malformed, operations fail instead of resetting the store to empty. Each operation reads the current document; the store does not keep an in-memory cache.

The document uses a strict version-1 shape containing only a `version` field set to `1` and an `entries` array of unique physical-key and stored-string pairs. The value for `setObject` is JSON text within the outer JSON document:

```json
{"version":1,"entries":[["my-plugin:preferences","{\"theme\":\"dark\",\"showHints\":false}"]]}
```

The complete UTF-8 document may be at most 1 MiB, inclusive. A write that would exceed the limit fails with `quota-exceeded`. The limit includes JSON syntax and every stored key and string, not just the value passed to a method. Empty-string `setValue` writes an empty string; `setObject` stores top-level `null`, empty strings, zero, and `false` as JSON text.

Each mutation reads the latest document, applies one key change, writes a temporary file in the same directory with mode `0600`, synchronises and closes it, then renames it over the selected file. Replacement relies on the filesystem's same-directory rename behaviour. If an error occurs after rename starts, `operation-failed` has an uncertain outcome: the replacement may or may not have taken effect. The adapter does not promise hardware power-loss durability.

The parent directory must already exist and remain the same directory. Select a dedicated file in a directory controlled by trusted owners. The file must be regular; symbolic links, extra hard links, and other file types are rejected. One process must own writes to the file. Worker-thread writers, concurrent read/modify/write, locking, transactions, retries, and automatic migration are not supported. The adapter does not encrypt data; do not use it for secrets.

## Handle failures

Failures use one `ValueStoreError` class with a fixed message and stable `code`. `sanitiseValueStoreError` is exported for adapters and applications composing their own store boundary. Errors do not retain an upstream message or cause, and do not include a file path or stored data. Branch on `code`, not `message`.

| Code | Meaning |
| --- | --- |
| `invalid-key` | A key is not a string. |
| `invalid-name` | A secret-profile name is invalid. |
| `invalid-value` | A value, prefix, serialiser, or required option is invalid or outside the supported `ObjectValue` shape. |
| `unavailable` | The selected storage capability, file, or directory is unavailable. |
| `access-denied` | The platform reliably identified denied access. |
| `quota-exceeded` | A storage quota or the Node document limit was exceeded. |
| `decryption-failed` | A secret value could not be decrypted. |
| `invalid-data` | A backend returned a non-string value, `getObject` encountered invalid JSON, or the Node document is malformed. |
| `operation-failed` | An operation failed without a more specific category, including an uncertain Node rename outcome. |

Storage failures, invalid data, and permission errors remain failures rather than becoming absence or defaults when the selected adapter can observe them. Obsidian's own API may hide a storage read failure as `null` or hide a failed write; the adapter cannot recover evidence which the host API does not return.

This package is separate from Fancy Kit's existing IndexedDB `KeyValueStore` family and `PersistentMap`; those APIs and their behaviour are unchanged. The secret-purpose profile remains in `@vrtmrz/secret-store`, which composes these public value operations and does not add deletion or listing capabilities.
