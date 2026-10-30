---
date: 2026-10-19
value-store-version: "0.0.0"
obsidian-plugin-kit-version: "0.1.4"
status: unreleased
---

# ValueStore and storage adapters

## Publication note

The front matter records the reviewed development-version baseline from 2026-10-19. ValueStore 0.1.0 is published, and the local-storage adapter was published in Kit 0.1.5 on 2026-10-30. Registry availability is verified separately through the [release process](../releasing.md); see [npm for the Kit](https://www.npmjs.com/package/@vrtmrz/obsidian-plugin-kit) for current versions. The Commonlib and Self-hosted LiveSync integration evidence below remains evidence of an unreleased consumer integration.

## Purpose and baseline

ValueStore gives applications one asynchronous boundary for string and JSON
values while leaving storage selection, persistence, and host authority with
the application. Consumers can inject the same capability into their workflows
and test their own persistence decisions without recreating a browser or
Obsidian environment.

This records the `@vrtmrz/value-store` development version `0.0.0` and the
then-unreleased Obsidian local-storage adapter reviewed after
`@vrtmrz/obsidian-plugin-kit` `0.1.4`. The accepted rationale is in
[ADR 0003](../adr/0003-value-store-capabilities.md), which supersedes the package
split and implicit empty-string deletion rule in
[ADR 0002](../adr/0002-value-store-serialisation.md). The
[package guide](../../packages/value-store/README.md) owns usage examples and
the full public error catalogue.

The earlier `local-storage` name described a location shared by several
backends. It did not distinguish ordinary value operations from the
SecretStore profile. Keeping those responsibilities separate removes duplicate
value handling and lets a consumer install ValueStore without secret-purpose
code or cryptographic dependencies.

## Scope and ownership

| Boundary | Responsibility |
| --- | --- |
| `@vrtmrz/value-store` | Read and replacement-write capabilities, explicit deletion, JSON conversion, defaults, snapshots, serialiser invocation, fixed errors, and instance-scoped memory storage. |
| `@vrtmrz/value-store/web-storage` | Calls to explicitly injected Web Storage, using a literal prefix. |
| `@vrtmrz/value-store/node-json-file` | One bounded JSON document, authority checks, and file replacement through Node built-ins. |
| `@vrtmrz/secret-store` | A separate named-secret profile over the public value API, with portable name and well-formed Unicode validation. |
| `@vrtmrz/obsidian-plugin-kit/local-storage` | Official App local-storage calls and an explicit construction-time choice of legacy Web Storage. |
| Consumer | Backend construction, key and prefix ownership, application defaults, awaited persistence, and any format migration. |

The repository has eight independently versioned npm packages. Subpath exports
do not add packages. ValueStore has no runtime, peer, or optional package
dependencies; installing it includes its Web Storage and Node file entries,
but no secret profile, age implementation, or Obsidian package. Node imports
remain isolated to `/node-json-file`.

SecretStore depends on ValueStore. The separate Node SecretStore package adds
the age implementation and directly imports ValueStore's shared error type.
This direction preserves independent installation as the secret adapters
evolve. Existing Octagonal Wheels IndexedDB `KeyValueStore` APIs and
`PersistentMap` retain their different lifecycle and persistence contracts.

## Capabilities and lifetime

The application constructs a store at its composition root and passes the
narrowest capability needed by each workflow:

| Capability | Operations and construction |
| --- | --- |
| `ValueReader` | `getValue` and `getObject`; `createValueReader` requires only raw `get`. |
| `ValueStore` | Adds `setValue` and `setObject`; `createValueStore` requires raw `get` and `set`. |
| `ValueDeleter` | Separate `delete`; `createDeletableValueStore` also requires raw `delete` and returns `ValueStore & ValueDeleter`. |

The factories capture the required backend methods and their receivers once,
without probing or writing. A `ValueStore` does not imply deletion. Memory,
Web Storage, JSON-file, and Obsidian local-storage adapters expose it
explicitly. Each memory store owns independent state; it provides neither
persistence nor secure erasure.

An injected `ValueSerializer` supplies paired `serialize` and `deserialize`
methods, which may be synchronous or asynchronous. Both methods and their
receiver are captured at construction. Object operations pass JSON text
through this same string boundary. Without a serialiser, strings pass through
unchanged. Backend selection, retries, and migration remain outside the facade.

## Absence, defaults, and stored values

| Read result | Meaning |
| --- | --- |
| `getValue` returns `null` | The backend reported absence and no default was supplied. |
| `getObject` returns `undefined` | The backend reported absence and no default was supplied. |
| `getObject` returns `null` | The stored JSON value was `null`. |
| Either getter rejects | Validation, decoding, or an observable backend operation failed. |

An optional getter default applies only to absence. It is validated before
I/O; an object default is snapshotted before asynchronous work starts. Defaults
are neither passed to the serialiser nor persisted. They preserve stored empty
strings, JSON `null`, other falsy values, and observable failures rather than
replacing them with an application fallback.

`ObjectValue` contains JSON-compatible finite numbers, strings, booleans,
`null`, arrays, and plain records. Writes validate and snapshot this data
before encoding; reads return detached parsed values. Unsupported values and
malformed stored data reject with fixed errors. Keys and generic string values
remain exact JavaScript strings, without trimming or Unicode normalisation.
The separate secret profile imposes its stricter string rules.

Deletion is a separate operation because an empty string is valid data.
`setValue(key, '')` invokes the serialiser and writes its result;
`setObject(key, '')` stores a JSON empty string. `delete(key)` skips the
serialiser. If a backend cannot represent the resulting physical string, its
adapter rejects before mutation. A host limitation therefore does not change
the meaning of writes in every store.

## Persistence and host boundaries

Persistent adapters map a key to `prefix + key` literally. The caller supplies
any separator and owns disjoint namespaces. Prefixes prevent accidental
collisions only; they do not establish access control.

The Web Storage adapter accepts a `Storage` capability explicitly and does not
discover browser globals. It stores strings directly, preserves empty strings,
and maps deletion to `removeItem`.

The Node file adapter serves small, infrequently changed settings. Its strict
version-1 document contains unique physical-key/string pairs as
`{ version: 1, entries: [[key, value], ...] }`, with an inclusive 1 MiB UTF-8
limit. Construction validates an existing file without writing; an initially
missing file represents an empty store. Once the instance has observed a file,
its disappearance is a failure. Malformed data never resets the store to empty.

Each operation reads the current document. A mutation writes a private
temporary file in the same existing directory, synchronises and closes it,
then replaces the selected file by rename. The asynchronous API uses
synchronous Node I/O. The parent must retain its identity; the selected file
must be regular, without symbolic or extra hard links. One process owns
writes. Concurrent read/modify/write, locking, transactions, and hardware
power-loss durability are outside this adapter's contract. It stores plaintext.

The official Obsidian adapter calls `App.loadLocalStorage` and
`App.saveLocalStorage`. Obsidian owns Vault scoping; the application supplies
its plug-in prefix. Explicit deletion calls `saveLocalStorage(key, null)`.
Because the host treats an empty raw string as deletion, the adapter rejects
empty physical output with `invalid-value` before calling the host. A paired
serialiser can represent an empty logical string with non-empty physical text;
JSON empty strings already have such a representation.

The compatibility factory selects official methods or an explicitly supplied
legacy Web Storage provider once at construction. Legacy storage is selected
only when both official methods are absent. It performs no migration and never
changes sources after an operation failure. The `obsidian >=1.8.7` peer floor
is unchanged.

## Failure and compatibility rules

`ValueStoreError` provides stable codes and fixed messages, without an upstream
message, cause, path, or stored value. Serialiser and observable backend failures
are sanitised. Missing values are distinct from invalid data, denied access,
quota exhaustion, and unavailable storage. Obsidian can hide an underlying
storage failure; its adapter cannot report evidence the host API withholds.

A Node replacement failure after rename starts has an uncertain outcome: the
replacement may have taken effect. The adapter reports failure without an
automatic retry or rollback. Applications must account for this boundary when
deciding what to do after an unsuccessful persistence operation.

The package does not detect old encodings, change prefixes, or migrate an
existing document. A consumer retaining an earlier file format can inject a
backend through the public factories. This keeps application compatibility
decisions independent of the provided adapter formats.

## Consumer composition

The unreleased Commonlib and Self-hosted LiveSync integration exercises this
boundary with an immutable development tarball. Commonlib requires an injected
`ValueStore & ValueDeleter`, retains its device keys and Vault/database-suffix
scope, and awaits persistence where subsequent behaviour depends on it.

LiveSync constructs the Web Storage adapter for Obsidian and browser hosts. Its
CLI injects a backend for the existing flat JSON file rather than adopting the
Kit Node adapter's different document shape. Those consumers exercise ordinary
value storage; they do not adopt SecretStore or establish consumer evidence for
the official Obsidian raw adapter or Kit's Node file adapter.

## Validation and remaining limits

Package-owned tests cover capability boundaries, absence and falsy values,
default snapshots, serialiser invocation, literal keys, and adapter failures.
Packed-consumer checks exercise the exported types and installed runtime,
confirm that ValueStore installs without dependencies, and keep Node code out
of root and Web Storage bundles. Browser tests own persistence through restart;
the real-Obsidian scenario owns raw host behaviour, explicit legacy selection,
and rejection of physical empty writes before mutation.

The complete workspace gate and these boundaries passed on 2026-10-19.
Reviewed Obsidian evidence uses 1.13.6 on Linux arm64; the historical 1.7.7
probe does not qualify the revised contract. Node tests used 20.19.0, 22.23.3,
and 24.18.0 on Linux arm64 with ext4 file fixtures. The current test inventory,
consumer-owned checks, and exact qualification limits are recorded in
[proven-in-use evidence](../proven-in-use.md#valuestore-package-and-consumer-evidence).

The consumer integration remains unreleased and its evidence covers the tested
settings and device-value workflows, not a complete synchronisation or upgrade
matrix. Mobile display-mode checks do not qualify physical mobile devices.
ValueStore provides no encryption by default; the injected OW HKDF example
demonstrates serialiser composition, not a cryptographic audit.
