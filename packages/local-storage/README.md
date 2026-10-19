# @vrtmrz/local-storage

`@vrtmrz/local-storage` provides asynchronous string and object storage contracts, paired optional serializers, an instance-scoped memory store, an injected Web Storage adapter, and a Node.js file adapter. The workspace package is an unpublished development version (`0.0.0`).

The platform-neutral root entry exports `ObjectValue`, `ValueSerializer`, `LocalValueReader`, `LocalValueStore`, `LocalStorageError`, and `MemoryLocalValueStore`. Import the Web Storage adapter from `@vrtmrz/local-storage/web-storage` and the Node adapter from `@vrtmrz/local-storage/node`. The root and Web Storage entries do not discover browser globals or load Node modules.

## Read and write strings or JSON objects

`LocalValueReader` provides asynchronous `getValue` and `getObject`; `LocalValueStore` adds `setValue`, `setObject`, and `delete`. `getValue` returns the exact stored string or, without a default, `null` when the backend reports absence. `getObject` parses stored JSON and, without a default, returns `undefined` for absence, preserving a stored top-level JSON `null` as `null`. `ObjectValue` is JSON-shaped data: `null`, booleans, finite numbers, strings, arrays, and plain records composed recursively from those values.

`setValue(key, value)` stores a string, except that an empty string selects deletion without invoking the serializer. `setObject(key, value)` JSON-encodes the value and stores it as a string; top-level `null`, empty strings, zero, negative zero, and `false` are data in this mode. Empty arrays and records are data as well. These rules do not filter values returned by `getValue` or `getObject`.

```ts
import { MemoryLocalValueStore } from '@vrtmrz/local-storage';
import type { LocalValueReader } from '@vrtmrz/local-storage';

const memory = new MemoryLocalValueStore();
await memory.setValue('device-label', 'laptop');
await memory.setObject('preferences', {
  theme: 'dark',
  options: { showHints: false, retries: 0, label: '' },
});

async function readSetting(reader: LocalValueReader, key: string) {
  return reader.getObject(key);
}

const preferences = await readSetting(memory, 'preferences');
```

Each `MemoryLocalValueStore` owns separate state and starts empty. It is useful for tests and other ephemeral state, but it does not persist values. It snapshots objects passed to `setObject` and returns fresh deep copies from `getObject`, so later caller mutation cannot change stored state. Create the store at the application composition root and pass a `LocalValueReader` to code that only needs to read.

The `ObjectValue` validator rejects non-finite numbers, `undefined`, functions, symbols, bigints, class instances, accessors, and cyclic values with `invalid-value`. String values, keys, and prefixes remain exact JavaScript strings; they are not coerced, trimmed, encoded, or normalised. Empty strings, NUL characters, a leading BOM, and lone UTF-16 surrogates remain permitted where accepted. JSON serialisation represents negative zero as zero.

Both getters accept an optional second argument used only for absence:

```ts
const label = await memory.getValue('missing-label', '');
const options = await memory.getObject('missing-options', { enabled: false });
```

Defaults follow the corresponding string or JSON-value rules and are validated before I/O. Object defaults are detached snapshots taken before asynchronous work starts. Defaults are never passed to the serializer or stored. They do not replace stored empty strings, JSON `null`, other falsy data, or errors. Omit the argument or pass `undefined` to retain the absence sentinel. A supplied default removes absence from the return type without promising the shape of stored JSON.

## Transform stored strings

`ValueSerializer` is an optional, paired `serialize(key, value)` and `deserialize(key, value)` capability. Each method may return a string directly or a promise. Adapters capture the pair and its receiver once at construction; without a serializer, stored strings are unchanged. Object writes first use JSON serialisation, then call `serialize`; object reads call `deserialize`, then parse JSON. Validation happens before a transform or backend call. A non-empty logical string must produce a non-empty stored string, because the empty string is reserved for local deletion. Missing reads and deletes do not invoke the serializer. A transform failure rejects with a fixed `LocalStorageError`; there is no fallback, retry, read-back, or automatic migration.

## Prefixes

Persistent adapters prepend the supplied prefix to each key literally: `prefix + key`. They do not add a separator or alter either string. For example, prefix `'settings:'` and key `'theme'` address `'settings:theme'`; prefix `'settings'` and key `'theme'` address `'settingstheme'`. An empty prefix explicitly selects unprefixed keys. Choose a complete prefix, including any desired delimiter, and keep prefixes for separate stores distinct. A prefix helps avoid collisions; it is not an access-control boundary.

## Inject Web Storage

The application selects the storage object and passes it to the Web adapter:

```ts
import { createWebStorageLocalStore } from '@vrtmrz/local-storage/web-storage';

const storage = window.localStorage;
const browserSettings = createWebStorageLocalStore(storage, {
  prefix: 'my-plugin:settings:',
});

await browserSettings.setValue('device-label', 'laptop');
await browserSettings.setObject('preferences', {
  theme: 'dark',
  options: { showHints: false, retries: 0 },
});
```

