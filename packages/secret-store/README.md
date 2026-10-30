# SecretStore

Platform-neutral named-secret contracts and an explicitly chosen in-memory store. It depends only on the dependency-free [`@vrtmrz/value-store`](../value-store/README.md) package for common value operations, JSON conversion, and fixed errors. Neither package imports Node.js, DOM, or Obsidian APIs through its root entry.

This package implements the common contracts and `MemorySecretStore`. An injected Obsidian adapter is implemented separately in `@vrtmrz/obsidian-plugin-kit/secrets`. The separate [`@vrtmrz/secret-store-node/age`](../secret-store-node) adapter provides encrypted file persistence. Native credential stores, a management CLI, and encrypted transfer packs are future work. Memory storage is ephemeral and provides no encryption or secure-erasure guarantee.

## Installation

```bash
npm install --save-exact @vrtmrz/secret-store@0.1.0
```

## Usage

```ts
import { MemorySecretStore } from "@vrtmrz/secret-store";
import type { SecretReader } from "@vrtmrz/secret-store";

const secrets = new MemorySecretStore();
await secrets.setValue("example-api-token", "example-placeholder");
await secrets.setObject("example-api-settings", {
  enabled: false,
  retries: 0,
  label: "",
});

async function readToken(reader: SecretReader): Promise<string | null> {
  return reader.getValue("example-api-token");
}

const token = await readToken(secrets);
if (token === null) {
  // The application decides how to handle an absent credential.
}
const settings = await secrets.getObject("example-api-settings");
```

Create a store at the application composition root and pass the narrow capability required by each workflow. `SecretReader` provides asynchronous `getValue` and `getObject`; `SecretStore` adds `setValue` and `setObject`. Neither interface requires delete or list. Restricting a TypeScript type does not change the process's underlying permissions.

## Names and values

Names contain 1–64 ASCII characters matching `[a-z0-9]+(?:-[a-z0-9]+)*`, such as `example-api-token`. Names are exact, without case conversion, trimming, percent decoding, or namespace rewriting. `validateSecretName(name)` throws `ValueStoreError` with code `invalid-name` when the complete name is invalid; store methods return rejected promises for the same failure.

`setValue` accepts well-formed Unicode strings. Empty strings, whitespace, line endings, NUL characters, and a leading BOM are preserved exactly; empty strings are data. Without a default, `getValue` returns `null` for absence, while `getObject` returns `undefined` for absence and preserves a stored JSON `null` as `null`. Unpaired UTF-16 surrogates reject with `invalid-value`. `setObject` accepts finite JSON-shaped data: `null`, booleans, numbers, strings, arrays, and plain records. It snapshots and JSON-encodes the value, so negative zero becomes zero. Memory storage has no backend-specific value limit; available memory and host string limits still apply.

Both getters accept an optional second argument used only for absence:

```ts
const label = await secrets.getValue("missing-label", "");
const options = await secrets.getObject("missing-options", { enabled: false });
```

Defaults follow the corresponding string or JSON-value rules and are validated before I/O. Object defaults are detached snapshots taken before asynchronous work starts. Defaults are never passed to the serializer or stored. They do not replace stored empty strings, JSON `null`, other falsy data, or errors. Omit the argument or pass `undefined` to retain the absence sentinel. A supplied default removes absence from the return type without promising the shape of stored JSON.

`setValue` and `setObject` create or replace an entry. An awaited memory write is visible to subsequent reads unless another write intervenes. Invalid input leaves the memory store unchanged. Every memory instance starts empty and owns separate state; values are not logged or automatically persisted.

The optional `ValueSerializer` pair transforms strings at the boundary between a secret capability and its backend. Methods may be synchronous or asynchronous, receive the logical name, and are captured with their instance receiver at construction. Object methods pass JSON text through that same pair. Without a serializer, strings pass through unchanged. The pair is instance-scoped; it does not replace encryption or the backend's own protections. The [OW HKDF example](../../examples/value-stores/ow-hkdf-serializer.ts) demonstrates consumer-owned encryption and an explicit passphrase provider without adding an Octagonal Wheels dependency to this package.

Names are references, not authorisation tokens. Applications may store references such as `fancy-sec://example-api-token` in their settings, but must parse those references themselves before passing the name to the store. The URI itself is not a valid name. The library does not resolve settings, select a backend, or fall back to another store.

## Failures

Store failures reject with `ValueStoreError` from `@vrtmrz/value-store`. Branch on its readonly `code`, not message text:

| Code | Meaning |
| --- | --- |
| `invalid-name` | The supplied name is outside the portable profile. |
| `invalid-value` | The value is invalid or exceeds a documented backend limit. |
| `unavailable` | The required store, API, service, root, or identity source is unavailable. |
| `access-denied` | A reliable platform status establishes denied access. |
| `decryption-failed` | Decryption or authentication failed; this may mean a wrong identity or damaged ciphertext. |
| `invalid-data` | A stored-data format or encoding violation is positively identified. |
| `quota-exceeded` | A backend reports that its storage quota was exceeded. |
| `operation-failed` | No more specific category is established, including an uncertain write outcome. |

The constructor accepts only a recognised code and uses a fixed message. Unknown codes from untyped callers become `operation-failed` without echoing the input. Raw causes, paths, names, and secret values are not accepted as error constructor arguments. Adapter authors must catch external failures and create an appropriate sanitised error; the type alone does not sanitise an upstream exception.

Backend errors must never become `null` or an empty string. Persistent adapters must document their own limits and acknowledgement semantics: a rejected write may already have taken effect, and the common contract promises no rollback, transaction, conditional write, or power-loss durability. Do not automatically retry a mutation or switch stores after a failure.

## Local development builds

From the Fancy Kit workspace, build and pack a local tarball:

```bash
npm run build --workspace @vrtmrz/value-store
npm run build --workspace @vrtmrz/secret-store
npm pack --workspace @vrtmrz/value-store
npm pack --workspace @vrtmrz/secret-store
```

When testing source changes across both packages, install their local tarballs together: `npm install <value-store-tarball> <secret-store-tarball>`. This keeps the consumer on the intended core implementations. The package provides an ESM root export and TypeScript declarations, targeting ES2022. No browser global or platform module is needed to import it. See the [release process](../../docs/releasing.md) for registry publication and exact-artefact validation.
