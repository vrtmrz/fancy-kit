# ADR 0002: Compose value stores with injected serialisation

Status: Accepted, implemented, and locally verified.

Date: 2026-10-19

This decision supersedes the initial get/set naming and the synchronous JSON-value local-store contract. The packages remain unpublished development versions. No consumer migration or registry release is included.

## Decision

Use `LocalValueReader` / `LocalValueStore` for ordinary local values and `SecretReader` / `SecretStore` for named secrets. Keep application-specific settings and configuration names in consumers.

Both families expose asynchronous `getValue` and `getObject` methods. Stores additionally expose asynchronous `setValue` and `setObject`. Local stores retain explicit asynchronous deletion; secret deletion remains outside the current capability because the Obsidian API does not provide it.

- `getValue` returns a string, or `null` for absence.
- `setValue` accepts a string. A local empty-string write deletes before serialisation; a secret empty-string write stores an empty value.
- `getObject` parses the deserialised string as JSON. It returns `undefined` for absence and preserves a stored JSON `null`.
- `setObject` validates a JSON-shaped value and serialises it to a non-empty JSON string before the value-serialisation boundary. Objects, arrays, finite numbers, booleans, strings, and `null` are supported. Reject undefined, non-finite numbers, accessors, class instances, sparse arrays, and cycles without invoking getters or `toJSON`.

`ObjectValue` denotes the supported recursive value shape; it is not restricted to TypeScript's built-in `object` type. JSON conversion represents negative zero as zero. String keys and explicit prefixes remain literal. Secret names and raw string values retain their established portable validation.

## Serialisation boundary

Inject one instance-scoped optional `ValueSerializer` into each store or reader:

```ts
interface ValueSerializer {
  serialize(key: string, value: string): string | Promise<string>;
  deserialize(key: string, value: string): string | Promise<string>;
}
```

Capture both methods once, retain their receiver, and use identity conversion when the option is omitted. A supplied pair must contain both callable methods. The two neutral packages expose structurally compatible types without adding a runtime dependency between them.

The operation order is:

```text
setObject: validate and snapshot -> JSON string -> serialize -> backend write
getObject: backend read -> deserialize -> JSON parse and validation
setValue: validate string -> serialize -> backend write
getValue: backend read -> deserialize -> validate string
```

Validate names, keys, and caller values before invoking the serializer or backend. Local empty-string deletion and explicit deletion bypass the serializer. Backend absence bypasses the deserializer. A serializer must not turn a non-empty local value into an empty backend value: reject that output before writing. Deserialised empty strings remain values on reads.

Each successful value operation invokes one captured serializer method and one backend operation; object methods reuse the same path. Operations without a serializer invoke only the backend. Validate serializer results. Failures use the owning package's fixed errors, retain no arbitrary cause or data, and never fall back to plaintext, a different backend, or an empty value. No retries, implicit read-back, or probe writes are added.

The public API returns promises even when a memory, browser, Obsidian, or Node backend performs synchronous I/O. This permits asynchronous encryption without backend-specific subclasses. The Node local adapter still uses synchronous file operations and blocks while performing them. Callers await dependent operations; concurrent calls have no invocation-order or transaction guarantee. No background queue or persistent recovery state is introduced.

## Backends and formats

Platform adapters own raw string storage only. Web Storage writes strings directly, so existing raw strings can be read through value methods. The Obsidian adapter accepts string results from the official App methods and passes stored strings directly; non-string existing results are invalid data. The Node local document remains a strict version-1 document but contains only physical-key/string pairs. Explicit source selection and complete literal prefixes remain unchanged.

Object methods interpret only their selected string format. They do not auto-detect legacy objects, migrate values, or switch between object and value modes on a parse error. Consumers choose one representation per key. Obsidian's hidden-error limitation remains: a wrapper cannot detect failures its host suppresses.

Memory storage remains instance-owned and provides temporary storage for application or plug-in lifetimes. The generic Web Storage adapter may also receive an explicitly selected `sessionStorage`; no automatic session discovery or separate session service is introduced.

## Encryption example

Provide a consumer-owned example using the current `octagonal-wheels/encryption/hkdf` entry. The inspected workspace and public latest version are both `0.1.55`. Use `encryptWithEphemeralSalt` / `decryptWithEphemeralSalt`, whose salted format carries the PBKDF2 salt required for decryption. The example supplies an injected passphrase provider, encodes the logical key and string safely before encryption, validates the decrypted shape and key, and tests rejection of wrong keys, damaged ciphertext, and wrong passphrases.

The OW example uses authenticated AES-GCM. The separate OW OpenSSL-compatible AES-CBC implementation provides no authentication tag and is not selected as a replacement for the age backend. The [OpenSSL enc documentation](https://docs.openssl.org/master/man1/openssl-enc/) describes the lack of authenticated encryption, while the [age specification](https://age-encryption.org/v1) defines authenticated headers and payloads with recipient-based key wrapping. Format stability and native interoperability do not establish a cryptographic audit of the selected TypeScript implementation.

The neutral cores do not import OW or a cryptographic implementation. The example adds no automatic key persistence or key provisioning, and does not change the age adapter's format. Its input encoding preserves arbitrary local JavaScript strings across the UTF-8 encryption boundary. Tests verify ciphertext at the backend, one transform per operation, exact object/value round trips, and fixed errors without plaintext leakage.

## Verification

Shared contract cases, injected backend and serializer tests, real files, public type fixtures, installed-tarball checks, the real-browser scenario, and isolated Obsidian scenarios pass for the asynchronous string boundary. Filesystem failure, limit, ownership, and uncertain-write coverage is retained. The core, Node, and OW example tests also pass on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64 with ext4. The complete workspace gate and all twelve reviewed Obsidian 1.13.6 scenarios pass. These checks do not establish consumer adoption, cryptographic audit, or qualification of other operating systems.