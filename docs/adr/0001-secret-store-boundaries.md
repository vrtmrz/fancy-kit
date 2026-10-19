# ADR 0001: Separate secret access from persistence and key management

Status: Accepted and implemented through Phase 3b; management utilities and additional adapters remain proposed

Date: 2026-10-18

[ADR 0003](0003-value-store-capabilities.md) supersedes the package naming, common error ownership, and value-operation implementation described here. It also replaces ADR 0002's implicit empty-string deletion with an explicit deletion capability. This record preserves the earlier decision; authority, key acquisition, and persistence boundaries remain applicable.

Implementation status: The neutral core is implemented in [`@vrtmrz/secret-store`](../../packages/secret-store), with an injected Obsidian adapter in [`@vrtmrz/obsidian-plugin-kit/secrets`](../../packages/obsidian-plugin-kit/src/secrets.ts). The [`@vrtmrz/secret-store-node/age`](../../packages/secret-store-node) adapter implements the accepted encrypted-file boundary using the codec qualified in the [feasibility study](../design/secret-store-age-feasibility.md). Native adapters, key provisioning, the CLI, and encrypted packs remain future phases. No registry release or consumer migration is included.

Related document: [Cross-platform SecretStore design](../design/secret-store.md).

The original `get`/`set` interface below records the Phase 1 decision. [ADR 0002](0002-value-store-serialisation.md) supersedes that interface with asynchronous `getValue`/`setValue`, `getObject`/`setObject`, and injected value serialisation. The storage, authority, and key-management boundaries in this record remain applicable.

## Context

Applications need to keep credentials out of portable settings while retrieving them through the same application code on different platforms. A settings field may contain a name or an application-defined reference such as `fancy-sec://connstr-foo-bar`. The referenced value can differ between environments.

Fancy Kit already separates neutral interaction contracts from browser and Obsidian implementations. Its [architecture](../architecture.md) places adapter construction at the consumer composition root and keeps application policy outside the shared packages. Secret access fits that pattern. Existing Octagonal Wheels encryption protects data; it does not select a credential store or own application key provisioning.

The available backends have materially different capabilities. Obsidian exposes synchronous get, set, and list operations, but no public delete operation. systemd credentials are provisioned outside the application. age separates recipients used for encryption from identities used for decryption. Native credential stores depend on the operating system and its session. A common interface must preserve these differences without making applications implement encryption.

## Decision and proposed extensions

### Keep the common contract small

Introduce `@vrtmrz/secret-store` with `SecretReader`, `SecretStore`, a sanitised `SecretStoreError`, name validation, and `MemorySecretStore`.

```ts
/** Reads named secrets from an explicitly selected store. */
export interface SecretReader {
    /** Returns the exact value, or null for an absent entry; rejects on failure. */
    get(name: string): Promise<string | null>;
}

/** Adds replacement writes to a secret reader. */
export interface SecretStore extends SecretReader {
    /** Creates or replaces an entry without trimming or interpreting its value. */
    set(name: string, value: string): Promise<void>;
}
```

An empty value is distinct from an absent entry. A backend failure never becomes `null`, an empty string, or a read from another store. A successful write means the backend has acknowledged the operation under its documented persistence guarantees; the interface does not invent a cross-platform durability or transaction guarantee.

The library neither parses references nor resolves settings recursively. Consumers decide which fields contain references and what to do when a referenced name is absent. A reference grants no authority.

Delete and list are separate capabilities, introduced when a backend and management workflow need them. Neither is a requirement of `SecretStore`. The first implementation contains only get and set, including in the memory implementation.

### Define a portable naming contract

Use one validated profile for Kit adapters: 1–64 ASCII characters matching `[a-z0-9]+(?:-[a-z0-9]+)*`. This is an intentional restriction accepted for the new core API. It accommodates application-owned prefixes and avoids case-folding and path separator ambiguity. Names are never normalised or decoded. Real Obsidian 1.11.4 and 1.13.6 rejected 65- and 128-character names, so qualification narrowed the initial 128-character proposal to 64 before publication. The common validation rejects longer names rather than passing a name to a backend which cannot accept it.

Values are well-formed Unicode strings, preserved exactly, including empty values and whitespace. Backends reject values they cannot represent rather than truncating or changing them. Backend-specific size limits remain explicit.

### Select adapters explicitly

Construct the adapter once and pass only the capability a workflow needs. There is no automatic backend discovery, fallback chain, module-global store, or default persistent store.

Use these boundaries, adding future packages only when their implementation phase begins:

| Location | Responsibility |
| --- | --- |
| `packages/secret-store` | Neutral contracts, validation, errors, and memory storage; no runtime dependencies or platform imports. |
| Existing `packages/obsidian-plugin-kit`, `./secrets` export | Obsidian SecretStorage adapter with an injected host capability. |
| `packages/secret-store-node`, implemented `./age` and future `./systemd` exports | Node file persistence and future service credential reading. The age codec remains internally separate from file I/O. |
| Future `packages/secret-store-keychain` | Optional native credential-store integration, isolated from ordinary Node and browser consumers. |
| Future `packages/secret-store-cli` | Explicit management operations, secret input, and output policy. |