The adapter uses only the supplied `getItem`, `setItem`, and `removeItem` methods. `setValue` stores raw strings, while `setObject` stores JSON text at `prefix + key`; reads reverse the corresponding path. An empty `setValue` uses `removeItem` before serialisation. Other writes use one `setItem` call without a read-back or probe write. It does not read browser globals itself.

Raw `getValue` reads do not detect or migrate older JSON-encoded strings. For example, an older JSON text value `'"Alice"'` is returned with its quotes by `getValue`; use `getObject` only for data that is JSON. Invalid JSON supplied to `getObject` causes `invalid-data`. Backend failures remain errors rather than missing values. Choosing a different adapter does not move or copy existing data; migration belongs to the application.

For Obsidian's host-managed Vault storage, the separate `@vrtmrz/obsidian-plugin-kit/local-storage` entry provides `createObsidianLocalStore` and `createCompatibleObsidianLocalStore`. The adapter passes raw strings to the host API; object methods use JSON text, with no envelope or read-back. An empty `setValue` deletes before serialisation, and the adapter maps deletion to `saveLocalStorage(key, null)`; the host also deletes a direct empty-string write. The observed Obsidian 1.13.6 API internally hides some storage errors; see the plug-in kit usage guide for that limit. The compatibility selector can choose an explicitly supplied legacy Web Storage source only when both official host methods are absent. Its source remains lazy, and neither factory migrates data.

## Use the Node file adapter

The Node entry is intended for small, infrequently changed settings. It uses synchronous Node.js 20+ filesystem and crypto APIs, which block the event loop while they run. The package tests pass on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64 with ext4. Windows ACLs, macOS, and network filesystems are not qualified by those checks.

```ts
import { join } from 'node:path';
import { createNodeLocalStore } from '@vrtmrz/local-storage/node';

const settings = createNodeLocalStore({
  filePath: join(process.cwd(), 'data', 'settings.json'),
  prefix: 'my-plugin:',
});

await settings.setObject('preferences', { theme: 'dark', showHints: false });
const preferences = await settings.getObject('preferences');
```

The example assumes that the `data` directory already exists. `filePath` selects one dedicated JSON document; the file itself may be missing. A missing file starts as an empty store, and construction does not create or write it. Construction reads and validates an existing document. If a document that this instance has read or successfully written later disappears, or if stored data is malformed, operations fail instead of resetting the store to empty. Each operation reads the current document; the store does not keep an in-memory cache.

The document uses a strict version-1 shape containing only a `version` field set to `1` and an `entries` array of unique physical-key and stored-string pairs. The value for `setObject` is JSON text within the outer JSON document:

```json
{"version":1,"entries":[["my-plugin:preferences","{\"theme\":\"dark\",\"showHints\":false}"]]}
```

The complete UTF-8 document may be at most 1 MiB, inclusive. A write that would exceed the limit fails with `quota-exceeded`. The limit includes JSON syntax and every stored key and string, not just the value passed to a method. Empty-string `setValue` deletes; `setObject` stores top-level `null`, empty strings, zero, and `false` as JSON text.

Each mutation reads the latest document, applies one key change, writes a temporary file in the same directory with mode `0600`, synchronises and closes it, then renames it over the selected file. Replacement relies on the filesystem's same-directory rename behaviour. If an error occurs after rename starts, `operation-failed` has an uncertain outcome: the replacement may or may not have taken effect. The adapter does not promise hardware power-loss durability.

The parent directory must already exist and remain the same directory. Select a dedicated file in a directory controlled by trusted owners. The file must be regular; symbolic links, extra hard links, and other file types are rejected. One process must own writes to the file. Worker-thread writers, concurrent read/modify/write, locking, transactions, retries, and automatic migration are not supported. The adapter does not encrypt data; do not use it for secrets.

## Handle failures

Failures use `LocalStorageError` with a fixed message and a stable `code`. The error does not retain an upstream message or cause, and does not include a file path or stored data. Branch on `code`, not `message`.

| Code | Meaning |
| --- | --- |
| `invalid-key` | A key is not a string. |
| `invalid-value` | A value, prefix, serializer, or required option is invalid or outside the supported `ObjectValue` shape. |
| `unavailable` | The selected storage capability, file, or directory is unavailable. |
| `access-denied` | The platform reliably identified denied access. |
| `quota-exceeded` | A storage quota or the Node document limit was exceeded. |
| `invalid-data` | A backend returned a non-string value, `getObject` encountered invalid JSON, or the Node document is malformed. |
| `operation-failed` | An operation failed without a more specific category, including an uncertain Node rename outcome. |

Storage failures, invalid data, and permission errors remain failures rather than becoming absence or defaults when the selected adapter can observe them. Obsidian's own API may hide a storage read failure as `null` or hide a failed write; the adapter cannot recover evidence which the host API does not return.

This package is separate from Fancy Kit's existing IndexedDB `KeyValueStore` family and `PersistentMap`; those APIs and their behaviour are unchanged. It is also separate from SecretStore: local value storage provides no encryption or secret-management guarantees.
