# ADR 0003: Separate value operations, secret profiles, and storage adapters

Status: Accepted; implemented and locally verified.

Date: 2026-10-19

This decision replaces the package split and local empty-string deletion rule in [ADR 0002](0002-value-store-serialisation.md). It preserves the explicit authority, key acquisition, and persistence boundaries in [ADR 0001](0001-secret-store-boundaries.md). The affected storage packages remain unpublished at `0.0.0`.

## Problem

`local-storage` names a location, while `secret-store` names a use. SecretStorage, memory, and age files can all be local. The neutral local facade can also wrap an explicitly supplied backend without knowing its location. The package name does not describe that capability precisely.

The two facades already share asynchronous string and JSON operations, absence sentinels, getter defaults, object snapshots, serializer capture, and fixed errors. Their differences are key and string validation, deletion capability, empty-string writes, and error categories. Maintaining two independent implementations duplicates behaviour without creating independent responsibilities. The inherited `toJSON` defect demonstrated the practical cost of keeping equivalent object-encoding paths separate.

The current local empty-string deletion rule accommodates Obsidian's raw local-storage API. Memory, Web Storage, JSON files, Obsidian SecretStorage, and age files do not require that rule. A storage-specific restriction should not silently turn an ordinary value write into deletion across all backends.

## Responsibilities

Separate three concerns:

1. **Value operations:** asynchronous reads and writes, JSON conversion, defaults, snapshots, serializer invocation, and sanitised errors.
2. **Secret profile:** the existing portable name and well-formed Unicode rules, with explicit secret-purpose factories and documentation. This profile does not establish encryption or process isolation.
3. **Storage adapters:** physical key mapping, host calls, file formats, authority checks, backend limits, and observable platform errors.

The common value-operation engine belongs to `value-store`. The separate `secret-store` package composes its exported value facades with fixed secret-specific validation. It does not import private implementation paths or require a public policy registry or arbitrary validation callbacks. Secret validation must retain its existing order relative to serializer calls and backend I/O. Applications still inject their backend and serializer explicitly; neither package selects a backend automatically.

## Package and import boundaries

| Entry | Responsibility |
| --- | --- |
| `@vrtmrz/value-store` | Shared contracts, `ObjectValue`, `ValueSerializer`, `ValueStoreError`, facade factories, and `MemoryValueStore`. No runtime dependencies, Node modules, DOM globals, or Obsidian imports. |
| `@vrtmrz/secret-store` | Secret profile, `SecretReader`, `SecretStore`, `createSecretReader`, `createSecretStore`, `validateSecretName`, and `MemorySecretStore`, depending only on `@vrtmrz/value-store` for common operations and types. |
| `@vrtmrz/value-store/web-storage` | Explicitly injected Web Storage with literal prefixes; `createWebStorageValueStore`. |
| `@vrtmrz/value-store/node-json-file` | Existing bounded JSON-file implementation; `createJsonFileValueStore`. Node built-ins remain isolated to this entry. |
| `@vrtmrz/obsidian-plugin-kit/local-storage` | Official App local-storage and explicit legacy-selection adapters. The existing `createObsidianLocalStore` and `createCompatibleObsidianLocalStore` names describe the selected host API and remain appropriate here. |
| `@vrtmrz/obsidian-plugin-kit/secrets` | Existing injected SecretStorage adapter, using `@vrtmrz/secret-store`. |
| `@vrtmrz/secret-store-node/age` | Existing encrypted secret-file backend, depending on `@vrtmrz/secret-store`, `@vrtmrz/value-store` for shared errors, and the pinned age implementation. |

Rename the unpublished `packages/local-storage` to `packages/value-store` and retain `packages/secret-store` as a separate package. Keep `packages/secret-store-node` separate as well. The existing five packages plus `value-store`, `secret-store`, and `secret-store-node` make eight npm packages in total. Subpath exports are not additional packages.

Keep the dependency direction explicit:

```text
secret-store-node -> secret-store -> value-store
secret-store-node -> value-store (shared errors)
secret-store-node -> age-encryption
```

`value-store` must have no runtime, optional, or peer package dependencies. Installing it alone includes its own Web Storage and Node JSON-file entries, but no secret profile, age implementation, or Obsidian package. Node built-ins remain isolated to the Node entry. Installing `secret-store` adds `value-store`; installing `secret-store-node` additionally installs the age dependency and its dependency tree.

Before this reorganisation, both neutral packages had no runtime dependencies. Combining them without adding dependencies would not itself have installed age or other external packages. Keeping them separate instead isolates the shipped secret functionality and its future dependencies from ordinary value consumers. Subpath imports control module loading, but cannot provide separate npm installation dependency sets within one package.