Grouping the two file-based Node adapters avoids a package for every implementation. Keeping native keychain dependencies separate avoids imposing native binaries on an application that only reads files. A browser age persistence adapter and a public generic filesystem interface are deferred until a concrete consumer establishes their requirements.

### Separate ciphertext, identities, and provisioning

Use the standard age format for the file backend. Store one UTF-8 secret per encrypted file and inject identity acquisition separately from public recipients. The backend does not generate or persist identities automatically. Applications can obtain an identity through another `SecretReader`, a service credential, a separately controlled file, or an explicitly selected environment source. Environment selection may supply either a file path or identity text; it introduces no automatic fallback. An explicit CLI identity-generation operation is separate from backend construction and store initialisation.

File persistence must document name-to-file mapping, metadata exposure, permissions, atomic replacement, concurrency, and failure outcomes. Initial file writes use atomic replacement with explicit last-writer-wins semantics; they do not introduce a lock service, journal, or automatic recovery protocol. Root ownership and platform limitations are part of the contract, detailed in the design document.

### Support explicit migration and deployment

Propose CLI operations to generate a separately stored identity, prepare a new encrypted store for a complete target recipient set, and verify decryption without revealing values. Re-encryption reads a stable source and prepares a separate destination; it does not rewrite a running store or activate a deployment. Existing transfer and deployment tools retain transport, ownership, and activation responsibilities. This extends the proposed management phase without changing the neutral API or introducing a migration journal. See the [device and server workflows](../design/secret-store.md#device-migration-and-server-deployment) for failure boundaries and verification.

Propose a later [encrypted pack utility](../design/secret-store.md#later-utility-encrypted-packs-for-bulk-provisioning) for local preparation and bulk installation into an explicitly selected writable backend. Encrypt a versioned name/value document with standard age, keep transport identities separate, and validate the complete pack before writing. Keep this utility outside the neutral core. Existing-entry policy and partial failures require explicit contracts; the utility cannot promise transactions or rollback across all stores. Read-only systemd credentials remain a deployment provisioning concern rather than an import target.

### Make failure information accurate and safe

Expose stable categories for invalid input, unavailable storage, denied access, failed decryption, invalid stored data, and unclassified operation failures. Assign a specific category only when the backend supplies reliable evidence. In particular, an authentication failure may reflect either the wrong identity or damaged ciphertext.

Construct public errors from fixed messages and allowlisted codes. Do not attach arbitrary upstream messages, causes, payloads, keys, or paths. The library supplies no value-bearing transcript or default logger.

## Alternatives considered

| Alternative | Assessment |
| --- | --- |
| Add everything to `octagonal-wheels` | It already contains encryption and reusable utilities, but bringing credential adapters and their dependencies into its independent subtree and release lifecycle is unnecessary. A dedicated contract package follows the existing neutral interaction pattern. |
| Put the common API in `obsidian-plugin-kit` | Couples non-Obsidian consumers to the wrong ownership boundary and makes the platform adapter authoritative for neutral semantics. |
| Publish one package per backend immediately | Creates release and dependency maintenance before those backends have passed their implementation gates. |
| Publish one package containing every backend | Makes optional native dependencies and runtime boundaries harder to understand and verify. |
| Require get, set, delete, and list everywhere | Excludes natural read-only providers and encourages unsupported emulation, particularly for Obsidian deletion. |
| Interpret `fancy-sec://` inside the store | Couples storage to settings and reference syntax, reducing reuse. |
| Use an encrypted JSON aggregate | Hides names inside the ciphertext and reduces file count, but requires whole-store decryption and makes unrelated writes contend. Retain as a future alternative if scale or name confidentiality warrants it. |
| Use automatic key generation or fallback storage | Hides a change in the security and persistence model from the caller. |
| Extract a general filesystem abstraction first | Expands scope beyond secret persistence before root authority and platform semantics have been proven. |

## Consequences

Application logic can depend on a two-method interface, or just its read capability, without loading platform code. Tests can use memory storage and injected failures. Portable settings do not imply shared credentials or shared authorisation.

The cost is additional independently versioned packages and explicit workspace, packing, and release wiring. The name profile excludes some names already accepted by individual platforms; migrations must remain application-owned and deliberate. A TypeScript read capability does not revoke the underlying process's write permissions.

The library cannot protect plaintext already available to a compromised process, promise JavaScript memory erasure, guarantee filesystem behaviour on every mount, or infer that a platform store offers OS-backed encryption. age does not by itself authenticate the writer, bind ciphertext to a secret name, or prevent rollback. These limits must remain visible in backend documentation.

## Review and acceptance

The core package boundary, portable name and value contracts, error categories, and [memory, Obsidian, and age adapters](../design/secret-store.md#implemented-adapters-and-ownership) are accepted and implemented. The Obsidian adapter and Node age adapter have separate runtime evidence. The age implementation is qualified on Linux arm64 ext4, with POSIX checks and explicit limits; it does not claim Windows ACL, macOS, network-filesystem, or power-loss qualification. The CLI mutation policy and native dependency choice retain their later evidence gates.

The design document records upstream evidence and tests required before each backend can claim support. Existing encryption APIs, package versions, settings formats, and consumer integrations remain unchanged by the additive core implementation.