Keep the existing Octagonal Wheels IndexedDB APIs and `PersistentMap` unchanged. They have different value, lifecycle, caching, enumeration, and persistence contracts; the new package does not replace them or migrate their data.

## Public capabilities

Retain the accepted getter overloads and JSON value shape. Separate deletion from replacement writes:

```ts
interface ValueReader {
  getValue(key: string, defaultValue: string): Promise<string>;
  getValue(key: string, defaultValue?: string): Promise<string | null>;
  getObject(key: string, defaultValue: ObjectValue): Promise<ObjectValue>;
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
}

interface ValueStore extends ValueReader {
  setValue(key: string, value: string): Promise<void>;
  setObject(key: string, value: ObjectValue): Promise<void>;
}

interface ValueDeleter {
  delete(key: string): Promise<void>;
}
```

`createValueReader` accepts a raw read capability. `createValueStore` accepts raw read and replacement-write capabilities. `createDeletableValueStore` explicitly requires raw deletion as well and returns `ValueStore & ValueDeleter`. Their raw backend interfaces retain the existing `get`, `set`, and `delete` method spellings. Construction captures only the methods required by the selected capability; it performs no probe writes.

`MemoryValueStore`, Web Storage, JSON-file, and Obsidian local-storage factories expose `ValueStore & ValueDeleter`. Secret factories retain `SecretReader` and `SecretStore` as descriptive profile-specific interfaces over the same value operations. They do not expose deletion or listing. No adapter gains an operation merely because its underlying platform could implement it.

The common facade requires string keys without normalisation. The secret profile retains the 1–64-character lowercase ASCII name rule and validation of well-formed Unicode direct strings. JSON-encoded string leaves retain their existing escaping behaviour. Profile and adapter restrictions remain documented preconditions: matching method signatures do not imply that every key and value accepted by one store is accepted by every other store.

Use one `ValueStoreError` class and one sanitiser. Preserve the union of current code values: `invalid-key`, `invalid-name`, `invalid-value`, `unavailable`, `access-denied`, `quota-exceeded`, `decryption-failed`, `invalid-data`, and `operation-failed`. The profile or adapter supplies only categories justified by its evidence. Error messages stay fixed, with no upstream causes, values, names, or paths. This replaces the two unpublished error classes without discarding their diagnostic categories.

## Value, absence, and deletion semantics

| Operation or result | Meaning |
| --- | --- |
| `setValue(key, '')` | An ordinary value write, including serializer invocation. Never an implicit delete. |
| `setObject(key, '')` | Store the JSON representation of an empty string, as today. |
| `setObject(key, null / false / 0)` | Store JSON data, as today. |
| `delete(key)` | Explicit removal, available only through `ValueDeleter`; skip the serializer. |
| Absent `getValue` without a default | `null`, as today. |
| Absent `getObject` without a default | `undefined`, as today; stored JSON null remains `null`. |
| A supplied getter default | Validate before I/O, snapshot objects before awaiting, and use only for absence. Never serialise or persist it. |
| A surfaced read, parse, or decryption error | Reject with a fixed error. Never substitute a default or switch backends. |

Share object validation and snapshot construction. Internal snapshots used for JSON encoding have no inherited `toJSON` hooks. Returned objects and arrays retain ordinary prototypes. Preserve the existing snapshot timing and operation-count guarantees.

Generic stores permit an empty serializer output as a string value. A backend which cannot represent that output rejects it before mutation. Serializer methods remain captured once with their receiver and invoked once per present read or value write. Asynchronous methods do not add operation queues, retries, transactions, or invocation-order guarantees.

## Obsidian raw local-storage restriction

Keep the existing raw format and physical prefixes. The official host deletes a raw empty-string write, so its adapter must reject an empty physical output with `invalid-value` before calling `saveLocalStorage`. This applies both to an identity-encoded empty logical value and to any serializer returning an empty string. A previously stored value remains intact when that validation rejects the write.

A serializer which encodes an empty logical value into a non-empty string can preserve it through the host. `setObject(key, '')` also remains supported because its JSON text is non-empty. `getValue(key, '')` remains a read default and performs no write.

Explicit deletion still calls `saveLocalStorage(key, null)`. The host's own hidden-error limitation remains: the adapter cannot recover failures suppressed inside Obsidian.

The explicitly selected legacy Web Storage adapter can store empty physical strings. The compatibility factory keeps its existing one-time source-selection rule and documents the chosen backend's representability limit. It never falls back after an empty-write rejection or another operation failure.

Do not silently introduce a JSON envelope or reinterpret existing raw strings. A separately named, explicitly encoded Obsidian adapter could be considered later if transparent empty-string round trips on that host are required. It is outside this proposal.

## Compatibility and affected code

The changes are deliberate revisions of unpublished APIs:

- Replace imports from `@vrtmrz/local-storage` with the appropriate `@vrtmrz/value-store` entry. Keep secret factories and profile contracts under `@vrtmrz/secret-store`; obtain shared contracts and errors from `@vrtmrz/value-store`.
- Rename `LocalValueReader`, `LocalValueStore`, `MemoryLocalValueStore`, and their generic factories to the capability names above. Rename the Web Storage and JSON-file factories to describe their adapters.
- Replace `LocalStorageError` and `SecretStoreError` catches with `ValueStoreError`, preserving the applicable code branches.
- Replace calls which use `setValue(key, '')` to clear ordinary storage with explicit `delete(key)`. Empty writes to memory, Web Storage, and JSON files become stored data; the raw official Obsidian adapter rejects unrepresentable empty output.
- Update the two Obsidian adapters, age shared-type and error imports, OW serializer example, package manifests and lockfile, export checks, CI, release selection and dependency ordering, packed-consumer fixtures, browser tests, and isolated Obsidian scenarios. Keep the age adapter dependent on `secret-store`; add the one-way `secret-store` dependency on `value-store`.
- Update architecture, usage, verification evidence, and ADR status links after implementation. Preserve earlier decisions as historical records with explicit supersession links.

No compatibility packages or old-name aliases are proposed for these unpublished APIs. Existing raw strings, object JSON, Node version-1 documents, age ciphertext, physical names and prefixes, recipients, and identity acquisition remain unchanged. No consumer migration or registry release is included. Existing published packages keep their current versions until a separately selected release.

## Implementation and validation

1. Add behavioural tests against the accepted target contract before changing production semantics. Existing empty-write deletion fixtures become explicit-deletion fixtures, retaining their clearing assertions. Add separate empty-write preservation tests for memory, Web Storage, and JSON files, plus rejection-before-mutation tests for raw Obsidian output. Keep the direct-host empty-write deletion case as evidence of the host restriction.
2. Consolidate the common engine and types, retain secret validation before serializers and I/O, and expose deletion only through the selected capability. Retain coverage for default snapshots, stored falsy values, inherited hooks, serializer receiver capture, call counts, and sanitised failures.
3. Move package and adapter imports, update manifests and distribution wiring, and compile consumer fixtures which require the intended capabilities. Verify that installing the packed `value-store` alone adds no package dependencies, that its artefact contains no secret profile or cryptographic implementation, and that the secret package consumes only exported value APIs. Root and Web imports must remain free of Node, Obsidian, and age runtime code. A `ValueStore` or `SecretStore` alone must not type-check as a deletion capability.
4. Verify existing-format reads and reconstruction, browser persistence and encrypted restart, and official and explicit legacy Obsidian behaviour. Retain age authority, size, authentication, and uncertain-write tests without changing the file backend.
5. Run the complete workspace and packed-consumer gate, reviewed Obsidian validation, and changed Node paths on the qualified runtime versions. Reuse unaffected interoperability evidence only where the codec, ciphertext format, and dependency revision remain unchanged; do not present old passing tests as evidence for newly changed semantics.

Fresh validation on 2026-10-19 passed the complete workspace and packed-consumer gate, the Chromium persistence and encrypted-restart scenario, the reviewed Obsidian 1.13.6 twelve-scenario suite, and 22 native age/rage interoperability checks. The value, secret, and Node age packages passed 123, 114, and 58 tests respectively on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64; file tests ran on ext4. The isolated ValueStore tarball installation added no dependencies. These are package-owned checks; the affected storage packages remain unpublished and have no maintained consumer integration.

## Alternatives considered

| Alternative | Assessment |
| --- | --- |
| Rename `local-storage` only | Improves the label but retains duplicate value operations and conflicting empty-write meanings. |
| Merge the secret profile into `value-store/secrets` | Produces seven packages and currently adds no external dependencies, but ships secret functionality to every value-store consumer and ties future installation dependencies together. The separate package boundary better preserves independent installation. |
| Put age and all future native adapters in the common package | Adds unrelated installation dependencies and weakens the existing runtime boundary. |
| Keep implicit empty-string deletion everywhere | Carries one host's behaviour into ordinary value writes and preserves the incompatibility with secret values. |
| Automatically encode all Obsidian strings in a new envelope | Can preserve empty values but changes raw interoperability and requires an explicit format and migration decision. |
| Replace Octagonal Wheels storage at the same time | Expands the task into unrelated published contracts and consumer migrations. |
